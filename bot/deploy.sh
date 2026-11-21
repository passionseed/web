#!/usr/bin/env bash
# Builds the committed bot as a Docker image on a host over SSH, checks it,
# swaps the container and rolls back by itself if the new one is not healthy.
#
#   bot/deploy.sh <ssh-host>              # deploy HEAD
#   bot/deploy.sh <ssh-host> --rollback   # run the previous image again
#   bot/deploy.sh --print-plan            # print the container, folder, env file
#                                         # and cron line; no SSH, no host needed
#
# Which container: one host can run several bot containers, each with its own
# folder, bot.env and watchdog. Three local variables pick one; unset, they are
# today's container exactly:
#   BOT_NAME      container and image name   (default passionseed-discord-bot)
#   BOT_APP_DIR   folder on the host, relative to the host's home unless it
#                 starts with /   (default passionseed/<BOT_NAME without its
#                 "passionseed-" prefix>, so passionseed/discord-bot)
#   BOT_ENV_FILE  env file, relative to BOT_APP_DIR unless it starts with /
#                 (default bot.env)
# e.g. BOT_NAME=passionseed-discord-bot-elemental bot/deploy.sh --print-plan
# Any target other than the default (another name, folder or env file) asks
# you to type the container name again here, before any SSH (deploy and
# --rollback alike).
#
# A deploy, in order; each step stops it on failure:
#   1. Stage only what the bot imports (bot/, two lib files, the living-island
#      drawing code in lib/shift-island/live, lib/elemental, tsconfig.json)
#      plus a package.json pinned to the versions installed here (DEPS).
#   2. Build the image on the host, tagged with the revision only.
#   3. Smoke check: run the new image once with --network none and bot.env
#      (bot/src/smoke.ts: loads every module, validates the environment, draws
#      a tiny island). On failure the new image is removed and the old
#      container keeps running untouched.
#   4. Stop the old container (time to close open voice rows, so two bots
#      never overlap), start the new one and wait up to 4 minutes for Docker
#      to report it healthy. If it is not, stop it and start the previous
#      image again.
#   5. Healthy: tag it latest, tag the image it replaced previous (what
#      --rollback runs), install bot/watchdog.py in the host's crontab (one
#      line per container folder, with --name and --app) and remove older
#      images.
#
# Secrets stay on the host in the container's folder (by default
# ~/passionseed/discord-bot/bot.env and alert-webhook; bot/README.md,
# "Deploying"); this script never reads or sends them. Only the container and
# the smoke check see bot.env.
set -euo pipefail

usage() {
  echo "usage: bot/deploy.sh <ssh-host> [--rollback] | bot/deploy.sh --print-plan" >&2
  exit 2
}
# --print-plan is read before the host, so it works with no host at all.
HOST=""
MODE=deploy
for arg in "$@"; do
  case "$arg" in
    --print-plan) MODE=plan ;;
    --rollback) [ "$MODE" = plan ] || MODE=rollback ;;
    -*) usage ;;
    *)
      [ -z "$HOST" ] || usage
      HOST="$arg"
      ;;
  esac
done
[ "$MODE" = plan ] || [ -n "$HOST" ] || usage

# Which container. Defaults are today's container, byte for byte.
DEFAULT_NAME=passionseed-discord-bot
NAME="${BOT_NAME:-$DEFAULT_NAME}"
APP_DIR="${BOT_APP_DIR:-passionseed/${NAME#passionseed-}}"
ENV_REL="${BOT_ENV_FILE:-bot.env}"
# NAME is both the container name and the image repository, so it follows
# Docker's stricter image rule (lowercase, separators between letters/digits).
# Paths use plain characters with no . or .. parts, so the values are safe in
# the remote script, the cron line and docker commands alike, and one folder
# has one spelling (the shared-folder check and the cron dedupe compare text).
if ! [[ "$NAME" =~ ^[a-z0-9]+((\.|_|__|-+)[a-z0-9]+)*$ ]]; then
  echo "BOT_NAME '$NAME' is not a valid image and container name (lowercase letters, digits, single . _ or - between them)." >&2
  exit 2
