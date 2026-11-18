#!/usr/bin/env bash
# Runs the SHIFT High quest database tests against a throwaway Postgres
# cluster, with Supabase's three API roles and its default privileges in
# public (tables, sequences and functions granted to anon, authenticated and
# service_role) stubbed, so a missing REVOKE shows up here as it would in
# production. One fresh database per step:
#
#   once      every shift_quest migration applied exactly once, as the first
#             production push will: the privilege check (the bot, the website's
#             shift_quest_web allowlist, the Data API), and its catalog must
#             equal the twice-applied one below
#   wave1     only the files up to 20261111090700, when later ones exist: wave 1
#             applies alone, has the island core and no season tables
#   rules, island, flows, islandflows, board, canvas, campfire, live
#             every migration applied twice (each must be re-runnable), then
#             db_rules.ts, island_rules.ts, bot_flows.ts, island_flows.ts,
#             web_board.ts (the web quest board, side quests, shift_quest_web),
#             web_canvas.ts (the SHIFT canvas link), campfire.ts (the
#             coworking voice campfire) and live.ts (the live island post and
#             the suggestions channel), each with consent_required switched off
#             (20261111095000) so their expectations hold
#   player    every migration applied twice, then player.ts (consent, the shop
#             gates, staff awards, the character and wallet reads, AI island
#             news), with consent on and off
#   roots     every migration applied twice, then roots.ts (the roots read,
#             20261113090000: what counts, the daily cap, the levels, plain
#             plots), with consent on and off
#   tree      every migration applied twice, then tree.ts (schema 13,
#             20261114120000: seeds, tree style, round and quest gifts, the
#             own tree read and other teams' styles), with consent off
#   treepost  every migration applied twice, then tree_post.ts (schema 16,
#             20261118090000: the celebrate post when a mentor's approval
#             grows a tree, and the bot's send-time read), consent on and off
#   reset, evidence, peer
#             every migration applied twice, then reset.ts, evidence.ts and
#             peer.ts (the admin self-reset, photo evidence, the peer check)
#   webeverything
#             every migration applied twice, then web_everything.ts (schema
#             17, 20261118100000: every new website wrapper as
#             shift_quest_web, the data request dedupe, the help conflict
#             filter and the award after the last teammate answers)
#   visitors  every migration applied twice, then visitors.ts (schema 18,
#             20261118110000: the plaza's count of today's check-ins and the
#             caller's own team's), with consent off
#   news      every migration applied twice, then news.ts (schema 19,
#             20261118130000: the nightly island news card: when it is due,
#             at fixed times, what its totals count over 20:00 to 20:00, the
#             AI lines it may show, claim, mark and the 7-day re-check, the
#             news channel setting, the grants), with consent off
#   newsmissed
#             every migration applied twice, then news_missed.ts (schema 20,
#             20261118140000: the staff note when tonight's card did not post
#             by 22:30, at fixed times: one outbox row per Bangkok day for the
#             staff channel, {day} only, none with a card, a card another
#             process is sending, no news or staff channel or a channel set
#             from 22:24; a night of failing sends ticked as the bot does
#             gets exactly one note by 22:40; the grants), with consent off
#   campfirecall
#             every migration applied twice, then campfire_call.ts (schema 21,
#             20261118150000: the 18:50 campfire call and the evening guest, at
#             fixed times: when the call is due, claim and mark, the frozen
#             ping, the previous call; the guest rotation; the drop only in the
#             guest's first rest, one roll per team per night under repeated
#             and concurrent calls, staff never win, no member id or presence
#             stored, earlier nights deleted, guest looks only from guests;
#             the private check; the grants: the bot's, never the website's),
#             with consent off
#
#   supabase/tests/shift_quests/run-local.sh       # or: pnpm test:db:quests
#   PG_BIN=/usr/lib/postgresql/15/bin supabase/tests/shift_quests/run-local.sh
#   SHIFT_QUESTS_TEST_PORT=55483 ...               # another port (default 55439)
#
# Needs Postgres 15 or newer (pg-preflight.sh says how to get it).
# Never touches the linked Supabase project or any existing database.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
HERE="$ROOT/supabase/tests/shift_quests"
# shellcheck source=pg-preflight.sh
. "$HERE/pg-preflight.sh"

