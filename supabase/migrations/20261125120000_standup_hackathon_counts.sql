-- Hackathon totals for the morning standup card.
--
-- Until 31 December the focus is the Elemental hackathon (company-brain
-- decision of 2026-11-19), so the card leads with hackathon seats, sponsors
-- and voices instead of SHIFT sales. The card's database login,
-- shift_standup_bot (20261118120000), gets one more function. It still owns no
-- tables and is granted none.
--
-- Totals only: no rows, names, contacts, free text or IDs. Seats count every
-- member of a paid sign-up, as on /admin/hackathon/elemental. Cancelled
-- sign-ups count nothing.
--
-- Prod-first apply: additive and idempotent.

CREATE OR REPLACE FUNCTION public.standup_hackathon_counts(p_event_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH regs AS (
    SELECT status, member_count, source,
           (coalesce(paid_at, created_at) AT TIME ZONE 'Asia/Bangkok')::date AS paid_day,
           created_at
    FROM public.hackathon_event_registrations
    WHERE event_slug = p_event_slug
      AND status <> 'cancelled'
  ),
  today AS (SELECT (now() AT TIME ZONE 'Asia/Bangkok')::date AS d),
  board AS (
    SELECT kind, stage, element
    FROM public.hackathon_pipeline
    WHERE event_slug = p_event_slug
  )
  SELECT jsonb_build_object(
    'seats', jsonb_build_object(
      'paid', coalesce((SELECT sum(member_count) FROM regs WHERE status = 'paid'), 0),
      'paid_signups', (SELECT count(*) FROM regs WHERE status = 'paid'),
      'paid_today', coalesce((SELECT sum(member_count) FROM regs, today
                              WHERE status = 'paid' AND paid_day = today.d), 0),
      'paid_yesterday', coalesce((SELECT sum(member_count) FROM regs, today
                                  WHERE status = 'paid' AND paid_day = today.d - 1), 0),
      'paid_last_7_days', coalesce((SELECT sum(member_count) FROM regs, today
                                    WHERE status = 'paid' AND paid_day > today.d - 7), 0),
      'unpaid_people', coalesce((SELECT sum(member_count) FROM regs WHERE status = 'pending'), 0),
      'unpaid_older_than_1_day', coalesce((SELECT sum(member_count) FROM regs
                                           WHERE status = 'pending' AND created_at < now() - interval '1 day'), 0),
      'slips_to_check', (SELECT count(*) FROM regs WHERE status = 'review'),
      -- Paid seats by tracked link (?src=), grouped like sourceKey() in the web app.
      'paid_by_source', coalesce((
        SELECT jsonb_object_agg(k, n) FROM (
          SELECT coalesce(nullif(left(lower(trim(source)), 40), ''), 'direct') AS k, sum(member_count) AS n
          FROM regs WHERE status = 'paid'
          GROUP BY 1
        ) s), '{}'::jsonb)
    ),
    'sponsors', jsonb_build_object(
      'signed', (SELECT count(*) FROM board WHERE kind = 'sponsor' AND stage = 'signed'),
      'yes', (SELECT count(*) FROM board WHERE kind = 'sponsor' AND stage = 'yes'),
      'talking', (SELECT count(*) FROM board WHERE kind = 'sponsor' AND stage = 'talking')
    ),
    'voices', jsonb_build_object(
      'elements_covered', coalesce((
        SELECT jsonb_agg(DISTINCT element) FROM board
        WHERE kind = 'speaker' AND stage IN ('yes', 'signed') AND element IS NOT NULL
      ), '[]'::jsonb)
    )
  );
$$;

REVOKE ALL ON FUNCTION public.standup_hackathon_counts(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.standup_hackathon_counts(text) FROM anon;
REVOKE ALL ON FUNCTION public.standup_hackathon_counts(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.standup_hackathon_counts(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.standup_hackathon_counts(text) TO shift_standup_bot;
