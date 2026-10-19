#!/bin/zsh
# Render-only dev server for the Marketing Studio, on :3010.
#
#   scripts/studio-server.sh          # sync a snapshot and (re)start it
#   scripts/studio-server.sh --sync   # sync edits into a running one
#
# Why a separate server: the everyday `pnpm dev` runs against production
# Supabase and can keep serving a stale copy of an edited component. This
# one runs from a snapshot in .claude/worktrees/studio-render (gitignored),
# with a dummy Supabase URL so rendering never touches a real database.
# Turbopack root points at the repo so the snapshot reuses node_modules.

set -e
REPO="${0:A:h:h}"
COPY="$REPO/.claude/worktrees/studio-render"
PORT=3010

sync_copy() {
  mkdir -p "$COPY"
  rsync -a --delete \
    --exclude node_modules --exclude .next --exclude output --exclude .claude --exclude .git \
    --exclude coverage --exclude scrape --exclude data --exclude artifacts \
    --exclude pnpm-lock.yaml --exclude pnpm-workspace.yaml --exclude '.env*' \
    "$REPO/" "$COPY/"
  sed -i '' "s#    root: process.cwd(),#    root: \"$REPO\",#" "$COPY/next.config.mjs"
}

sync_copy
[[ "$1" == "--sync" ]] && { echo "synced -> $COPY"; exit 0; }

pkill -f "next dev --turbopack -p $PORT" 2>/dev/null || true
cd "$COPY"
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=render-only \
  nohup npx next dev --turbopack -p $PORT > /tmp/studio-server.log 2>&1 &
until curl -sf -o /dev/null --max-time 300 "http://localhost:$PORT/studio/manifest"; do sleep 2; done
echo "✅ studio server on http://localhost:$PORT (log /tmp/studio-server.log)"