fi
for path in "$APP_DIR" "$ENV_REL"; do
  if ! [[ "$path" =~ ^/?[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)*$ ]] || [[ "/$path/" == */../* ]] || [[ "/$path/" == */./* ]]; then
    echo "'$path' is not a plain path (letters, digits, _ . - and /, no . or .. parts)." >&2
    exit 2
  fi
done

# Two containers must never share a folder: its watchdog state, webhook and
# cron line belong to one container.
if [ "$NAME" != "$DEFAULT_NAME" ] && [ "${APP_DIR%/}" = "passionseed/discord-bot" ]; then
  echo "passionseed/discord-bot is $DEFAULT_NAME's folder. Give $NAME its own BOT_APP_DIR." >&2
  exit 2
fi

# Shell lines that set APP, ENV_FILE and NAME on the host. A relative folder
# stays relative to the host's $HOME, which only the host knows.
case "$APP_DIR" in
  /*) APP_LINE="APP=$(printf %q "$APP_DIR")" ; APP_SHOWN="$APP_DIR" ;;
  *) APP_LINE="APP=\"\$HOME\"/$(printf %q "$APP_DIR")" ; APP_SHOWN="~/$APP_DIR" ;;
esac
case "$ENV_REL" in
  /*) ENV_LINE="ENV_FILE=$(printf %q "$ENV_REL")" ; ENV_SHOWN="$ENV_REL" ;;
  *) ENV_LINE="ENV_FILE=\"\$APP\"/$(printf %q "$ENV_REL")" ; ENV_SHOWN="$APP_SHOWN/$ENV_REL" ;;
esac
NAME_LINE="NAME=$(printf %q "$NAME")"
# How to run this script again for the same container (the rollback hint):
# empty for today's container in its own folder.
RERUN=""
[ "$NAME" = "$DEFAULT_NAME" ] || RERUN+="BOT_NAME=$(printf %q "$NAME") "
[ "$APP_DIR" = "passionseed/${NAME#passionseed-}" ] || RERUN+="BOT_APP_DIR=$(printf %q "$APP_DIR") "
[ "$ENV_REL" = bot.env ] || RERUN+="BOT_ENV_FILE=$(printf %q "$ENV_REL") "
REMOTE_VARS="$(printf '%s\n' "$APP_LINE" "$ENV_LINE" "$NAME_LINE" "RERUN=$(printf %q "$RERUN")")"

# The watchdog's cron line on the host. One line per container folder: the
# deploy adds it when no line names $APP/watchdog.py yet.
cron_line() {
  local app="$1"
  echo "*/5 * * * * python3 $app/watchdog.py --name $NAME --app $app >> $app/watchdog.log 2>&1"
}

if [ "$MODE" = plan ]; then
  echo "container: $NAME"
  echo "app dir:   $APP_SHOWN"
  echo "env file:  $ENV_SHOWN"
  echo "webhook:   $APP_SHOWN/alert-webhook"
  echo "cron line: $(cron_line "$APP_SHOWN")"
  echo "(~ is the host's home. Nothing was sent: this plan makes no SSH call.)"
  exit 0
fi

# The remote runs over ssh with no terminal, so a non-default container (or
# today's container in another folder) is confirmed here, before any SSH call.
if [ -n "$RERUN" ]; then
  echo "This is not the default target ($DEFAULT_NAME in ~/passionseed/discord-bot)." >&2
  echo "It targets container $NAME, folder $APP_SHOWN, env file $ENV_SHOWN on $HOST ($MODE)." >&2
  printf 'Type the container name to continue: ' >&2
  CONFIRM=""
  read -r CONFIRM || true
  if [ "$CONFIRM" != "$NAME" ]; then
    echo "Not confirmed; nothing was sent to $HOST." >&2
    exit 1
  fi
fi

# Everything the remote steps share. Sent as the head of every remote script,
# after REMOTE_VARS (APP, ENV_FILE, NAME and RERUN, set above).
read -r -d '' REMOTE_COMMON_BODY <<'COMMON' || true
set -euo pipefail
REVISION_LABEL=org.opencontainers.image.revision

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it first (bot/README.md, Deploying)." >&2
  exit 1
fi

revision_of() {
  local rev
  rev="$(docker image inspect -f "{{index .Config.Labels \"$REVISION_LABEL\"}}" "$1" 2>/dev/null || true)"
  case "$rev" in "" | "<no value>") echo "an unlabelled image" ;; *) echo "$rev" ;; esac
}

