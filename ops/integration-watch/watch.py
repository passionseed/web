#!/usr/bin/env python3
"""Keeps the Instagram and LINE integrations from failing silently.

Runs on the team server from cron every 30 minutes (deploy.sh installs it):

1. Reads /api/ops/integration-health: Instagram token valid, Instagram webhook
   events still arriving, LINE's end-to-end webhook test passing.
2. Runs /api/cron/meta-backfill, which catches up Instagram DMs and comments the
   webhook missed. Vercel does not schedule it; this does.

A check that fails twice in a row (an hour) posts once to a staff channel
through a post-only Discord webhook; the backfill gets four runs (two hours),
since Meta rate limits come and go. Each posts once more when it recovers.

Secrets live in files on the host, never in the repo: ~/passionseed/ops/
ops-secret (OPS_CRON_SECRET, which can call only these two routes) and
alert-webhook.
"""

import json
import os
import pathlib
import socket
import time
import urllib.error
import urllib.request

APP = pathlib.Path.home() / "passionseed" / "ops"
SECRET = APP / "ops-secret"
WEBHOOK = APP / "alert-webhook"
STATE = APP / "watch.state"
BASE = os.environ.get("OPS_BASE_URL", "https://www.passionseed.org")

CHECK_ALERT_AFTER = 2
BACKFILL_ALERT_AFTER = 4

# Thai first for the team, English after: (down, recovered) for each check.
LABELS = {
    "instagram_token": (
        ("Instagram token ใช้ไม่ได้: ตอบ DM และดึงโปรไฟล์ไม่ได้", "The Instagram token is not working"),
        ("Instagram token ใช้ได้แล้ว", "The Instagram token works again"),
    ),
    "instagram_webhook": (
        ("ไม่มี webhook จาก Instagram เข้ามา", "No Instagram webhook events are arriving"),
        ("webhook จาก Instagram เข้ามาตามปกติแล้ว", "Instagram webhook events are arriving again"),
    ),
    "line_webhook": (
        ("webhook ของ LINE OA ไม่ทำงาน: ข้อความใหม่ไม่เข้า /admin/line", "The LINE OA webhook is failing"),
        ("webhook ของ LINE OA กลับมาทำงานแล้ว", "The LINE OA webhook works again"),
    ),
    "health_endpoint": (
        ("เช็กสถานะ Instagram และ LINE ไม่ได้", "The integration health check itself is failing"),
        ("เช็กสถานะ Instagram และ LINE ได้แล้ว", "The integration health check works again"),
    ),
    "meta_backfill": (
        ("ดึงข้อความ Instagram ย้อนหลังไม่สำเร็จ", "The Instagram backfill keeps failing"),
        ("ดึงข้อความ Instagram ย้อนหลังได้แล้ว", "The Instagram backfill works again"),
    ),
}


def get(path: str, timeout: int):
    """(HTTP status or None, parsed JSON or None)."""
    request = urllib.request.Request(
        BASE + path,
        headers={"Authorization": "Bearer " + SECRET.read_text().strip(), "User-Agent": "PassionSeedOpsWatch/1"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, json.loads(response.read() or b"null")
    except urllib.error.HTTPError as error:
        return error.code, None
    except Exception:  # timeout, DNS, connection refused
        return None, None


def post(text: str) -> None:
    request = urllib.request.Request(
        WEBHOOK.read_text().strip(),
        method="POST",
        data=json.dumps({"content": text, "allowed_mentions": {"parse": []}}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "PassionSeedOpsWatch/1"},
    )
    urllib.request.urlopen(request, timeout=20)


def track(state: dict, name: str, ok: bool, detail: str, alert_after: int) -> None:
    (th, en), (th_up, en_up) = LABELS.get(name, ((name, name), (name, name)))
    entry = state.setdefault(name, {"fails": 0, "alerted": False})
    if ok:
        if entry["alerted"]:
            post(f"✅ {th_up}\n{en_up}.")
        state[name] = {"fails": 0, "alerted": False}
        return
    entry["fails"] += 1
    if not entry["alerted"] and entry["fails"] >= alert_after:
        post(
            f"⚠️ {th} ({detail})\n{en}: {detail}.\n"
            f"Log: ~/passionseed/ops/watch.log on {socket.gethostname()}"
        )
        entry["alerted"] = True


def main() -> None:
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    summary = []

    status, health = get("/api/ops/integration-health", 25)
    if status == 200 and isinstance(health, dict):
        track(state, "health_endpoint", True, "", CHECK_ALERT_AFTER)
        for check in health.get("checks", []):
            track(state, check["name"], bool(check["ok"]), check["detail"], CHECK_ALERT_AFTER)
            summary.append(f"{check['name']}={'ok' if check['ok'] else 'FAIL'}")
    else:
        track(state, "health_endpoint", False, f"HTTP {status or 'no response'}", CHECK_ALERT_AFTER)
        summary.append(f"health=HTTP {status}")

    status, result = get("/api/cron/meta-backfill", 75)
    batches = result.values() if isinstance(result, dict) else []
    backfill_ok = status == 200 and all(b.get("stoppedReason") != "error" for b in batches)
    reasons = ", ".join(f"{k} {v.get('stoppedReason')}" for k, v in (result or {}).items()) or f"HTTP {status or 'no response'}"
    track(state, "meta_backfill", backfill_ok, reasons, BACKFILL_ALERT_AFTER)
    processed = sum(int(b.get("processed", 0)) for b in batches)
    summary.append(f"backfill={'ok' if backfill_ok else 'FAIL'} processed={processed} ({reasons})")

    STATE.write_text(json.dumps(state))
    print(time.strftime("%Y-%m-%d %H:%M"), " ".join(summary), flush=True)


if __name__ == "__main__":
    main()
