#!/usr/bin/env python3
"""Alerts staff when the Discord bot container stops recording.

Runs on the bot's host from cron every 5 minutes (bot/deploy.sh installs it).
The container is healthy while its heartbeats reach the database (the Docker
HEALTHCHECK in bot/Dockerfile). After 10 minutes of not running or unhealthy,
this posts once to a staff channel through a post-only Discord webhook, and
once more when the bot is back. The webhook URL lives in a file on the host,
never in the repo: ~/passionseed/discord-bot/alert-webhook.
"""

import json
import pathlib
import socket
import subprocess
import time
import urllib.request

APP = pathlib.Path.home() / "passionseed" / "discord-bot"
WEBHOOK = APP / "alert-webhook"
STATE = APP / "watchdog.state"
NAME = "passionseed-discord-bot"
GRACE_S = 10 * 60


def container_state() -> str:
    """'ok', or a short reason such as 'exited' or 'unhealthy'."""
    result = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}", NAME],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return "missing"
    status, health = result.stdout.strip().split("|", 1)
    if status != "running":
        return status
    # "starting" is the first two minutes after a deploy or restart.
    return "ok" if health in ("healthy", "starting", "") else health


def post(text: str) -> None:
    request = urllib.request.Request(
        WEBHOOK.read_text().strip(),
        method="POST",
        data=json.dumps({"content": text, "allowed_mentions": {"parse": []}}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "PassionSeedBotWatchdog/1"},
    )
    urllib.request.urlopen(request, timeout=20)


def main() -> None:
    state = json.loads(STATE.read_text()) if STATE.exists() else {"bad_since": None, "alerted": False}
    now = time.time()
    current = container_state()

    if current == "ok":
        if state["alerted"]:
            post("✅ บอท SHIFT voice กลับมาบันทึกแล้ว (the SHIFT voice bot is recording again).")
        state = {"bad_since": None, "alerted": False}
    else:
        state["bad_since"] = state["bad_since"] or now
        down_min = int((now - state["bad_since"]) / 60)
        if not state["alerted"] and now - state["bad_since"] >= GRACE_S:
            post(
                f"⚠️ บอท SHIFT voice หยุดบันทึก ({current}) มา {down_min} นาทีแล้ว: ช่วงนี้ไม่ได้บันทึกการเข้าห้องเสียงของ SHIFT\n"
                f"The SHIFT voice bot has not been recording for {down_min} min ({current}). "
                f"Check on {socket.gethostname()}: `docker logs --tail 50 {NAME}`"
            )
            state["alerted"] = True
        print(f"{time.strftime('%Y-%m-%d %H:%M')} {current}, {down_min} min", flush=True)

    STATE.write_text(json.dumps(state))


if __name__ == "__main__":
    main()
