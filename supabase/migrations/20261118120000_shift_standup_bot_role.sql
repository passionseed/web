-- A least-privilege database login for the morning standup card.
--
-- The card is posted to the staff Discord every morning by a job on the shared
-- CSII host, so the job never holds the service role key. Same model as
-- shift_voice_bot (20261109200000) and shift_quest_bot (20261111090600).
--
-- shift_standup_bot owns no tables and is granted none. It can only execute
-- shift_standup_counts(), which returns totals: no rows, names, contacts,
-- free text or IDs.
--
-- LOGIN and the password are set out of band, never in this public repo:
--   ALTER ROLE shift_standup_bot WITH LOGIN PASSWORD '<SCRAM verifier>';
-- The job connects through the Supavisor pooler as shift_standup_bot.<project ref>.
--
-- Prod-first apply: additive and idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_standup_bot') THEN
    CREATE ROLE shift_standup_bot NOLOGIN NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE shift_standup_bot SET statement_timeout = '10s';
ALTER ROLE shift_standup_bot CONNECTION LIMIT 2;

GRANT USAGE ON SCHEMA public TO shift_standup_bot;

-- Totals for the standup card. Applications with "test" in their UTM source are
-- staff tests and are left out, as in the admin.
CREATE OR REPLACE FUNCTION public.shift_standup_counts(
  p_next_cohort text,
  p_last_cohort text,
  p_feedback_since timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH apps AS (
    SELECT cohort, found_via, paid_at
    FROM public.shift_applications
    WHERE cohort IN (p_next_cohort, p_last_cohort)
      AND coalesce(source, '') NOT ILIKE '%test%'
  )
  SELECT jsonb_build_object(
    'next_round', jsonb_build_object(
      'applications', (SELECT count(*) FROM apps WHERE cohort = p_next_cohort),
      'paid', (SELECT count(*) FROM apps WHERE cohort = p_next_cohort AND paid_at IS NOT NULL),
      'paid_by_found_via', coalesce((
        SELECT jsonb_object_agg(k, n) FROM (
          SELECT coalesce(found_via, '(none)') AS k, count(*) AS n
          FROM apps WHERE cohort = p_next_cohort AND paid_at IS NOT NULL
          GROUP BY 1
        ) s), '{}'::jsonb)
    ),
    'last_round_paid', (SELECT count(*) FROM apps WHERE cohort = p_last_cohort AND paid_at IS NOT NULL),
    'feedback_answers', (SELECT count(*) FROM public.shift_feedback WHERE created_at >= p_feedback_since),
    'island', jsonb_build_object(
      'rsvps', (SELECT count(*) FROM public.shift_island_rsvps),
      'projects_active', (SELECT count(*) FROM public.shift_quest_projects WHERE archived_at IS NULL),
      'submissions', (SELECT count(*) FROM public.shift_quest_submissions),
      'approved', (SELECT count(*) FROM public.shift_quest_submissions WHERE status = 'approved'),
      'pending', (SELECT count(*) FROM public.shift_quest_submissions WHERE status = 'pending')
    )
  );
$$;

REVOKE ALL ON FUNCTION public.shift_standup_counts(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shift_standup_counts(text, text, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.shift_standup_counts(text, text, timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.shift_standup_counts(text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_standup_counts(text, text, timestamptz) TO shift_standup_bot;
