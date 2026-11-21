-- Elemental core: RLS, grants, the elemental_bot role, and no change to whiteboard_* or shift_quest_*.
\ir helpers.psql
SELECT pg_temp.setup();

CREATE TEMP VIEW el_tables AS
  SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'elemental\_%';
CREATE TEMP VIEW el_functions AS
  SELECT p.oid, p.oid::regprocedure AS sig, p.proname, p.prosecdef, p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname LIKE 'elemental\_%';

-- Every table: RLS on, an admin-only SELECT policy, nothing for anon, authenticated or elemental_bot.
DO $$
DECLARE
  bad text;
BEGIN
  ASSERT (SELECT count(*) FROM el_tables) = 14, 'expected 14 elemental tables, got ' || (SELECT count(*) FROM el_tables);
  SELECT string_agg(relname, ', ') INTO bad FROM el_tables t
  WHERE NOT (SELECT relrowsecurity FROM pg_class WHERE oid = t.oid);
  ASSERT bad IS NULL, 'RLS off on ' || bad;
  SELECT string_agg(relname, ', ') INTO bad FROM el_tables t
  WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.relname
                    AND p.cmd = 'SELECT' AND p.roles = '{authenticated}' AND p.qual LIKE '%admin%');
  ASSERT bad IS NULL, 'no admin-only SELECT policy on ' || bad;
  SELECT string_agg(relname || ':' || r || ':' || priv, ', ') INTO bad
  FROM el_tables t,
       unnest(ARRAY['anon', 'authenticated', 'elemental_bot']) AS r,
       unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS priv
  WHERE has_table_privilege(r, t.oid, priv);
  ASSERT bad IS NULL, 'table privileges granted: ' || bad;
  -- The policy does not count for anon at all.
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename LIKE 'elemental\_%' AND roles && ARRAY['anon', 'public']::name[]),
    'a policy names anon or public';
  -- service_role keeps its access (staff scripts, server pages).
  ASSERT (SELECT bool_and(has_table_privilege('service_role', t.oid, 'SELECT')) FROM el_tables t), 'service_role cannot read';
END $$;

-- elemental_bot can SELECT no table at all in public (Elemental, registrations, whiteboards, anything).
DO $$
DECLARE
  bad text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO bad
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'auth', 'storage') AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
    AND has_table_privilege('elemental_bot', c.oid, 'SELECT');
  ASSERT bad IS NULL, 'elemental_bot can SELECT ' || bad;
  ASSERT NOT EXISTS (SELECT 1 FROM information_schema.role_column_grants WHERE grantee = 'elemental_bot'), 'column grants to elemental_bot';
END $$;

SET ROLE elemental_bot;
DO $$
BEGIN
  BEGIN
    PERFORM count(*) FROM public.elemental_claims;
    RAISE EXCEPTION 'elemental_bot read elemental_claims';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM count(*) FROM public.hackathon_event_registration_members;
    RAISE EXCEPTION 'elemental_bot read registration members';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM * FROM public.elemental_issue_claims('elemental-2026');
    RAISE EXCEPTION 'elemental_bot ran elemental_issue_claims';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.elemental__pii_kind('x');
    RAISE EXCEPTION 'elemental_bot ran a helper';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- What it may do, it can (SECURITY DEFINER, no table grants needed).
  ASSERT public.elemental_bot_settings_get('800000000000000001') ->> 'edition' = 'elemental-2026', 'bot cannot read its settings';
  ASSERT public.elemental_bot_settings_get('800000000000000009') IS NULL, 'unknown guild should be NULL';
  ASSERT public.elemental_bot_member_get('800000000000000001', '900000000000000001') IS NULL, 'member_get as the bot';
END $$;
RESET ROLE;

-- Function privileges: elemental_bot only on elemental_bot_*; service_role on the rest but not helpers; nobody else.
DO $$
DECLARE
  bad text;
