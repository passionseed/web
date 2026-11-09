#!/usr/bin/env bash
# Builds and runs the committed bot as a Docker container on a host over SSH.
#
#   bot/deploy.sh <ssh-host>
#
# Ships only what the bot imports (bot/, two lib files, tsconfig.json) plus a
# package.json pinned to the versions installed here, builds bot/Dockerfile on
# the host and replaces the running container, then installs bot/watchdog.py
# in the host's crontab. Secrets stay on the host in
# ~/passionseed/discord-bot/bot.env and alert-webhook (see bot/README.md,
# "Deploying"); this script never reads or sends them.
set -euo pipefail

HOST="${1:?usage: bot/deploy.sh <ssh-host>}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

FILES=(bot lib/content/shift-cohort.ts lib/shift/voiceWindow.ts tsconfig.json)
if [ -n "$(git status --porcelain -- "${FILES[@]}")" ]; then
  echo "Uncommitted changes in the bot's files. Commit first: the deploy ships HEAD." >&2
  exit 1
fi
REV="$(git rev-parse --short HEAD)"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD "${FILES[@]}" | tar -x -C "$STAGE"
cp "$STAGE/bot/Dockerfile" "$STAGE/Dockerfile"
echo "$REV" > "$STAGE/REVISION"
node -e '
  const v = (p) => require(`./node_modules/${p}/package.json`).version;
  const deps = Object.fromEntries(["discord.js", "@supabase/supabase-js", "pg", "tsx"].map((p) => [p, v(p)]));
  process.stdout.write(JSON.stringify({ name: "passionseed-discord-bot", private: true, dependencies: deps }, null, 2));
' > "$STAGE/package.json"

echo "Deploying $REV to $HOST"
ARCHIVE="$(ssh "$HOST" mktemp)"
tar -C "$STAGE" -cz . | ssh "$HOST" "cat > '$ARCHIVE'"

ssh "$HOST" "bash -s -- '$ARCHIVE' '$REV'" <<'REMOTE'
set -euo pipefail
ARCHIVE="$1"
REV="$2"
APP="$HOME/passionseed/discord-bot"
ENV_FILE="$APP/bot.env"
NAME=passionseed-discord-bot
CONTEXT="$(mktemp -d)"
trap 'rm -rf "$ARCHIVE" "$CONTEXT"' EXIT

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it first (bot/README.md, Deploying)." >&2
  exit 1
fi

# macOS tar adds extended attributes GNU tar does not know; they are not needed.
tar -xz --warning=no-unknown-keyword -C "$CONTEXT" -f "$ARCHIVE"
docker build --quiet -t "$NAME:$REV" -t "$NAME:latest" "$CONTEXT" >/dev/null

# Stop first, with time to close open voice rows, so two bots never overlap.
if docker container inspect "$NAME" >/dev/null 2>&1; then
  docker stop -t 30 "$NAME" >/dev/null
  docker rm "$NAME" >/dev/null
fi
docker run -d --name "$NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$NAME:$REV" >/dev/null

# The watchdog alerts staff when the container stops or turns unhealthy.
install -m 755 "$CONTEXT/bot/watchdog.py" "$APP/watchdog.py"
CRON_LINE="*/5 * * * * python3 $APP/watchdog.py >> $APP/watchdog.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "$APP/watchdog.py"; then
  { crontab -l 2>/dev/null; echo "$CRON_LINE"; } | crontab -
fi
if [ ! -f "$APP/alert-webhook" ]; then
  echo "Warning: no $APP/alert-webhook, so the watchdog cannot alert anyone." >&2
fi

# Keep the running image and the one before it, for a quick rollback.
docker images "$NAME" --format '{{.Tag}} {{.CreatedAt}}' \
  | grep -v -E '^(latest|'"$REV"') ' | sort -k2 -r | tail -n +2 | cut -d' ' -f1 \
  | xargs -r -I{} docker rmi "$NAME:{}" >/dev/null 2>&1 || true

echo "Running $NAME:$REV. Logs: docker logs -f $NAME"
REMOTE