DATA="$(mktemp -d)"
PORT="${SHIFT_QUESTS_TEST_PORT:-55439}"
LOG="$DATA/postgres.log"
WAVE1_LAST=20261111090700
MIGRATIONS=("$ROOT"/supabase/migrations/*shift_quest*.sql)
WAVE1=()
for f in "${MIGRATIONS[@]}"; do
  if [ "$(basename "$f" | cut -c1-14)" -le "$WAVE1_LAST" ]; then WAVE1+=("$f"); fi
done
sha12() { if command -v sha256sum >/dev/null; then sha256sum; else shasum -a 256; fi | cut -c1-12; }

cleanup() {
  pg_ctl -D "$DATA/db" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$DATA"
}
trap cleanup EXIT

initdb -D "$DATA/db" -U postgres --auth=trust >/dev/null
# A throwaway cluster: small WAL, no full-page images, no fsync, so ten
# databases fit in a few hundred megabytes of disk.
PG_OPTS="-c wal_level=minimal -c max_wal_senders=0 -c max_wal_size=64MB -c min_wal_size=32MB -c full_page_writes=off -c fsync=off"
if ! pg_ctl -D "$DATA/db" -o "-p $PORT -k $DATA -c listen_addresses=127.0.0.1 $PG_OPTS" -l "$LOG" -w start >/dev/null; then
  echo "Postgres did not start on port $PORT (in use? set SHIFT_QUESTS_TEST_PORT). Its log:" >&2
  tail -n 20 "$LOG" >&2
  exit 1
fi

export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
echo "postgres $("${PSQL[@]}" -d postgres -Atc 'SHOW server_version') from $PG_BIN"

"${PSQL[@]}" -d postgres <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
SQL

# A fresh database with Supabase's grants on everything new in public.
new_db() {
  "${PSQL[@]}" -d postgres -c "CREATE DATABASE $1"
  "${PSQL[@]}" -d "$1" <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
SQL
}

# apply <db> <label> <file>...
apply() {
  local db="$1" label="$2" f
  shift 2
  for f in "$@"; do
    "${PSQL[@]}" -d "$db" -f "$f" >/dev/null || {
      echo "FAIL: $(basename "$f") did not apply to $db ($label)" >&2
      exit 1
    }
  done
}

# What a re-run could change: definitions, grants, row security, policies,
# triggers and row counts of every public shift_quest object. Grants are
# sorted, so the order a loop granted them in does not matter.
catalog() {
  "${PSQL[@]}" -d "$1" -At <<'SQL'
SELECT k || ' | ' || v FROM (
  SELECT 'function ' || p.oid::regprocedure::text AS k,
    md5(pg_get_functiondef(p.oid))
      || ' acl=' || coalesce((SELECT string_agg(a::text, ',' ORDER BY a::text) FROM unnest(p.proacl) a), 'default') AS v
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
  UNION ALL
  SELECT 'relation ' || c.relname,
    c.relkind::text || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
      || ' acl=' || coalesce((SELECT string_agg(a::text, ',' ORDER BY a::text) FROM unnest(c.relacl) a), 'default')
      || CASE WHEN c.relkind IN ('r', 'p') THEN ' rows=' || (xpath('/row/n/text()',
           query_to_xml(format('SELECT count(*) AS n FROM public.%I', c.relname), false, true, '')))[1]::text
         ELSE '' END
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%'
  UNION ALL
  SELECT 'column ' || c.relname || '.' || a.attname,
    a.attnum || ' ' || format_type(a.atttypid, a.atttypmod) || ' notnull=' || a.attnotnull
      || ' default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-')
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%' AND c.relkind IN ('r', 'p', 'v', 'm')
    AND a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT 'constraint ' || c.relname || '.' || co.conname, pg_get_constraintdef(co.oid)
  FROM pg_constraint co JOIN pg_class c ON c.oid = co.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%'
  UNION ALL
  SELECT 'index ' || i.relname, pg_get_indexdef(i.oid)
  FROM pg_index x
  JOIN pg_class i ON i.oid = x.indexrelid
  JOIN pg_class c ON c.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%'
  UNION ALL
  SELECT 'policy ' || c.relname || '.' || pol.polname,
    pol.polcmd::text || ' permissive=' || pol.polpermissive || ' roles=' || pol.polroles::regrole[]::text
      || ' using=' || coalesce(pg_get_expr(pol.polqual, pol.polrelid), '-')
      || ' check=' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '-')
  FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%'
  UNION ALL
  SELECT 'trigger ' || c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid) || ' enabled=' || t.tgenabled::text
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%' AND NOT t.tgisinternal
  UNION ALL
  SELECT 'type ' || t.typname,
    t.typtype::text || ' ' || coalesce((SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
      FROM pg_enum e WHERE e.enumtypid = t.oid), format_type(t.typbasetype, t.typtypmod))
  FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typname LIKE 'shift\_quest\_%' AND t.typtype IN ('e', 'd')
) catalog
ORDER BY k;
SQL
}

# The rules of 20261111090600's grant loop, checked after a single pass: the
# bot can execute every shift_quest_* entry point and no helper, the Data API
# can execute none and touch no table, and every table has row level security.
# The website-only functions (the canvas link, 091100, the ownership read,
# 091200, the campfire read, 093000, and the menu links read, 094000) are
# never the bot's; the campfire writers (093000), the live post's reader
# and writer (094000), the nightly island news card's four functions
# (20261118130000), its missed-night check (20261118140000,
# shift_quest_enqueue_news_missed) and the campfire call's and evening
# guest's five (20261118150000: shift_quest_call_today, _call_claim,
# _call_mark, shift_quest_campfire_drop, shift_quest_guest_status) are the
# bot's like every other entry point, and never the website's (their
# helpers, shift_quest__news_*, __call_* and __guest_*, are nobody's).
# And the web allowlist (20261111090900, 091000, 091100, 091200, 093000, 094000, and every later file
# that grants shift_quest_web, up to 20261118100000's website-does-everything allowlist): shift_quest_web executes exactly the
# functions listed below (nothing before that file is applied), never a
# helper, and holds no privilege on any table or sequence. The list repeats
# the migration's on purpose: a new grant must change both.
check_privileges() {
  local problems
  problems="$("${PSQL[@]}" -d "$1" -At <<'SQL'
WITH fns0 AS (
  SELECT p.oid, p.oid::regprocedure::text AS sig,
    p.proname LIKE 'shift\_quest\_\_%' OR p.proname = 'shift_quest_bootstrap_admin' AS helper,
    -- Website-only entry points (091100, 091200, 093000, 094000, 095000, 20261115120000): the bot never runs them.
    p.proname LIKE 'shift\_quest\_canvas\_%'
      OR p.proname IN ('shift_quest_ownership_get', 'shift_quest_campfire', 'shift_quest_island_links')
      OR p.proname IN ('shift_quest_character', 'shift_quest_wallet', 'shift_quest_consent_get',
        'shift_quest_consent_adult', 'shift_quest_consent_link', 'shift_quest_consent_import',
        'shift_quest_consent_parent_view', 'shift_quest_consent_parent_answer',
        'shift_quest_consent_parent_withdraw', 'shift_quest_island_news', 'shift_quest_digest_inputs',
        'shift_quest_digest_save', 'shift_quest_admin_reset_self', 'shift_quest_admin_island')
      -- 20261115130000_shift_quest_evidence_photos: photos, the web review page, the trash job, the problem line.
      OR p.proname IN ('shift_quest_evidence_add', 'shift_quest_evidence_remove', 'shift_quest_evidence_list',
        'shift_quest_review_view', 'shift_quest_storage_trash_claim', 'shift_quest_storage_trash_done',
        'shift_quest_project_set_ambition')
      -- 20261115140000_shift_quest_peer_check: the peer check is the website's.
      OR p.proname IN ('shift_quest_project_friends', 'shift_quest_project_invite_friend')
      OR p.proname LIKE 'shift\_quest\_peer\_%'
      -- 20261118100000_shift_quest_web_everything: the website's wrappers over member uuids.
      OR p.proname IN ('shift_quest_project_teammates', 'shift_quest_islanders', 'shift_quest_share_draft',
        'shift_quest_milestone_submit_team', 'shift_quest_side_submit_team', 'shift_quest_admin_web_status',
        'shift_quest_admin_setting',
        'shift_quest_admin_members', 'shift_quest_admin_member', 'shift_quest_admin_member_role',
        'shift_quest_admin_member_recognize', 'shift_quest_admin_member_award',
        'shift_quest_admin_member_consent_reset', 'shift_quest_admin_seasons')
      -- 20261118110000_shift_quest_island_visitors: the plaza's visitors are the website's.
      OR p.proname = 'shift_quest_island_visitors' AS web_only
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
), fns AS (
  SELECT oid, sig, helper, NOT helper AND NOT web_only AS for_bot FROM fns0
), rels AS (
  SELECT c.oid, c.relname, c.relkind, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
), roles(role) AS (VALUES ('anon'), ('authenticated')),
web_allow(sig) AS (VALUES
  ('shift_quest_schema_version()'),
  ('shift_quest_session(text,text)'),
  ('shift_quest_start(text,text,boolean)'),
  ('shift_quest_island(text)'),
  ('shift_quest_island_map(text)'),
  ('shift_quest_board(text)'),
  ('shift_quest_checkin(text,text)'),
  ('shift_quest_rest(text,boolean)'),
  ('shift_quest_resume(text,uuid)'),
  ('shift_quest_island_optin(text,uuid,boolean)'),
  ('shift_quest_milestone_start(text,smallint)'),
  ('shift_quest_milestone_submit(text,smallint,text,text,text)'),
  ('shift_quest_side_choose(text,uuid)'),
  ('shift_quest_side_submit(text,uuid,text,text,text)'),
  ('shift_quest_propose(text,text,text,text,text,text)'),
  ('shift_quest_submit(text,uuid,integer,text,text,text,text,text,text[])'),
  ('shift_quest_help_create(text,text,text,text,uuid)'),
  ('shift_quest_project_create(text,text,text,text)'),
  ('shift_quest_project_list(text)'),
  ('shift_quest_project_respond(text,uuid,boolean)'),
  ('shift_quest_canvas_get(text)'),
  ('shift_quest_canvas_link(text,uuid,text,text)'),
  ('shift_quest_canvas_unlink(text)'),
  ('shift_quest_ownership_get(text)'),
  ('shift_quest_campfire(text,boolean)'),
  ('shift_quest_island_links(text)'),
  -- 20261111095000_shift_quest_player.
  ('shift_quest_character(text)'),
  ('shift_quest_wallet(text)'),
  ('shift_quest_redeem(text,uuid,text,integer)'),
  ('shift_quest_redeem_cancel(text,uuid)'),
  ('shift_quest_consent_get(text)'),
  ('shift_quest_consent_adult(text,date,text)'),
  ('shift_quest_consent_link(text,text,text,text)'),
  ('shift_quest_consent_import(text,text,timestamp with time zone,boolean,boolean)'),
  ('shift_quest_consent_parent_view(text)'),
  ('shift_quest_consent_parent_answer(text,boolean,boolean,text,text,text,text,text)'),
  ('shift_quest_consent_parent_withdraw(text)'),
  ('shift_quest_island_news(text)'),
  ('shift_quest_digest_inputs(date,text)'),
  ('shift_quest_digest_save(date,text,jsonb)'),
  ('shift_quest_digest_hide(text,integer,boolean,text)'),
  -- 20261113090000_shift_quest_roots.
  ('shift_quest_island_roots()'),
  ('shift_quest_island_my_roots(text)'),
  ('shift_quest_progress_add(text,text,text,text,text,text,text,uuid)'),
  -- 20261114120000_shift_quest_tree_style.
  ('shift_quest_tree_get(text)'),
  ('shift_quest_seed_plant(text,text,text)'),
  ('shift_quest_quest_gift(text,uuid)'),
  ('shift_quest_tree_pick(text,uuid,text)'),
  ('shift_quest_tree_equip(text,text)'),
  ('shift_quest_island_styles()'),
  -- 20261115120000_shift_quest_admin_reset_self.
  ('shift_quest_admin_reset_self(text)'),
  ('shift_quest_admin_island(text)'),
  -- 20261115130000_shift_quest_evidence_photos.
  ('shift_quest_evidence_add(text,uuid,integer,integer,integer)'),
  ('shift_quest_evidence_remove(text,uuid)'),
  ('shift_quest_evidence_list(text,uuid)'),
  ('shift_quest_review_view(text,uuid)'),
  ('shift_quest_storage_trash_claim(integer)'),
  ('shift_quest_storage_trash_done(text[])'),
  ('shift_quest_project_set_ambition(text,uuid,text)'),
  -- 20261115140000_shift_quest_peer_check.
  ('shift_quest_peer_open(text,uuid,boolean)'),
  ('shift_quest_peer_queue(text)'),
  ('shift_quest_peer_view(text,uuid)'),
  ('shift_quest_peer_check(text,uuid,text[],text)'),
  ('shift_quest_peer_list(text,uuid)'),
  ('shift_quest_peer_hide(text,uuid,boolean)'),
  ('shift_quest_project_friends(text,uuid,text)'),
  ('shift_quest_project_invite_friend(text,uuid,uuid)'),
  -- 20261118100000_shift_quest_web_everything.
  ('shift_quest_inbox_list(text,boolean)'),
  ('shift_quest_help_mine(text)'),
  ('shift_quest_help_withdraw(text,uuid)'),
  ('shift_quest_update_prefs(text,boolean,smallint[],smallint,boolean)'),
  ('shift_quest_contribution_respond(text,uuid,boolean,text)'),
  ('shift_quest_share_get(text,uuid)'),
  ('shift_quest_share_confirm(text,uuid)'),
  ('shift_quest_share_cancel(text,uuid)'),
  ('shift_quest_share_respond(text,uuid,boolean)'),
  ('shift_quest_data_export(text)'),
  ('shift_quest_data_request(text,text,text)'),
  ('shift_quest_project_teammates(text)'),
  ('shift_quest_islanders(text,text)'),
  ('shift_quest_share_draft(text,text,text,uuid,uuid)'),
  ('shift_quest_milestone_submit_team(text,smallint,text,text,text,text,uuid[])'),
  ('shift_quest_side_submit_team(text,uuid,text,text,text,text,uuid[])'),
  ('shift_quest_review_queue(text)'),
  ('shift_quest_review_get(text,uuid)'),
  ('shift_quest_review_decide(text,uuid,text,text,boolean)'),
  ('shift_quest_proposal_get(text,uuid)'),
  ('shift_quest_proposal_agree(text,uuid,text,text)'),
  ('shift_quest_help_queue(text)'),
  ('shift_quest_help_update(text,uuid,text,text)'),
  ('shift_quest_awards_pending(text)'),
  ('shift_quest_issue_award(text,uuid)'),
  ('shift_quest_fulfill_queue(text)'),
  ('shift_quest_fulfill_update(text,uuid,text,text)'),
  ('shift_quest_admin_web_status(text)'),
  ('shift_quest_admin_setting(text,text,text)'),
  ('shift_quest_admin_members(text,text)'),
  ('shift_quest_admin_member(text,uuid)'),
  ('shift_quest_admin_member_role(text,uuid,text,boolean)'),
  ('shift_quest_admin_member_recognize(text,uuid,integer,text,text,uuid)'),
  ('shift_quest_admin_member_award(text,uuid,text,text,uuid)'),
  ('shift_quest_admin_member_consent_reset(text,uuid)'),
  ('shift_quest_admin_reverse(text,uuid,integer,text,text)'),
  ('shift_quest_admin_report(text,integer)'),
  ('shift_quest_admin_rule(text,text,integer,integer,text,text,text,text)'),
  ('shift_quest_admin_rule_retire(text,text)'),
  ('shift_quest_admin_templates(text)'),
  ('shift_quest_admin_template_state(text,text,boolean)'),
  ('shift_quest_admin_template_rule(text,text,text)'),
  ('shift_quest_admin_catalog_list(text)'),
  ('shift_quest_admin_catalog(text,uuid,text,text,integer,integer,boolean)'),
  ('shift_quest_admin_catalog_gate(text,uuid,smallint,boolean)'),
  ('shift_quest_admin_seasons(text)'),
  ('shift_quest_admin_season(text,text,date,date,date,smallint,smallint,smallint,integer,date,text,boolean,boolean,smallint)'),
  ('shift_quest_admin_unlock(text,uuid,text,smallint,date,text)'),
  ('shift_quest_admin_island_status(text)'),
  ('shift_quest_admin_island_set(text,text,text)'),
  ('shift_quest_admin_data_requests(text)'),
  ('shift_quest_admin_data_close(text,uuid,boolean)'),
  ('shift_quest_admin_erase(text,uuid)'),
  -- 20261118110000_shift_quest_island_visitors.
  ('shift_quest_island_visitors(text)')
), web_applied AS (
  SELECT to_regprocedure('public.shift_quest_board(text)') IS NOT NULL AS yes
)
SELECT 'function ' || sig || ': ' || role || ' can execute it' FROM fns, roles
WHERE has_function_privilege(role, oid, 'EXECUTE')
UNION ALL
SELECT 'function ' || sig || ': shift_quest_bot cannot execute it' FROM fns
WHERE for_bot AND NOT has_function_privilege('shift_quest_bot', oid, 'EXECUTE')
UNION ALL
SELECT 'function ' || sig || ': a helper or website-only function shift_quest_bot can execute' FROM fns
WHERE NOT for_bot AND has_function_privilege('shift_quest_bot', oid, 'EXECUTE')
UNION ALL
SELECT 'function ' || sig || ': a helper shift_quest_web can execute' FROM fns
WHERE helper AND has_function_privilege('shift_quest_web', oid, 'EXECUTE')
UNION ALL
SELECT 'function ' || sig || ': shift_quest_web can execute it but it is not on the web allowlist' FROM fns
WHERE NOT helper AND has_function_privilege('shift_quest_web', oid, 'EXECUTE')
  AND sig NOT IN (SELECT sig FROM web_allow)
UNION ALL
SELECT 'function ' || w.sig || ': on the web allowlist but shift_quest_web cannot execute it'
FROM web_allow w, web_applied a
WHERE a.yes AND NOT EXISTS (
  SELECT 1 FROM fns f WHERE f.sig = w.sig AND has_function_privilege('shift_quest_web', f.oid, 'EXECUTE')
)
UNION ALL
SELECT 'table ' || relname || ': row level security is off' FROM rels
WHERE relkind IN ('r', 'p') AND NOT relrowsecurity
UNION ALL
SELECT 'table ' || relname || ': ' || role || ' has a privilege on it'
FROM rels, (SELECT role FROM roles UNION ALL SELECT 'shift_quest_bot') r
WHERE has_table_privilege(role, oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
UNION ALL
SELECT 'relation ' || n.nspname || '.' || c.relname || ': shift_quest_web has a privilege on it'
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND n.nspname NOT LIKE 'pg\_toast%'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
  AND CASE WHEN c.relkind = 'S' THEN has_sequence_privilege('shift_quest_web', c.oid, 'USAGE, SELECT, UPDATE')
      ELSE has_table_privilege('shift_quest_web', c.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') END
UNION ALL
-- Both logins are members of PUBLIC: a SECURITY DEFINER function outside
-- shift_quest_* that still grants EXECUTE to PUBLIC would be reachable. This
-- sandbox has none; the runbook runs the same check on production.
SELECT 'function ' || p.oid::regprocedure::text || ': ' || r.role || ' can execute it (outside shift_quest_*)'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
  (VALUES ('shift_quest_web'), ('shift_quest_bot')) r(role)
WHERE n.nspname = 'public' AND p.proname NOT LIKE 'shift\_quest\_%' AND p.prosecdef
  AND has_function_privilege(r.role, p.oid, 'EXECUTE')
ORDER BY 1;
SQL
)"
  if [ -n "$problems" ]; then
    echo "FAIL: privileges in $1 after a single pass:" >&2
    echo "$problems" | sed 's/^/  /' >&2
    exit 1
  fi
  echo "ok - $1: grants (bot, website, Data API) and row level security as intended"
}

echo "# migrations"
for f in "${MIGRATIONS[@]}"; do echo "apply $(basename "$f")"; done
new_db once
apply once "single pass" "${MIGRATIONS[@]}"
for DB in rules island flows islandflows board canvas campfire live player roots tree reset evidence peer treepost webeverything visitors news newsmissed campfirecall; do
  new_db "$DB"
  apply "$DB" "first pass" "${MIGRATIONS[@]}"
  apply "$DB" "second pass" "${MIGRATIONS[@]}"
done
# The suites written before consent (20261111095000) expect names and shares
# without it: they run with consent_required off. player.ts tests both.
for DB in rules island flows islandflows board canvas campfire live; do
  "${PSQL[@]}" -d "$DB" -c "UPDATE public.shift_quest_settings SET consent_required = false WHERE id" >/dev/null
done
if [ "${#WAVE1[@]}" -lt "${#MIGRATIONS[@]}" ]; then
  new_db wave1
  apply wave1 "wave 1 alone" "${WAVE1[@]}"
fi
"${PSQL[@]}" -d postgres -c "ALTER ROLE shift_quest_bot WITH LOGIN PASSWORD 'local-test-only'"
"${PSQL[@]}" -d postgres -c "ALTER ROLE shift_quest_web WITH LOGIN PASSWORD 'local-test-only'"

echo "# single pass"
check_privileges once
# The runbook's read-only production checks (step C, run after every
# `supabase db push`) on the same single pass: every row they print is a
# problem, so a migration that moves the schema version or adds a function
# without updating them fails here, not on production after the push.
prod_checks="$("${PSQL[@]}" -d once -At -f "$ROOT/docs/runbooks/shift-high-island-checks.sql")"
if [ -n "$prod_checks" ]; then
  echo "FAIL: docs/runbooks/shift-high-island-checks.sql reports problems on the single pass:" >&2
  echo "$prod_checks" | sed 's/^/  /' >&2
  exit 1
fi
echo "ok - once: the runbook's production checks (docs/runbooks/shift-high-island-checks.sql) print no row"
catalog once >"$DATA/catalog-once.txt"
catalog rules >"$DATA/catalog-twice.txt"
if ! diff -u "$DATA/catalog-once.txt" "$DATA/catalog-twice.txt" >"$DATA/catalog.diff"; then
  echo "FAIL: applying the migrations twice leaves a different catalog than applying them once:" >&2
  head -n 40 "$DATA/catalog.diff" >&2
  exit 1
fi
echo "ok - once and twice give the same catalog ($(wc -l <"$DATA/catalog-once.txt" | tr -d ' ') entries, sha256 $(sha12 <"$DATA/catalog-once.txt"))"

echo "# wave 1 alone"
if [ "${#WAVE1[@]}" -eq "${#MIGRATIONS[@]}" ]; then
  echo "skip - no shift_quest migration after $WAVE1_LAST yet"
else
  check_privileges wave1
  IFS='|' read -r missing seasons < <("${PSQL[@]}" -d wave1 -At <<'SQL'
SELECT
  (SELECT string_agg(name, ', ' ORDER BY name)
   FROM (VALUES ('shift_quest_island'), ('shift_quest_island_map'), ('shift_quest_milestone_submit')) f(name)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = f.name)),
  (SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_season%');
SQL
)
  [ -z "$missing" ] || { echo "FAIL: wave 1 alone lacks $missing" >&2; exit 1; }
  [ -z "$seasons" ] || { echo "FAIL: wave 1 alone already creates $seasons" >&2; exit 1; }
  echo "ok - wave 1 (${#WAVE1[@]} files) has the island core and no season tables"
fi

export SHIFT_QUESTS_TEST_DISPOSABLE=1
db_url() { echo "postgresql://postgres@127.0.0.1:$PORT/$1"; }
bot_url() { echo "postgresql://shift_quest_bot:local-test-only@127.0.0.1:$PORT/$1"; }
web_url() { echo "postgresql://shift_quest_web:local-test-only@127.0.0.1:$PORT/$1"; }
# Every suite runs even after one fails, so one run shows every failure.
FAILED=()
suite() {
  echo "# $1"
  SHIFT_QUESTS_TEST_DATABASE_URL="$(db_url "$2")" SHIFT_QUESTS_BOT_DATABASE_URL="$(bot_url "$2")" \
    SHIFT_QUESTS_WEB_DATABASE_URL="$(web_url "$2")" \
    "$ROOT/node_modules/.bin/tsx" "$HERE/$3" || FAILED+=("$1")
}

suite "database rules" rules db_rules.ts
suite "island rules" island island_rules.ts
suite "bot flows" flows bot_flows.ts
suite "island flows" islandflows island_flows.ts
suite "web board" board web_board.ts
suite "web canvas link" canvas web_canvas.ts
suite "campfire" campfire campfire.ts
suite "live post" live live.ts
suite "player, economy, news and consent" player player.ts
suite "roots" roots roots.ts
suite "tree" tree tree.ts
suite "admin reset" reset reset.ts
suite "photo evidence and the team's problem" evidence evidence.ts
suite "peer check" peer peer.ts
suite "tree grew post" treepost tree_post.ts
suite "web does everything but Discord" webeverything web_everything.ts
suite "plaza visitors" visitors visitors.ts
suite "island news daily" news news.ts
suite "island news missed-night note" newsmissed news_missed.ts
suite "campfire call and evening guest" campfirecall campfire_call.ts
# island_rules.ts runs against wave 1 alone once it knows to skip season cases.
if [ "${#WAVE1[@]}" -lt "${#MIGRATIONS[@]}" ] && grep -q SHIFT_QUESTS_WAVE "$HERE/island_rules.ts"; then
  export SHIFT_QUESTS_WAVE=1
  suite "island rules, wave 1 alone" wave1 island_rules.ts
fi

if [ "${#FAILED[@]}" -gt 0 ]; then
  printf 'FAIL: %s\n' "${FAILED[@]}" >&2
  exit 1
fi
echo "# all quest database suites passed"
