#!/usr/bin/env bash
# Play SHIFT High quests in a Discord TEST server against a local database.
#
#   QUEST_SANDBOX_TOKEN=<test bot token> \
#   QUEST_SANDBOX_GUILD_ID=<test server id> \
#   QUEST_SANDBOX_ADMIN_ID=<your Discord user id> \
#   bot/quests-sandbox.sh
#
#   bot/quests-sandbox.sh --db-only    # the database alone: no Discord, no token
#   bot/quests-sandbox.sh --reset      # wipe the sandbox database and build it again
#
# The island website (/shift/island) against the sandbox, signed in with your
# own Discord account (you are admin, so you count as eligible):
#
#   QUEST_SANDBOX_PORT=55451 QUEST_SANDBOX_ADMIN_ID=<your Discord user id> \
#   bot/quests-sandbox.sh --db-only --reset
#   SHIFT_QUEST_DATABASE_URL=postgresql://shift_quest_web:sandbox@127.0.0.1:55451/postgres pnpm dev
#
# First run: makes a Postgres cluster in ~/.cache/shift-quests-sandbox (or
# QUEST_SANDBOX_DIR), applies the shift_quest migrations and seeds it like a
# Season 1 pilot: you are admin, a demo student with a quest waiting in
# /review queue, five neighbours with trees, a stand-in reviewer
# (100000000000000701) who can approve your own work (you cannot: conflict of
# interest) and hand out redemptions, every draft side quest published for the
# web board and, once the season migration exists, a season with a Demo Day,
# an island goal and the free sticker unlock. Coins are ON: the DRAFT economy
# in lib/content/shift-island-economy.ts (rules pinned on the main, community
# and side quests, the shop ladder with its gates, the terms) is applied by
# bot/scripts/economy-seed.ts before any quest is chosen. With the player
# migration (schema 9): parent consent stays required, neighbours A, B and D
# confirmed their own age (so their names show), you have no consent yet (to
# try the flow), and AI island news is on with sample summaries for A, B and
# D. --rewards is kept for old commands and does nothing more. Both login
# roles get the password 'sandbox': shift_quest_bot (the bot) and
# shift_quest_web (the website).
#
# Every run checks the sandbox still matches the migrations (a hash of the
# shift_quest files): after you pull new ones it stops and tells you to reset.
# Then it registers the slash commands in the test server and starts the bot
# with only the shift-quests module. --db-only skips Discord and keeps the
# database up until Ctrl-C; QUEST_SANDBOX_DRY_RUN=1 builds or checks it and exits.
# Ctrl-C stops the bot and the database.
#
# Never reads .env.local and never touches Supabase. Use a test server and a
# test bot: commands registered here appear for everyone in that server.
set -euo pipefail

usage() {
  echo "usage: bot/quests-sandbox.sh [--db-only] [--reset]" >&2
  exit 2
}
DB_ONLY="${QUEST_SANDBOX_DRY_RUN:-0}"
RESET="${QUEST_SANDBOX_RESET:-0}"
for arg in "$@"; do
  case "$arg" in
    --db-only) DB_ONLY=1 ;;
    --reset) RESET=1 ;;
    # Coins are on in every sandbox now (the DRAFT economy seed); kept so old commands still run.
    --rewards) echo "Note: --rewards is the default now; the DRAFT economy is seeded on every build." ;;
    *) usage ;;
  esac
done
if [ "$DB_ONLY" = 0 ]; then
  : "${QUEST_SANDBOX_TOKEN:?Set QUEST_SANDBOX_TOKEN to a TEST bot token (or run with --db-only)}"
  : "${QUEST_SANDBOX_GUILD_ID:?Set QUEST_SANDBOX_GUILD_ID to the test server ID}"
  : "${QUEST_SANDBOX_ADMIN_ID:?Set QUEST_SANDBOX_ADMIN_ID to your Discord user ID}"
fi

ROOT="$(git rev-parse --show-toplevel)"
# shellcheck source=../supabase/tests/shift_quests/pg-preflight.sh
. "$ROOT/supabase/tests/shift_quests/pg-preflight.sh"

DIR="${QUEST_SANDBOX_DIR:-$HOME/.cache/shift-quests-sandbox}"
PORT="${QUEST_SANDBOX_PORT:-55450}"
BUILT="$DIR/sandbox.built"
export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
DEMO_STUDENT="100000000000000777"
# A stand-in admin for --db-only; a real run needs your own ID (reset to switch).
ADMIN="${QUEST_SANDBOX_ADMIN_ID:-100000000000000700}"

