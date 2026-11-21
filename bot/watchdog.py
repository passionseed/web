#!/usr/bin/env python3
"""Alerts staff when a Discord bot container stops working.

Runs on the bot's host from cron every 5 minutes (bot/deploy.sh installs it,
one cron line per container folder, with --name and --app). The container is
healthy while its heartbeats reach the database (the Docker HEALTHCHECK in
bot/Dockerfile). After 10 minutes of not running or unhealthy, this posts once
to a staff channel through a post-only Discord webhook, and once more when the
container is back. The webhook URL lives in a file on the host, never in the
repo: <app>/alert-webhook, by default ~/passionseed/discord-bot/alert-webhook.
The state file lives in the same folder, so each container keeps its own.
"""

import argparse
import json
import pathlib
import socket
import subprocess
import time
import urllib.request

# Today's container and folder; bot/deploy.sh passes both for every container.
DEFAULT_APP = pathlib.Path.home() / "passionseed" / "discord-bot"
DEFAULT_NAME = "passionseed-discord-bot"
GRACE_S = 10 * 60


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Alert staff when a bot container is down for 10 minutes.")
    parser.add_argument("--name", default=DEFAULT_NAME, help="Docker container to watch (default: %(default)s)")
    parser.add_argument(
        "--app",
        type=pathlib.Path,
        default=DEFAULT_APP,
        help="the container's folder on this host; holds watchdog.state (default: %(default)s)",
    )
    parser.add_argument(
        "--webhook",
        type=pathlib.Path,
        default=None,
        help="file holding the alert webhook URL (default: <app>/alert-webhook, so %s)" % (DEFAULT_APP / "alert-webhook"),
    )
    args = parser.parse_args(argv)
    if args.webhook is None:
        args.webhook = args.app / "alert-webhook"
    return args


def container_state(name: str) -> str:
    """'ok', or a short reason such as 'exited' or 'unhealthy'."""
    result = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}", name],
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


def post(webhook: pathlib.Path, text: str) -> None:
    request = urllib.request.Request(
        webhook.read_text().strip(),
        method="POST",
        data=json.dumps({"content": text, "allowed_mentions": {"parse": []}}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "PassionSeedBotWatchdog/1"},
    )
    urllib.request.urlopen(request, timeout=20)


def main(argv=None) -> None:
    args = parse_args(argv)
    name = args.name
    state_file = args.app / "watchdog.state"
    state = json.loads(state_file.read_text()) if state_file.exists() else {"bad_since": None, "alerted": False}
    now = time.time()
    current = container_state(name)

    if current == "ok":
        if state["alerted"]:
            # [TH-REVIEW] functional placeholder: names the container.
            post(args.webhook, f"✅ บอท {name} กลับมาทำงานแล้ว (the bot container {name} is healthy again).")
        state = {"bad_since": None, "alerted": False}
    else:
        state["bad_since"] = state["bad_since"] or now
        down_min = int((now - state["bad_since"]) / 60)
        if not state["alerted"] and now - state["bad_since"] >= GRACE_S:
            post(
                args.webhook,
                # [TH-REVIEW] functional placeholder: names the container.
                f"⚠️ บอท {name} หยุดทำงาน ({current}) มา {down_min} นาทีแล้ว\n"
                f"The bot container {name} has not been working for {down_min} min ({current}). "
                f"Check on {socket.gethostname()}: `docker logs --tail 50 {name}`",
            )
            state["alerted"] = True
        print(f"{time.strftime('%Y-%m-%d %H:%M')} {name} {current}, {down_min} min", flush=True)

    state_file.write_text(json.dumps(state))


if __name__ == "__main__":
    main()
