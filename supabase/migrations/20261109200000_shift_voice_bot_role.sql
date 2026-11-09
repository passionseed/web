-- A least-privilege database login for the SHIFT voice bot.
--
-- The bot runs on a shared server, so it should not hold the service role
-- key: that key reads every table, students' personal data included. This
-- role can call four functions and nothing else. It owns no tables and is
-- granted none, so it cannot read or change any row directly.
--
-- LOGIN and the password are set out of band, never in this public repo:
--   ALTER ROLE shift_voice_bot WITH LOGIN PASSWORD '<SCRAM verifier>';
-- The bot connects through the Supavisor pooler as shift_voice_bot.<project ref>.
--
-- Prod-first apply: additive and idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_voice_bot') THEN
    CREATE ROLE shift_voice_bot NOLOGIN NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE shift_voice_bot SET statement_timeout = '10s';
ALTER ROLE shift_voice_bot CONNECTION LIMIT 5;

/**
 * The bot's roster: linked, non-declined applications for the given rounds.
 * Only the columns it needs, so the bot never sees names, contacts or answers.
 */
CREATE OR REPLACE FUNCTION public.shift_voice_roster(p_cohorts text[])
RETURNS TABLE (
  application_id uuid,
  cohort text,
  discord_user_id text,
  paid boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.cohort, a.discord_user_id, a.paid_at IS NOT NULL, a.created_at
  FROM public.shift_applications a
  WHERE a.cohort = ANY (p_cohorts)
    AND a.status <> 'declined'
    AND a.discord_user_id IS NOT NULL;
$$;

GRANT USAGE ON SCHEMA public TO shift_voice_bot;

DO $$
DECLARE
  fn text;
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.shift_voice_roster(text[]) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.shift_voice_roster(text[]) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.shift_voice_roster(text[]) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.shift_voice_roster(text[]) TO service_role';

  FOREACH fn IN ARRAY ARRAY[
    'public.shift_voice_roster(text[])',
    'public.shift_voice_transition(text, text, uuid, text, text, text, boolean, boolean, boolean, boolean, timestamptz)',
    'public.shift_voice_beat(timestamptz)',
    'public.shift_voice_close_all()'
  ]
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO shift_voice_bot', fn);
  END LOOP;
END;
$$;