start_container() {
  docker run -d --name "$NAME" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    --log-opt max-size=10m --log-opt max-file=3 \
    "$1" >/dev/null
}

stop_container() {
  if docker container inspect "$NAME" >/dev/null 2>&1; then
    docker stop -t 30 "$NAME" >/dev/null
    docker rm "$NAME" >/dev/null
  fi
}

# wait_healthy <file|none|any> <seconds>: 0 once the container is healthy
# (file), steady for a minute with no health file to watch (none), or either
# (any, for a rollback target that may predate the health file). 1 as soon as
# it stops, restarts or turns unhealthy, or when time runs out. WAIT_NOTE says why.
wait_healthy() {
  local mode="$1" limit="$2" waited=0 status restarts health
  WAIT_NOTE=""
  while :; do
    read -r status restarts health < <(docker inspect \
      -f '{{.State.Status}} {{.RestartCount}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
      "$NAME" 2>/dev/null || echo "missing 0 none")
    if [ "$status" != running ] || [ "$restarts" != 0 ]; then
      WAIT_NOTE="the container is $status after $restarts restart(s)"
      return 1
    fi
    if [ "$health" = healthy ]; then return 0; fi
    if [ "$health" = unhealthy ]; then
      WAIT_NOTE="Docker reports it unhealthy"
      return 1
    fi
    if [ "$mode" != file ] && [ "$waited" -ge 60 ]; then return 0; fi
    if [ "$waited" -ge "$limit" ]; then
      WAIT_NOTE="not healthy after ${limit}s (no heartbeat reached the database)"
      return 1
    fi
    sleep 5
    waited=$((waited + 5))
  done
}

show_logs() {
  echo "Last log lines of the container:" >&2
  docker logs --tail 30 "$NAME" 2>&1 | sed 's/^/  /' >&2 || true
}
COMMON
REMOTE_COMMON="$(printf '%s\n%s' "$REMOTE_VARS" "$REMOTE_COMMON_BODY")"

if [ "$MODE" = rollback ]; then
  read -r -d '' REMOTE_ROLLBACK <<'ROLLBACK' || true
if ! docker image inspect "$NAME:previous" >/dev/null 2>&1; then
  echo "No $NAME:previous image on this host: nothing to roll back to." >&2
  exit 1
fi
TARGET="$(revision_of "$NAME:previous")"
CURRENT_ID="$(docker container inspect -f '{{.Image}}' "$NAME" 2>/dev/null || true)"
stop_container
start_container "$NAME:previous"
# Swap the tags, so a second --rollback returns to the image just replaced.
docker tag "$NAME:previous" "$NAME:latest"
if [ -n "$CURRENT_ID" ]; then docker tag "$CURRENT_ID" "$NAME:previous"; fi
if wait_healthy any 120; then
  echo "Rolled back: running $TARGET. Logs: docker logs -f $NAME"
else
  echo "Rolled back to $TARGET, but $WAIT_NOTE." >&2
  show_logs
  exit 1
