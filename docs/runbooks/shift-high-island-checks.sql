-- SHIFT High island: read-only production checks after `supabase db push`.
-- Runbook: docs/runbooks/shift-high-island-rollout.md, step C.
--
--   supabase db query --linked -o table -f docs/runbooks/shift-high-island-checks.sql
--
-- Every row is a problem. No rows: the schema, the grants and row level
-- security are as intended. Changes nothing.
--
-- Same rules as check_privileges in supabase/tests/shift_quests/run-local.sh
-- (keep the web allowlist below in step with it) plus the PUBLIC exposure
-- query in docs/features/shift-high-quests.md ("Web board and shift_quest_web").
WITH fns0 AS (
  SELECT p.oid, p.oid::regprocedure::text AS sig,
    p.proname LIKE 'shift\_quest\_\_%' OR p.proname = 'shift_quest_bootstrap_admin' AS helper,
    -- Website-only entry points (091100, 091200, 093000, 094000, 095000): the bot never runs them.
    p.proname LIKE 'shift\_quest\_canvas\_%'
      OR p.proname IN ('shift_quest_ownership_get', 'shift_quest_campfire', 'shift_quest_island_links')
      OR p.proname IN ('shift_quest_character', 'shift_quest_wallet', 'shift_quest_consent_get',
        'shift_quest_consent_adult', 'shift_quest_consent_link', 'shift_quest_consent_import',
        'shift_quest_consent_parent_view', 'shift_quest_consent_parent_answer',
        'shift_quest_consent_parent_withdraw', 'shift_quest_island_news', 'shift_quest_digest_inputs',
        'shift_quest_digest_save') AS web_only
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
), fns AS (
  SELECT oid, sig, helper, NOT helper AND NOT web_only AS for_bot FROM fns0
), rels AS (
  SELECT c.oid, c.relname, c.relkind, c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname LIKE 'shift\_quest\_%' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
), api_roles(role) AS (VALUES ('anon'), ('authenticated')),
logins(role, connlimit) AS (VALUES ('shift_quest_bot', 5), ('shift_quest_web', 20)),
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
  -- 20261111094000_shift_quest_live.
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
  ('shift_quest_digest_hide(text,integer,boolean,text)')
)
-- The schema: 9 is every migration on this branch (the player, economy and consent, 095000).
SELECT 'schema: shift_quest_schema_version() is ' || coalesce(v::text, 'missing') || ', expected 9' AS problem
FROM (SELECT CASE WHEN to_regprocedure('public.shift_quest_schema_version()') IS NULL THEN NULL
  ELSE public.shift_quest_schema_version() END AS v) s
WHERE v IS DISTINCT FROM 9
UNION ALL
-- The two logins: they exist, NOINHERIT, member of no role, their connection
-- limit and statement_timeout. LOGIN itself is step D, so it is not checked here.
SELECT 'role ' || l.role || ': missing' FROM logins l
WHERE NOT EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = l.role)
UNION ALL
SELECT 'role ' || r.rolname || ': ' || concat_ws(', ',
    CASE WHEN r.rolinherit THEN 'INHERIT (expected NOINHERIT)' END,
    CASE WHEN r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls
      THEN 'has an admin attribute' END,
    CASE WHEN r.rolconnlimit <> l.connlimit THEN 'connection limit ' || r.rolconnlimit || ' (expected ' || l.connlimit || ')' END,
    CASE WHEN NOT coalesce(array_to_string(r.rolconfig, ',') LIKE '%statement_timeout=%', false) THEN 'no statement_timeout' END,
    CASE WHEN EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid) THEN 'is a member of another role' END)
FROM pg_roles r JOIN logins l ON l.role = r.rolname
WHERE r.rolinherit OR r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls
  OR r.rolconnlimit <> l.connlimit
  OR NOT coalesce(array_to_string(r.rolconfig, ',') LIKE '%statement_timeout=%', false)
  OR EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid)
UNION ALL
-- The Data API reaches no shift_quest_* function or table.
SELECT 'function ' || sig || ': ' || role || ' can execute it' FROM fns, api_roles
WHERE has_function_privilege(role, oid, 'EXECUTE')
UNION ALL
-- The bot: every entry point, no helper, no website-only function.
SELECT 'function ' || sig || ': shift_quest_bot cannot execute it' FROM fns
WHERE for_bot AND NOT has_function_privilege('shift_quest_bot', oid, 'EXECUTE')
UNION ALL
SELECT 'function ' || sig || ': a helper or website-only function shift_quest_bot can execute' FROM fns
WHERE NOT for_bot AND has_function_privilege('shift_quest_bot', oid, 'EXECUTE')
UNION ALL
-- The website: exactly the allowlist.
SELECT 'function ' || sig || ': a helper shift_quest_web can execute' FROM fns
WHERE helper AND has_function_privilege('shift_quest_web', oid, 'EXECUTE')
UNION ALL
SELECT 'function ' || sig || ': shift_quest_web can execute it but it is not on the web allowlist' FROM fns
WHERE NOT helper AND has_function_privilege('shift_quest_web', oid, 'EXECUTE')
  AND sig NOT IN (SELECT sig FROM web_allow)
UNION ALL
SELECT 'function ' || w.sig || ': on the web allowlist but shift_quest_web cannot execute it' FROM web_allow w
WHERE NOT EXISTS (
  SELECT 1 FROM fns f WHERE f.sig = w.sig AND has_function_privilege('shift_quest_web', f.oid, 'EXECUTE')
)
UNION ALL
-- Tables: row level security on, and no grant to the Data API or the logins.
SELECT 'table ' || relname || ': row level security is off' FROM rels
WHERE relkind IN ('r', 'p') AND NOT relrowsecurity
UNION ALL
SELECT 'table ' || relname || ': ' || role || ' has a privilege on it'
FROM rels, (SELECT role FROM api_roles UNION ALL SELECT role FROM logins) r
WHERE has_table_privilege(role, oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
UNION ALL
-- Outside shift_quest_*, through PUBLIC: definer functions and tables in public.
-- Fix each with an additive migration (REVOKE ... FROM PUBLIC, then grant the
-- roles that need it) before giving either role LOGIN.
SELECT 'exposed: ' || r.role || ' can execute ' || p.oid::regprocedure::text || ' (security definer, outside shift_quest_*)'
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace, logins r
WHERE n.nspname = 'public' AND p.proname NOT LIKE 'shift\_quest\_%' AND p.prosecdef
  AND has_function_privilege(r.role, p.oid, 'EXECUTE')
UNION ALL
SELECT 'exposed: ' || r.role || ' can read or write ' || c.oid::regclass::text
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, logins r
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND has_table_privilege(r.role, c.oid, 'SELECT, INSERT, UPDATE, DELETE')
ORDER BY 1;
