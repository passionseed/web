-- A least-privilege database login for the SHIFT High quest bot.
--
-- Same model as shift_voice_bot (20261109200000): the bot runs on a shared
-- host, so it never holds the service role key. This role owns no tables and
-- is granted none; it can only execute the shift_quest_* entry points, which
-- check the caller's rights themselves. Internal helpers (shift_quest__*)
-- and shift_quest_bootstrap_admin are not granted.
--
-- No shift_quest_* function is callable through the Data API: every one is
-- revoked from PUBLIC, anon and authenticated, because they trust the Discord
-- user ID they are given.
--
-- LOGIN and the password are set out of band, never in this public repo:
--   ALTER ROLE shift_quest_bot WITH LOGIN PASSWORD '<SCRAM verifier>';
-- The bot connects through the Supavisor pooler as shift_quest_bot.<project ref>.
--
-- Prod-first apply: additive and idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_bot') THEN
    CREATE ROLE shift_quest_bot NOLOGIN NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE shift_quest_bot SET statement_timeout = '10s';
ALTER ROLE shift_quest_bot CONNECTION LIMIT 5;

GRANT USAGE ON SCHEMA public TO shift_quest_bot;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    IF fn.proname NOT LIKE 'shift\_quest\_\_%' AND fn.proname <> 'shift_quest_bootstrap_admin' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO shift_quest_bot', fn.sig);
    END IF;
  END LOOP;
END;
$$;