BEGIN
  ASSERT (SELECT count(*) FROM el_functions WHERE proname LIKE 'elemental\_bot\_%') >= 28, 'elemental_bot_* functions missing';
  SELECT string_agg(sig::text, ', ') INTO bad FROM el_functions
  WHERE has_function_privilege('elemental_bot', oid, 'EXECUTE') <> (proname LIKE 'elemental\_bot\_%' AND proname NOT LIKE 'elemental\_bot\_\_%');
  ASSERT bad IS NULL, 'elemental_bot EXECUTE is wrong on ' || bad;
  SELECT string_agg(sig::text, ', ') INTO bad FROM el_functions
  WHERE has_function_privilege('anon', oid, 'EXECUTE') OR has_function_privilege('authenticated', oid, 'EXECUTE');
  ASSERT bad IS NULL, 'anon or authenticated may execute ' || bad;
  SELECT string_agg(sig::text, ', ') INTO bad FROM el_functions f
  WHERE EXISTS (SELECT 1 FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid = f.oid), acldefault('f', 10))) a WHERE a.grantee = 0);
  ASSERT bad IS NULL, 'PUBLIC may execute ' || bad;
  -- The five service_role entry points.
  SELECT string_agg(s, ', ') INTO bad FROM unnest(ARRAY[
    'public.elemental_issue_claims(text)', 'public.elemental_issue_rehearsal_claims(text,integer)',
    'public.elemental_island_public(text)', 'public.elemental_reset_edition(text,text)',
    'public.elemental_purge_edition(text,text)']) AS s
  WHERE NOT has_function_privilege('service_role', s::regprocedure, 'EXECUTE')
     OR has_function_privilege('elemental_bot', s::regprocedure, 'EXECUTE');
  ASSERT bad IS NULL, 'service_role function grants wrong on ' || bad;
  -- Helpers: no one but the owner, except the four pure CHECK helpers for service_role.
  SELECT string_agg(sig::text, ', ') INTO bad FROM el_functions
  WHERE proname LIKE 'elemental\_\_%'
    AND has_function_privilege('service_role', oid, 'EXECUTE')
       <> (proname IN ('elemental__elements', 'elemental__is_snowflake', 'elemental__valid_schedule', 'elemental__valid_card_override'));
  ASSERT bad IS NULL, 'helper grants wrong on ' || bad;
  -- Every entry point is SECURITY DEFINER with a pinned search_path.
  SELECT string_agg(sig::text, ', ') INTO bad FROM el_functions
  WHERE proname NOT LIKE 'elemental\_\_%' AND (NOT prosecdef OR NOT EXISTS (SELECT 1 FROM unnest(proconfig) c WHERE c LIKE 'search_path=%'));
  ASSERT bad IS NULL, 'not SECURITY DEFINER with search_path: ' || bad;
END $$;

-- The role itself.
DO $$
BEGIN
  ASSERT (SELECT NOT rolcanlogin AND NOT rolinherit AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole AND NOT rolcreatedb
          FROM pg_roles WHERE rolname = 'elemental_bot'), 'elemental_bot role attributes';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = 'elemental_bot'),
    'elemental_bot is a member of another role';
  ASSERT EXISTS (SELECT 1 FROM pg_db_role_setting s JOIN pg_roles r ON r.oid = s.setrole
                 WHERE r.rolname = 'elemental_bot' AND 'statement_timeout=10s' = ANY (s.setconfig)), 'statement_timeout';
END $$;

-- The service role may write rows directly (staff scripts seed settings and boards).
SET ROLE service_role;
INSERT INTO public.elemental_editions (key, kind) VALUES ('elemental-sr-probe', 'rehearsal');
UPDATE public.elemental_settings SET schedule = '{"2026-12-04": {"opening_at": "19:00", "call_at": "19:55", "card_at": "20:30"}}'
WHERE guild_id = '800000000000000001';
RESET ROLE;

-- whiteboard_* and shift_quest_* functions are byte-identical (definition and grants)
-- before and after this migration runs again.
CREATE TEMP TABLE before_defs AS
  SELECT p.oid::regprocedure::text AS sig, md5(pg_get_functiondef(p.oid)) AS def, coalesce(p.proacl::text, '') AS acl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND (p.proname LIKE 'whiteboard\_%' OR p.proname LIKE 'shift\_quest\_%') AND p.prokind = 'f';
\ir ../../../migrations/20261123100000_elemental_core.sql
DO $$
DECLARE
  changed text;
BEGIN
  ASSERT (SELECT count(*) FROM before_defs) >= 5 AND EXISTS (SELECT 1 FROM before_defs WHERE sig LIKE 'whiteboard_merge_elements(%'),
    'expected the whiteboard functions to be present';
  SELECT string_agg(coalesce(b.sig, a.sig), ', ') INTO changed
  FROM before_defs b
  FULL JOIN (
    SELECT p.oid::regprocedure::text AS sig, md5(pg_get_functiondef(p.oid)) AS def, coalesce(p.proacl::text, '') AS acl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND (p.proname LIKE 'whiteboard\_%' OR p.proname LIKE 'shift\_quest\_%') AND p.prokind = 'f'
  ) a ON a.sig = b.sig
  WHERE a.sig IS NULL OR b.sig IS NULL OR a.def <> b.def OR a.acl <> b.acl;
  ASSERT changed IS NULL, 'whiteboard_* or shift_quest_* changed: ' || changed;
END $$;