fi
ROLLBACK
  echo "Rolling back on $HOST"
  printf '%s\n%s\n' "$REMOTE_COMMON" "$REMOTE_ROLLBACK" | ssh "$HOST" "bash -s"
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

# The image's npm dependencies: the one list, pinned to the versions installed here.
DEPS=(discord.js @discordjs/voice @supabase/supabase-js pg tsx gifenc)
# lib/shift-island/live: the web's living-island drawing code, which draws the bot's moving island GIF.
# components/shift/island/story/scenes.ts: the story's scenes, shared with the web story (bot/src/quests/story.ts).
# lib/elemental: the Elemental hackathon module's pure core (bot/src/elemental).
FILES=(bot lib/content/shift-cohort.ts lib/content/shift-island-economy.ts lib/supabase/shift-quests/board.ts lib/supabase/shift-quests/types.ts lib/shift/voiceWindow.ts lib/shift-island/live lib/shift-island/rounds-rules.ts lib/shift-island/tree-style.ts lib/shift-island/tree-copy.ts lib/shift-island/tree-closeup.ts components/shift/island/story/scenes.ts lib/elemental tsconfig.json)

read -r -d '' REMOTE_DEPLOY <<'DEPLOY' || true
ARCHIVE="$1"
REV="$2"
IMAGE="$NAME:$REV"
CONTEXT="$(mktemp -d)"
trap 'rm -rf "$ARCHIVE" "$CONTEXT"' EXIT

OLD_ID="$(docker container inspect -f '{{.Image}}' "$NAME" 2>/dev/null || true)"
if [ -n "$OLD_ID" ]; then
  OLD_REV="$(revision_of "$OLD_ID")"
  UNCHANGED="The old container ($OLD_REV) is still running; nothing changed."
else
  UNCHANGED="No container was running before; nothing changed."
fi

# stopped <what failed> <log file> <how to fix>: before the swap, so nothing changed.
stopped() {
  {
    echo "Deploy of $REV stopped: $1."
    echo "$UNCHANGED"
    echo "Last lines:"
    tail -n 20 "$2" | sed 's/^/  /'
    echo "Fix: $3"
  } >&2
  exit 1
}

# macOS tar adds extended attributes GNU tar does not know; they are not needed.
tar -xz --warning=no-unknown-keyword -C "$CONTEXT" -f "$ARCHIVE"
echo "Building $IMAGE"
docker build --quiet --label "$REVISION_LABEL=$REV" -t "$IMAGE" "$CONTEXT" >"$CONTEXT/build.log" 2>&1 ||
  stopped "the image did not build" "$CONTEXT/build.log" \
    "reproduce with: docker build bot/ staged by this script, or read the error above."

echo "Smoke check (no network)"
if ! docker run --rm --network none --env-file "$ENV_FILE" "$IMAGE" \
  node --import tsx bot/src/smoke.ts --env >"$CONTEXT/smoke.log" 2>&1; then
  docker rmi "$IMAGE" >/dev/null 2>&1 || true
  stopped "the smoke check failed, so the new image was removed" "$CONTEXT/smoke.log" \
    "a missing variable means $ENV_FILE needs it (bot/README.md, Environment); anything else, reproduce with pnpm bot:smoke."
fi
SMOKE="$(tail -n 1 "$CONTEXT/smoke.log")"
echo "  $SMOKE"
HEALTH="$(echo "$SMOKE" | sed -n 's/.*health=\([a-z]*\).*/\1/p')"
[ "$HEALTH" = none ] || HEALTH=file

echo "Swapping containers"
stop_container
start_container "$IMAGE"
if ! wait_healthy "$HEALTH" 240; then
  echo "New container $REV: $WAIT_NOTE." >&2
  show_logs
  stop_container
  if [ -z "$OLD_ID" ]; then
    echo "Nothing to roll back to; the bot is stopped. $IMAGE stays on the host for debugging." >&2
    exit 1
  fi
  start_container "$OLD_ID"
  if wait_healthy any 120; then
    echo "Rolled back to $OLD_REV. $IMAGE stays on the host for debugging." >&2
  else
    echo "Rolled back to $OLD_REV, but $WAIT_NOTE. Check: docker logs $NAME" >&2
  fi
  exit 1