MIGRATIONS=("$ROOT"/supabase/migrations/*shift_quest*.sql)
sha12() { if command -v sha256sum >/dev/null; then sha256sum; else shasum -a 256; fi | cut -c1-12; }
HASH="$(for f in "${MIGRATIONS[@]}"; do basename "$f"; cat "$f"; done | sha12)"
echo "Migrations: ${#MIGRATIONS[@]} shift_quest files, hash $HASH. Postgres $PG_MAJOR from $PG_BIN"
# The DRAFT economy (rules, shop, terms) the seed applies; a change after the build only warns.
ECONOMY_FILE="$ROOT/lib/content/shift-island-economy.ts"
ECONOMY_SEED="$ROOT/bot/scripts/economy-seed.ts"
TSX="$ROOT/node_modules/.bin/tsx"
ECONOMY_HASH="$(cat "$ECONOMY_FILE" "$ECONOMY_SEED" | sha12)"
# The notice version the website records with consent (ISLAND_CONSENT_VERSION in
# lib/supabase/shift-quests/playerTypes.ts).
CONSENT_VERSION="island-2026-11-11"
economy_seed() {
  if [ ! -x "$TSX" ]; then
    echo "The economy seed needs tsx: run pnpm install in $ROOT first." >&2
    exit 1
  fi
  "$TSX" "$ECONOMY_SEED" "$1" | "${PSQL[@]}" -o /dev/null -v admin="$ADMIN"
}

stop_db() { pg_ctl -D "$DIR/db" -m fast stop >/dev/null 2>&1 || true; }
rebuild() {
  echo "Rebuild it: bot/quests-sandbox.sh --reset (or QUEST_SANDBOX_RESET=1)" >&2
  exit 1
}
built() { sed -n "s/^$1=//p" "$BUILT" 2>/dev/null; }

if [ "$RESET" = 1 ] && [ -d "$DIR" ]; then
  echo "Wiping the sandbox database in $DIR"
  stop_db
  # Only what this script made, never the folder itself (QUEST_SANDBOX_DIR may be shared).
  rm -rf "$DIR/db" "$BUILT" "$DIR/postgres.log"
fi

if [ -d "$DIR/db" ]; then
  if [ ! -f "$BUILT" ]; then
    echo "The last sandbox build did not finish, so this database is incomplete." >&2
    rebuild
  fi
  if [ "$(built migrations)" != "$HASH" ]; then
    echo "The sandbox was built from other migrations (hash $(built migrations)); they are now $HASH." >&2
    rebuild
  fi
  if [ -n "${QUEST_SANDBOX_ADMIN_ID:-}" ] && [ "$(built admin)" != "$QUEST_SANDBOX_ADMIN_ID" ]; then
    echo "The sandbox admin is $(built admin), not QUEST_SANDBOX_ADMIN_ID=$QUEST_SANDBOX_ADMIN_ID." >&2
    rebuild
  fi
  if [ "$(built economy)" != "$ECONOMY_HASH" ]; then
    echo "Note: the DRAFT economy changed since this sandbox was built. Apply it with:" >&2
    echo "  $TSX $ECONOMY_SEED | psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -v admin=$(built admin)" >&2
    echo "  (or rebuild: bot/quests-sandbox.sh --reset)" >&2
  fi
  FRESH=0
else
  echo "Creating the sandbox database in $DIR"
  mkdir -p "$DIR"
  initdb -D "$DIR/db" -U postgres --auth=trust >/dev/null
  FRESH=1
fi

if ! pg_ctl -D "$DIR/db" status >/dev/null 2>&1; then
  if ! pg_ctl -D "$DIR/db" -o "-p $PORT -k $DIR -c listen_addresses=127.0.0.1" -l "$DIR/postgres.log" -w start >/dev/null; then
    echo "The sandbox database did not start on port $PORT (in use? set QUEST_SANDBOX_PORT). Its log:" >&2
    tail -n 20 "$DIR/postgres.log" >&2
    exit 1
  fi
fi
BUILDING="$FRESH"
on_exit() {
  if [ "$BUILDING" = 1 ]; then
    echo "The sandbox build failed (the error is above). Fix it, then: bot/quests-sandbox.sh --reset" >&2
  fi
  stop_db
}
trap on_exit EXIT
trap 'exit 130' INT TERM

if [ "$FRESH" = 1 ]; then
  "${PSQL[@]}" <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
SQL
  for f in "${MIGRATIONS[@]}"; do
    "${PSQL[@]}" -f "$f" >/dev/null
  done
  "${PSQL[@]}" -c "ALTER ROLE shift_quest_bot WITH LOGIN PASSWORD 'sandbox'"
  # The website's login (20261111090900_shift_quests_board), once it exists.
  if [ "$("${PSQL[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web')")" = t ]; then
    "${PSQL[@]}" -c "ALTER ROLE shift_quest_web WITH LOGIN PASSWORD 'sandbox'"
  fi

  # You are admin. A stand-in reviewer on no project, so your own submissions
  # can be approved (the approve-all command printed by --db-only uses this
  # ID); the economy seed makes them the fulfillment person too.
  "${PSQL[@]}" -o /dev/null -v admin="$ADMIN" <<'SQL'
SELECT public.shift_quest_bootstrap_admin(:'admin', 'Sandbox admin');
SELECT public.shift_quest_admin_role(:'admin', '100000000000000701', 'Sandbox reviewer', 'reviewer', true);
SQL

  # Season 1 coins ON: the DRAFT rules, template pins, shop and terms, before
  # any quest is chosen so every quest below pins its rule.
  economy_seed core

  "${PSQL[@]}" -o /dev/null -v admin="$ADMIN" -v demo="$DEMO_STUDENT" <<'SQL'
-- A demo student with a submitted quest, so /review queue has work at once.
SELECT public.shift_quest_start(:'demo', 'Demo Student', false);
SELECT public.shift_quest_project_create(:'demo', 'Demo Trip Splitter', 'software', 'Split trip costs between friends');
SELECT public.shift_quest_choose(:'demo',
  (SELECT id FROM public.shift_quest_templates WHERE slug = 'let-reality-surprise-you' AND status = 'published'),
  'Let 3 classmates try splitting a trip', 'Book a lunch-break test', NULL, NULL);
SELECT public.shift_quest_submit(:'demo',
  (SELECT id FROM public.shift_quest_instances WHERE title = 'ให้ความจริงทำให้คุณแปลกใจ' LIMIT 1), 1,
  'Three Grade 11 students tried it. Two got stuck on the totals screen; nobody finished on their own.',
  'I assumed totals were obvious. They were not, so I will show the split before asking for names.',
  NULL, 'reviewers', NULL, '{}');

-- A few neighbours with trees at different stages, approved by you.
CREATE TEMP TABLE demo (discord text, name text, project text, stage int, show boolean);
INSERT INTO demo VALUES
  ('100000000000000781', 'Demo Neighbour A', 'ร้านขนมออนไลน์', 4, true),
  ('100000000000000782', 'Demo Neighbour B', 'เกมพิกเซลสอนฟิสิกส์', 6, true),
  ('100000000000000783', 'Demo Neighbour C', 'ติวคณิตออนไลน์', 2, false),
  ('100000000000000784', 'Demo Neighbour D', 'แอปจองคิวร้านตัดผม', 1, true),
  ('100000000000000785', 'Demo Neighbour E', 'เพลงประกอบหนังสั้น', 3, false);
SELECT public.shift_quest_start(discord, name, false) FROM demo;
SELECT public.shift_quest_project_create(discord, project, 'other', NULL) FROM demo;
SELECT public.shift_quest_island_optin(d.discord, pm.project_id, true)
FROM demo d
JOIN public.shift_quest_members m ON m.discord_user_id = d.discord
JOIN public.shift_quest_project_members pm ON pm.member_id = m.id AND pm.status = 'active'
WHERE d.show;
DO $$
DECLARE
  d record;
  m int;
  v_sub jsonb;
  v_admin text := (SELECT discord_user_id FROM public.shift_quest_members WHERE 'admin' = ANY (roles) LIMIT 1);
BEGIN
  FOR d IN SELECT * FROM demo LOOP
    FOR m IN 1..d.stage LOOP
      v_sub := public.shift_quest_milestone_submit(p_actor => d.discord, p_milestone => m::smallint,
        p_proof => 'Sandbox proof', p_reflection => 'Sandbox note', p_artifact_url => NULL);
      -- A self-declared milestone is approved already; the rest wait for you.
      IF v_sub ->> 'submission_id' IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_submissions s
        WHERE s.id = (v_sub ->> 'submission_id')::uuid AND s.status = 'approved'
      ) THEN
        PERFORM public.shift_quest_review_decide(v_admin, (v_sub ->> 'submission_id')::uuid, 'approved', 'Sandbox visit', true);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
SQL
  SEEDED="you are admin, coins are on with the DRAFT economy (rules, shop ladder with gates, terms), five neighbours have trees, a demo submission waits in /review queue and a stand-in reviewer (100000000000000701) can approve your work and hand out redemptions"

  # Side quests for the web board are seeded as drafts; publish them all here.
  if [ "$("${PSQL[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shift_quest_templates' AND column_name = 'side')")" = t ]; then
    "${PSQL[@]}" -o /dev/null -v admin="$ADMIN" <<'SQL'
SELECT public.shift_quest_admin_template_state(:'admin', slug, true)
FROM (SELECT DISTINCT slug FROM public.shift_quest_templates WHERE side) s
ORDER BY slug;
SQL
    SEEDED="$SEEDED; every side quest is published for the web board"
    # Side quests pin the side rule once they are published.
    economy_seed side
  fi

  # The player round (20261111095000, schema 9): parent consent and AI island news.
  if [ "$("${PSQL[@]}" -Atc "SELECT to_regclass('public.shift_quest_consents') IS NOT NULL")" = t ]; then
    "${PSQL[@]}" -o /dev/null -v admin="$ADMIN" -v version="$CONSENT_VERSION" <<'SQL'
-- Consent stays required (the default). Neighbours A, B and D confirmed their
-- own age, so their names show; C, E, the demo student and you have none (you
-- can try the parent flow on the website).
SELECT public.shift_quest_consent_adult(d, (public.shift_quest__bkk_today() - interval '25 years')::date, :'version')
FROM unnest(ARRAY['100000000000000781', '100000000000000782', '100000000000000784']) d;

-- AI island news on, with SANDBOX SAMPLE summaries (model 'sandbox-sample'), not model output.
SELECT public.shift_quest_admin_island_set(:'admin', 'digest_enabled', 'on');
CREATE TEMP TABLE news (discord text, day_summary text, week_summary text);
INSERT INTO news VALUES
  ('100000000000000781',
   'ตัวอย่างข่าวเกาะ: วันนี้ทีมให้ลูกค้าจริง 3 คนลองสั่งขนมผ่านหน้าร้านออนไลน์ แล้วปรับตะกร้าให้เห็นราคารวมก่อนจ่าย',
   'ตัวอย่างข่าวเกาะ: สัปดาห์นี้ต้นไม้ของทีมถึงขั้น 4 ทีมทดสอบการสั่งกับลูกค้าจริงและแก้จุดที่คนสะดุดไปสองจุด'),
  ('100000000000000782',
   'ตัวอย่างข่าวเกาะ: วันนี้ทีมช่วยอีกทีมตั้งการทดสอบกับผู้เล่นจริง และเพิ่มด่านใหม่เรื่องแรงเสียดทาน',
   'ตัวอย่างข่าวเกาะ: สัปดาห์นี้ต้นไม้ของทีมถึงขั้น 6 ผู้เล่นที่ลองบอกว่าด่านแรงโน้มถ่วงยากไป ทีมจึงทำด่านฝึกเพิ่ม'),
  ('100000000000000784',
   NULL,
   'ตัวอย่างข่าวเกาะ: สัปดาห์นี้ทีมคุยกับร้านตัดผม 2 ร้านเพื่อดูว่าคิวจริงเป็นยังไง ยังไม่มีงานส่งตรวจใหม่');
SELECT public.shift_quest_digest_save(public.shift_quest__bkk_today(), k.kind, jsonb_agg(jsonb_build_object(
         'project_id', pm.project_id,
         'summary', CASE WHEN k.kind = 'day' THEN n.day_summary ELSE n.week_summary END,
         'no_update', (CASE WHEN k.kind = 'day' THEN n.day_summary ELSE n.week_summary END) IS NULL,
         'model', 'sandbox-sample')))
FROM news n
JOIN public.shift_quest_members m ON m.discord_user_id = n.discord
JOIN public.shift_quest_project_members pm ON pm.member_id = m.id AND pm.status = 'active'
CROSS JOIN (VALUES ('day'), ('week')) k(kind)
GROUP BY k.kind;
SQL
    SEEDED="$SEEDED; parent consent is required (neighbours A, B and D confirmed their age, you have none yet) and AI island news is on with sample summaries"
  fi

  # Season 1 lives in a later migration than wave 1; seed it only once that exists.
  if [ "$("${PSQL[@]}" -Atc "SELECT to_regclass('public.shift_quest_seasons') IS NOT NULL")" = t ]; then
    if "${PSQL[@]}" -o /dev/null -v admin="$ADMIN" <<'SQL'
-- Demo Day in six weeks, an island goal and one threshold unlock.
SELECT public.shift_quest_admin_season(p_actor => :'admin', p_name => 'Season 1 (sandbox)',
  p_starts_on => current_date - 7, p_ends_on => current_date + 60, p_demo_day => current_date + 42,
  p_table_bar => 2::smallint, p_stage_bar => 3::smallint,
  p_goal_milestone => 3::smallint, p_goal_target => 8, p_goal_deadline => current_date + 30,
  p_goal_unlock => 'ลานกลางเปิดไฟคืนเทศกาล', p_activate => true, p_clear_goal => false);
SELECT public.shift_quest_admin_unlock(p_actor => :'admin',
  p_season => (SELECT id FROM public.shift_quest_seasons WHERE status = 'active'),
  p_label => 'สติกเกอร์ SHIFT High', p_milestone_count => 2::smallint,
  p_deadline => current_date + 30, p_rule_key => NULL);
SQL
    then
      SEEDED="$SEEDED; Season 1 runs"
    else
      echo "Warning: the Season 1 seed no longer matches the season functions (error above). Update it in bot/quests-sandbox.sh; the rest of the sandbox works." >&2
    fi
  else
    SEEDED="$SEEDED; no season yet (wave 1 migrations only)"
  fi

  printf 'migrations=%s\nadmin=%s\nrewards=1\neconomy=%s\n' "$HASH" "$ADMIN" "$ECONOMY_HASH" >"$BUILT"
  BUILDING=0
  echo "Sandbox ready: $SEEDED."
else
  echo "Sandbox up to date (admin $(built admin), DRAFT economy $(built economy))."
fi

if [ "${QUEST_SANDBOX_DRY_RUN:-0}" = 1 ]; then
  echo "Dry run: the database is ready and stops again now; not contacting Discord."
  exit 0
fi
if [ "$DB_ONLY" = 1 ]; then
  echo "Database up on 127.0.0.1:$PORT until Ctrl-C."
  echo "  psql:     psql -h 127.0.0.1 -p $PORT -U postgres -d postgres"
  echo "  bot role: SHIFT_QUEST_DATABASE_URL=postgresql://shift_quest_bot:sandbox@127.0.0.1:$PORT/postgres"
  if [ "$("${PSQL[@]}" -Atc "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web' AND rolcanlogin)")" = t ]; then
    echo "  web (SHIFT_QUEST_DATABASE_URL for pnpm dev): postgresql://shift_quest_web:sandbox@127.0.0.1:$PORT/postgres"
  fi
  echo "  approve every pending submission as the stand-in reviewer (you cannot approve your own):"
  echo "    psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -c \"select public.shift_quest_review_decide('100000000000000701', s.id, 'approved', 'Sandbox review', true) from public.shift_quest_submissions s where s.status = 'pending'\""
  while :; do
    sleep 3600 &
    wait $! || true
  done
fi

export BOT_MODULES=shift-quests
export DISCORD_SHIFT_BOT_TOKEN="$QUEST_SANDBOX_TOKEN"
export DISCORD_SHIFT_GUILD_ID="$QUEST_SANDBOX_GUILD_ID"
export SHIFT_QUEST_DATABASE_URL="postgresql://shift_quest_bot:sandbox@127.0.0.1:$PORT/postgres"
unset DISCORD_BOT_TOKEN

"$ROOT/node_modules/.bin/tsx" "$ROOT/bot/src/index.ts" --register-commands
"$ROOT/node_modules/.bin/tsx" "$ROOT/bot/src/index.ts"
