#!/usr/bin/env bash
# Installs the integration watcher on a host over SSH and runs it once.
#
#   ops/integration-watch/deploy.sh <ssh-host>
#
# Copies watch.py to ~/passionseed/ops/ and adds a 30-minute cron entry. The
# secrets (ops-secret, alert-webhook) must already be on the host; this script
# never reads or sends them.
set -euo pipefail

HOST="${1:?usage: ops/integration-watch/deploy.sh <ssh-host>}"
DIR="$(cd "$(dirname "$0")" && pwd)"

ssh "$HOST" 'mkdir -p ~/passionseed/ops && cat > ~/passionseed/ops/watch.py && chmod 755 ~/passionseed/ops/watch.py' < "$DIR/watch.py"

ssh "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
APP="$HOME/passionseed/ops"
for file in ops-secret alert-webhook; do
  if [ ! -f "$APP/$file" ]; then
    echo "Missing $APP/$file. See ops/integration-watch/README.md." >&2
    exit 1
  fi
done
CRON_LINE="*/30 * * * * python3 $APP/watch.py >> $APP/watch.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "$APP/watch.py"; then
  { crontab -l 2>/dev/null; echo "$CRON_LINE"; } | crontab -
fi
python3 "$APP/watch.py"
echo "Installed. Runs every 30 minutes; log: $APP/watch.log"
REMOTE