fi

docker tag "$IMAGE" "$NAME:latest"
if [ -n "$OLD_ID" ] && [ "$OLD_ID" != "$(docker image inspect -f '{{.Id}}' "$IMAGE")" ]; then
  docker tag "$OLD_ID" "$NAME:previous"
fi

# The watchdog alerts staff when the container stops or turns unhealthy.
# One cron line per container folder, naming its container and folder.
install -m 755 "$CONTEXT/bot/watchdog.py" "$APP/watchdog.py"
CRON_LINE="*/5 * * * * python3 $APP/watchdog.py --name $NAME --app $APP >> $APP/watchdog.log 2>&1"
if ! crontab -l 2>/dev/null | grep -qF "$APP/watchdog.py"; then
  # No crontab yet makes crontab -l fail, which must not end the deploy.
  { crontab -l 2>/dev/null || true; echo "$CRON_LINE"; } | crontab -
fi
if [ ! -f "$APP/alert-webhook" ]; then
  echo "Warning: no $APP/alert-webhook, so the watchdog cannot alert anyone." >&2
fi

# Keep latest, previous and this revision's tag; older revision tags go.
docker images "$NAME" --format '{{.Tag}}' | grep -v -x -E "latest|previous|<none>|$REV" \
  | xargs -r -I{} docker rmi "$NAME:{}" >/dev/null 2>&1 || true

PREVIOUS="none"
docker image inspect "$NAME:previous" >/dev/null 2>&1 && PREVIOUS="$(revision_of "$NAME:previous")"
STATE=healthy
[ "$HEALTH" = file ] || STATE="up for a minute (its modules write no health file)"
echo "Running $REV, $STATE. Previous: $PREVIOUS (${RERUN}bot/deploy.sh <ssh-host> --rollback). Logs: docker logs -f $NAME"
DEPLOY

for path in "${FILES[@]}"; do
  if ! git cat-file -e "HEAD:$path" 2>/dev/null; then
    echo "$path is not in HEAD, but the image needs it (FILES). Commit it or check out a branch that has it." >&2
    exit 1
  fi
done
if [ -n "$(git status --porcelain -- "${FILES[@]}")" ]; then
  echo "Uncommitted changes in the bot's files. Commit first: the deploy ships HEAD." >&2
  exit 1
fi
for dep in "${DEPS[@]}"; do
  if [ ! -f "node_modules/$dep/package.json" ]; then
    echo "node_modules/$dep is missing. Run pnpm install first: the image pins the versions installed here." >&2
    exit 1
  fi
done
REV="$(git rev-parse --short HEAD)"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
git archive HEAD "${FILES[@]}" | tar -x -C "$STAGE"
cp "$STAGE/bot/Dockerfile" "$STAGE/Dockerfile"
echo "$REV" > "$STAGE/REVISION"
node -e '
  const deps = Object.fromEntries(
    process.argv.slice(1).map((p) => [p, require(`./node_modules/${p}/package.json`).version])
  );
  process.stdout.write(JSON.stringify({ name: "passionseed-discord-bot", private: true, dependencies: deps }, null, 2));
' "${DEPS[@]}" > "$STAGE/package.json"

echo "Deploying $REV to $HOST"
ARCHIVE="$(ssh "$HOST" mktemp)"
tar -C "$STAGE" -cz . | ssh "$HOST" "cat > '$ARCHIVE'"

# shellcheck disable=SC2029
printf '%s\n%s\n' "$REMOTE_COMMON" "$REMOTE_DEPLOY" | ssh "$HOST" "bash -s -- '$ARCHIVE' '$REV'"
