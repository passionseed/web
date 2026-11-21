-- SHIFT High Island: the come-back DM and the return card (code name away).
--
-- Design: docs/designs/shift-island-away.md (founder, 2026-11-21: "bot should
-- be able to dm and ask why haven't u updated or checked in. Cuz we need
-- improvement. But ask for consent first."). Safeguarding section 4
-- (docs/project/PROJECTSEED-SAFEGUARDING.md:274-288) forbids a bot DM that
-- asks a student a question or collects a reply, consent or not, so the
-- founder approved this shape (2026-11-21):
--
--   1. Consent first, on the island (never in a DM): may the bot send one
--      short DM if I am away for N days? Stored per member (away_dm, null =
--      never asked), changeable on the island and in Discord /settings.
--   2. The DM is content-free: the bot owns its words (kind 'away', params
--      '{}'): a title, one line, one Link button to the island. No question,
--      no day count, no project.
--   3. The question lives on the island: when any student comes back after
--      a stretch of at least N days away, a card asks once what took their
--      time (six one-tap reasons, an optional line of 140 characters at most).
--      Closing it is a skip; it never reopens for that stretch.
--   4. Admins read counts by reason and the lines without names, by week.
--      Mentors (reviewers) never see answers and nobody replies. Lines are
--      cleared after 90 days. Only an audited admin action reveals who wrote
--      a line, for a safeguarding concern.
--
-- "Activity" is the Bangkok day of the member's latest write: a journal row
-- (a check-in tap or a note), a quest started, a submission, a work session
-- started or ended (its intention and reflection), a help request, an
-- evidence photo, a peer check; floored at onboarded_at and at the day before
-- the active season started (the break between seasons is never time away).
-- The end of a hold also starts a fresh stretch (shift_quest__away_hold_end):
-- a decision on work they waited on (a mentor's review or appeal decision, or
-- a withdrawal, on their own quests and their team's milestone quests) and a
-- quest of theirs resumed or archived (the end of a rest), so time spent
-- waiting on us or resting is never time away. Browsing, voice and the deep
-- fire leave no record and do not count. No column and no history of days
-- away is stored: it is computed when read (shift_quest__away_last).
--
-- This file adds:
--
--   * shift_quest_members.away_dm (null: never asked) and away_dm_at (when
--     the member last chose). shift_quest_settings.away_enabled (the switch,
--     off by default: /admin feature away through shift_quest__set_feature),
--     away_after_days (N, 7, 3 to 21) and away_hour (the Bangkok hour the
--     DMs are queued, 17, 9 to 19). While the switch is off the island shows
--     no strip, settings line or card, and no DM is queued or sent.
--   * shift_quest_away_answers: one row per member and stretch (gap_from, the
--     last active day before the stretch), the reason (one of six, or null:
--     a skip), the optional line, whether an 'away' DM for that stretch was
--     sent. Row level security on, no policies, service_role only.
--   * shift_quest_away_state(actor) (website and bot): {enabled, days, dm,
--     ask_consent, ask_return: {gap_from} or null}. Same gate as
--     shift_quest_campfire ('sq:not_started'). ask_consent: switch on, a
--     student, never asked, at least one journal row. ask_return: switch on
--     inside an active season that covers today, a student, not resting (a
--     paused quest and none active), not waiting on a mentor (a quest of
--     theirs, or a milestone quest of a team they are active on, submitted or
--     appealed), no hold that ended today, the latest active day before today
--     (Bangkok) is at least N days back, and no answer for it yet.
--     Staff: dm null, ask_consent false, ask_return null.
--   * shift_quest_away_set(actor, on) (website and bot): students only (staff
--     'sq:not_allowed'), sets away_dm and away_dm_at, audits away_dm_on or
--     away_dm_off; off also drops pending or blocked 'away' DMs (as
--     shift_quest_update_prefs does for nudges). Returns the new state.
--   * shift_quest_away_answer(actor, gap_from, reason, line) (website only):
--     the gap must be the one the card was shown for ('sq:not_found'
--     otherwise, switch off or no season included), the reason one of the six or null
--     ('sq:bad_input'), the line trimmed, empty to null, 140 characters at
--     most ('sq:text_too_long'). {saved: false} when that stretch already has
--     an answer. Audited away_answer, never the text.
--   * shift_quest_admin_away(actor) (website only, admins only): counts of
--     consent, students away now, 'away' DMs and answers, each an integer or
--     "1-2" when it is 1 or 2, and the lines of the last 90 days with their
--     week (a Monday) and reason. Never a member id, name, plot or date.
--   * shift_quest_admin_away_reveal(actor, answer) (website only, admins
--     only): the writer's display name (or the island's 'ไม่ระบุชื่อ') of a
--     line still shown, audited away_reveal with the answer id.
--   * shift_quest_enqueue_away(now) (the bot's, every tick from schema 23):
--     clears lines older than 90 days, then, only while the switch is on, at
--     away_hour Bangkok and inside an active season, queues one 'away' DM
--     (dedupe 'away:<member>:<last active day>', so at most one per stretch)
--     for each student who said yes, is onboarded and not erased, is not
--     resting or waiting on a mentor, has been away N days or more (time on
--     hold and the break between seasons never count), has not
--     answered the card for that stretch, and got no 'away' DM in 14 days.
--     shift_quest_update_prefs' notify_dm never counts.
--   * shift_quest_outbox_claim (20261111090400's body): the DM CASE made
--     explicit. 'reminder' as before, 'nudge' notify_dm as before (the old
--     ELSE), 'away' shift_quest__away_due (the consent, the switch and an
--     active season, a student, 09:00 to 19:59 Bangkok, still away on the
--     stretch it was queued for, not resting or waiting, no answer for it),
--     any other kind false. A DM that fails its check is dropped
--     ('opted_out'), as before.
--   * shift_quest__set_feature (20261118150000 plus 'away'),
--     shift_quest_admin_status (20261120120000 plus away_enabled; the
--     website's shift_quest_admin_web_status passes it through),
--     shift_quest__island_erase and shift_quest__island_export
--     (20261118150000 plus the answers and the choice: /data exports
--     "away": {dm, decided_at, answers}), shift_quest_admin_reset_self
--     (20261115120000 plus the caller's own answers and choice), each its
--     latest body with only the away lines added.
--   * shift_quest_schema_version() = 23. 22 is
--     20261120120000_shift_quest_deep_fire: apply it first, so the version
--     only goes up. The bot queues 'away' DMs only from 23; the website still
--     needs 6 and shows no strip or card before this file
--     (shift_quest_away_state missing, SQLSTATE 42883, logged once).
--
-- Grants are per function in this file, with no grant loop: the enqueue is
-- the bot's, the state and the choice are the bot's and the website's, the
-- answer and the two admin reads are the website's only, every helper
-- (shift_quest__away_*) is nobody's. Any later file that repeats the bot
-- grant loop of 20261111090600_shift_quest_bot_role must exclude
-- shift_quest_away_answer, shift_quest_admin_away and
-- shift_quest_admin_away_reveal, and any later web allowlist must list the
-- five website functions. Mirrored in supabase/tests/shift_quests/
-- run-local.sh (check_privileges), db_rules.ts, web_board.ts, web_canvas.ts,
-- away.ts and docs/runbooks/shift-high-island-checks.sql.
--
-- Deploy order: this file on the founder's go, after schema 22 is in
-- production, then the website and the bot (each also copes with an older
-- database: the website shows no strip or card on 42883, the bot queues
-- nothing below 23). The switch stays off until the Thai copy has had the
-- three-model review; then /admin feature away.
--
-- Prod-first apply: additive and idempotent (ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE;
-- replaced functions keep their signatures and grants). No existing CHECK is
-- touched: the outbox's kind CHECK already takes 'away'. Never references the
-- whiteboard tables or auth.users: the quest sandbox (bot/quests-sandbox.sh,
-- run-local.sh) has neither.

-- ---------------------------------------------------------------------------
-- Columns, the answers table, indexes
-- ---------------------------------------------------------------------------

-- The member's choice: true (yes), false (no), null (never asked), and when it was made.
ALTER TABLE public.shift_quest_members ADD COLUMN IF NOT EXISTS away_dm boolean NULL;
ALTER TABLE public.shift_quest_members ADD COLUMN IF NOT EXISTS away_dm_at timestamptz NULL;

-- The switch (/admin feature away), N and the Bangkok hour the DMs are queued.
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS away_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.shift_quest_settings
  ADD COLUMN IF NOT EXISTS away_after_days smallint NOT NULL DEFAULT 7 CHECK (away_after_days BETWEEN 3 AND 21);
ALTER TABLE public.shift_quest_settings
  ADD COLUMN IF NOT EXISTS away_hour smallint NOT NULL DEFAULT 17 CHECK (away_hour BETWEEN 9 AND 19);

CREATE TABLE IF NOT EXISTS public.shift_quest_away_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  -- The last active day before the stretch (Bangkok): one answer per stretch.
  gap_from date NOT NULL,
  -- Null: a skip (the card was closed).
  reason text NULL CHECK (reason IN ('busy', 'stuck', 'unclear', 'team', 'island', 'break')),
  -- Cleared after 90 days (shift_quest_enqueue_away).
  line text NULL CHECK (line IS NULL OR char_length(line) <= 140),
  -- An 'away' DM for this stretch was sent.
  came_by_dm boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, gap_from)
);

CREATE INDEX IF NOT EXISTS shift_quest_away_answers_created ON public.shift_quest_away_answers (created_at);

COMMENT ON TABLE public.shift_quest_away_answers IS
  'SHIFT High return card: why a student was away (one of six reasons or a skip) and an optional line, one row per stretch. Admins read counts and lines without names; lines are cleared after 90 days.';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_away_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_away_answers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_away_answers TO service_role;

-- The 14-day cooldown and the claim read a member's 'away' DMs.
CREATE INDEX IF NOT EXISTS shift_quest_outbox_away
  ON public.shift_quest_outbox (member_id, created_at) WHERE kind = 'away';

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: no login runs them)
-- ---------------------------------------------------------------------------

/**
 * When the member's latest hold ended (see shift_quest__away_held), or null:
 * a decision on work they were waiting on (submissions.decided_at: a mentor's
 * review or appeal decision, or a withdrawal), on their own quests and on the
 * milestone quests of a team they are active on; or a quest of theirs resumed
 * or archived (the 'quest_resume' and 'quest_archive' audit rows: the end of
 * a rest). Ending a hold writes nothing else the stretch counts, so without
 * this every day spent waiting on us or resting would count as days away the
 * moment the hold ended (design decision 6).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__away_hold_end(p_member uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(x.at)
  FROM (
    SELECT max(s.decided_at) AS at
    FROM public.shift_quest_instances i
    JOIN public.shift_quest_submissions s ON s.instance_id = i.id
    WHERE i.member_id = p_member
    UNION ALL
    -- The team's milestone quests (one open per project and milestone, held by whoever started it).
    SELECT max(s.decided_at)
    FROM public.shift_quest_project_members pm
    JOIN public.shift_quest_instances i ON i.project_id = pm.project_id AND i.milestone IS NOT NULL
    JOIN public.shift_quest_submissions s ON s.instance_id = i.id
    WHERE pm.member_id = p_member AND pm.status = 'active'
    UNION ALL
    -- Waking from a rest, or putting a paused quest away (shift_quest_rest off, shift_quest_resume
    -- and an archive all go through shift_quest_set_state, which audits 'quest_<action>').
    SELECT max(a.created_at)
    FROM public.shift_quest_instances i
    JOIN public.shift_quest_audit a
      ON a.resource_type = 'quest' AND a.resource_id = i.id AND a.action IN ('quest_resume', 'quest_archive')
    WHERE i.member_id = p_member
  ) x;
$$;

/**
 * The member's latest active day strictly before p_before (Bangkok): the
 * latest of their journal rows, quests started, submissions, work sessions
 * (started or ended), help requests, evidence photos and peer checks, and
 * the end of their latest hold (shift_quest__away_hold_end), floored at
 * their onboarding day and at the day before the active season started.
 * Null when even that is not before p_before. p_before = today gives the
 * stretch the return card asks about; today + 1 gives the latest active day,
 * today included.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__away_last(p_member uuid, p_before date)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max((x.at AT TIME ZONE 'Asia/Bangkok')::date)
  FROM (
    SELECT m.onboarded_at AS at FROM public.shift_quest_members m WHERE m.id = p_member
    UNION ALL
    -- The break between seasons is never time away: a stretch starts no earlier than the season.
    SELECT public.shift_quest__bkk_start((public.shift_quest__active_season()).starts_on - 1)
    UNION ALL
    -- Time on hold (waiting on a mentor, resting) is never time away: a stretch starts again when it ends.
    SELECT public.shift_quest__away_hold_end(p_member)
    UNION ALL
    SELECT max(g.created_at) FROM public.shift_quest_progress g
    WHERE g.member_id = p_member AND g.created_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(i.created_at) FROM public.shift_quest_instances i
    WHERE i.member_id = p_member AND i.created_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(s.created_at) FROM public.shift_quest_submissions s
    WHERE s.submitted_by = p_member AND s.created_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(w.started_at) FROM public.shift_quest_work_sessions w
    WHERE w.member_id = p_member AND w.started_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(w.ended_at) FROM public.shift_quest_work_sessions w
    WHERE w.member_id = p_member AND w.ended_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(h.created_at) FROM public.shift_quest_help_requests h
    WHERE h.member_id = p_member AND h.created_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(e.created_at) FROM public.shift_quest_evidence_photos e
    WHERE e.member_id = p_member AND e.created_at < public.shift_quest__bkk_start(p_before)
    UNION ALL
    SELECT max(c.created_at) FROM public.shift_quest_peer_checks c
    WHERE c.peer_id = p_member AND c.created_at < public.shift_quest__bkk_start(p_before)
  ) x
  WHERE x.at < public.shift_quest__bkk_start(p_before);
$$;

/**
 * Why a member is left alone: 'waiting' (a quest of theirs, or a milestone
 * quest of a team they are active on, is submitted or appealed: a delay we
 * cause is never theirs to explain), 'resting' (a paused quest and none
 * active or in clarification, as the island's own 'resting'), or null.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__away_held(p_member uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      WHERE i.member_id = p_member AND i.state IN ('submitted', 'appealed')
    ) OR EXISTS (
      -- A milestone quest is the team's (one open per project and milestone, held by whoever
      -- started it): a teammate waits on the mentor too.
      SELECT 1
      FROM public.shift_quest_project_members pm
      JOIN public.shift_quest_instances i ON i.project_id = pm.project_id AND i.milestone IS NOT NULL
      WHERE pm.member_id = p_member AND pm.status = 'active' AND i.state IN ('submitted', 'appealed')
    ) THEN 'waiting'
    WHEN EXISTS (
      SELECT 1 FROM public.shift_quest_instances i WHERE i.member_id = p_member AND i.state = 'paused'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      WHERE i.member_id = p_member AND i.state IN ('active', 'clarification')
    ) THEN 'resting'
  END;
$$;

/**
 * The stretch the return card asks about on p_today: the latest active day
 * before p_today, when it is away_after_days or more back, the member is
 * neither resting nor waiting on a mentor, and no hold of theirs ended on
 * p_today (a mentor's decision or the end of a rest starts a fresh stretch,
 * so there is nothing to ask about that day); else null. Whether it was
 * already answered, the switch, the season and who the member is are the
 * callers' checks.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__away_gap(p_member uuid, p_today date)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := COALESCE((public.shift_quest__settings()).away_after_days, 7);
  v_gap date := public.shift_quest__away_last(p_member, p_today);
BEGIN
  IF v_gap IS NULL OR p_today - v_gap < v_days OR public.shift_quest__away_held(p_member) IS NOT NULL
     -- away_last counts a hold's end only from the next day: the day it ends asks nothing either.
     OR COALESCE(public.shift_quest__away_hold_end(p_member) >= public.shift_quest__bkk_start(p_today), false) THEN
    RETURN NULL;
  END IF;
  RETURN v_gap;
END;
$$;

/** Whether 'away' DMs may go on p_day: the switch on and an active season that covers the day. */
CREATE OR REPLACE FUNCTION public.shift_quest__away_live(p_day date)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
BEGIN
  RETURN COALESCE((public.shift_quest__settings()).away_enabled, false)
    AND v_season.id IS NOT NULL
    AND p_day BETWEEN v_season.starts_on AND v_season.ends_on;
END;
$$;

/** The dedupe key of the 'away' DM for a member's stretch: 'away:<member>:<YYYY-MM-DD>'. */
CREATE OR REPLACE FUNCTION public.shift_quest__away_key(p_member uuid, p_day date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 'away:' || p_member::text || ':' || to_char(p_day, 'YYYY-MM-DD');
$$;

/** A count for the admin report: the integer, or "1-2" when it is 1 or 2. */
CREATE OR REPLACE FUNCTION public.shift_quest__away_n(p_n bigint)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN p_n IN (1, 2) THEN to_jsonb('1-2'::text) ELSE to_jsonb(COALESCE(p_n, 0)) END;
$$;

/** The state shift_quest_away_state and shift_quest_away_set answer with (see the header). */
CREATE OR REPLACE FUNCTION public.shift_quest__away_json(p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_on boolean := COALESCE(s.away_enabled, false);
  v_m public.shift_quest_members;
  v_student boolean;
  v_gap date;
BEGIN
  SELECT * INTO v_m FROM public.shift_quest_members WHERE id = p_member;
  v_student := FOUND AND cardinality(v_m.roles) = 0 AND v_m.onboarded_at IS NOT NULL AND v_m.erased_at IS NULL;
  -- The card only inside an active season that covers today (away_live includes the switch):
  -- the break between seasons is never asked about.
  IF v_student AND public.shift_quest__away_live(public.shift_quest__bkk_today()) THEN
    v_gap := public.shift_quest__away_gap(p_member, public.shift_quest__bkk_today());
    IF EXISTS (
      SELECT 1 FROM public.shift_quest_away_answers a WHERE a.member_id = p_member AND a.gap_from = v_gap
    ) THEN
      v_gap := NULL;
    END IF;
  END IF;
  RETURN jsonb_build_object(
    'enabled', v_on,
    'days', s.away_after_days,
    'dm', CASE WHEN v_student THEN v_m.away_dm END,
    'ask_consent', v_on AND v_student AND v_m.away_dm IS NULL
      AND EXISTS (SELECT 1 FROM public.shift_quest_progress g WHERE g.member_id = p_member),
    'ask_return', CASE WHEN v_gap IS NOT NULL THEN jsonb_build_object('gap_from', v_gap) END
  );
END;
$$;

/**
 * The outbox claim's check for an 'away' DM at p_now: the member said yes,
 * the switch is on inside an active season, they are a student (onboarded,
 * not erased, no role), it is 09:00 to 19:59 in Bangkok, and they are still
 * away on the stretch the DM was queued for (no write and no end of a hold
 * since that day, no answer to the card for it, not resting, not waiting on
 * a mentor).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__away_due(p_member uuid, p_dedupe text, p_now timestamptz)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local timestamp := p_now AT TIME ZONE 'Asia/Bangkok';
  v_m public.shift_quest_members;
  v_day date;
BEGIN
  SELECT * INTO v_m FROM public.shift_quest_members WHERE id = p_member;
  IF NOT FOUND OR v_m.away_dm IS NOT TRUE OR v_m.erased_at IS NOT NULL OR v_m.onboarded_at IS NULL
     OR cardinality(v_m.roles) > 0
     OR NOT public.shift_quest__away_live(v_local::date)
     OR extract(hour FROM v_local) NOT BETWEEN 9 AND 19
     OR p_dedupe IS NULL OR p_dedupe !~ ('^away:' || p_member::text || ':[0-9]{4}-[0-9]{2}-[0-9]{2}$') THEN
    RETURN false;
  END IF;
  v_day := to_date(split_part(p_dedupe, ':', 3), 'YYYY-MM-DD');
  RETURN COALESCE(
    public.shift_quest__away_last(p_member, v_local::date + 1) = v_day
      AND public.shift_quest__away_held(p_member) IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_away_answers a WHERE a.member_id = p_member AND a.gap_from = v_day
      ),
    false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- The island: the state, the choice, the answer
-- ---------------------------------------------------------------------------

/**
 * The come-back state for the island and Discord /settings (see the header).
 * Same gate as shift_quest_campfire: a null or unknown actor, or one who has
 * not finished /start and holds no role, is 'sq:not_started'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_away_state(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  RETURN public.shift_quest__away_json(v_member.id);
END;
$$;

/**
 * A student's answer to the consent strip, or a change in settings: may the
 * bot send one short DM after N days away. Staff are 'sq:not_allowed', a
 * null answer 'sq:bad_input'. No also drops 'away' DMs still queued for
 * them. Audited away_dm_on or away_dm_off. Returns the new state.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_away_set(p_actor text, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  IF cardinality(v_member.roles) > 0 THEN
    PERFORM public.shift_quest__fail('not_allowed');
  END IF;
  IF p_on IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  UPDATE public.shift_quest_members
  SET away_dm = p_on, away_dm_at = now(), updated_at = now()
  WHERE id = v_member.id;

  -- A no also cancels anything already queued (as shift_quest_update_prefs for nudges).
  IF NOT p_on THEN
    UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'opted_out'
    WHERE member_id = v_member.id AND kind = 'away' AND status IN ('pending', 'blocked');
  END IF;

  PERFORM public.shift_quest__audit(v_member.id, CASE WHEN p_on THEN 'away_dm_on' ELSE 'away_dm_off' END,
                                    'member', v_member.id);
  RETURN public.shift_quest__away_json(v_member.id);
END;
$$;

/**
 * The return card's answer (or its skip: reason and line null). p_gap_from
 * must be the stretch the card is shown for now, answered or not
 * ('sq:not_found' otherwise, also while the switch is off, outside an active
 * season and for staff).
 * The reason is one of the six or null ('sq:bad_input'); the line is
 * trimmed, empty becomes null, and over 140 characters is
 * 'sq:text_too_long'. {saved: false} when the stretch already has an answer
 * (the first one stays). came_by_dm: an 'away' DM for this stretch was sent.
 * Audited away_answer, never the reason or the line.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_away_answer(p_actor text, p_gap_from date, p_reason text, p_line text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_line text := NULLIF(btrim(p_line, E' \t\r\n'), '');
  v_gap date;
  v_id uuid;
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  IF p_reason IS NOT NULL AND p_reason NOT IN ('busy', 'stuck', 'unclear', 'team', 'island', 'break') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF char_length(v_line) > 140 THEN
    PERFORM public.shift_quest__fail('text_too_long');
  END IF;

  -- The same gate as the card: the switch on, inside an active season that covers today.
  IF cardinality(v_member.roles) = 0 AND public.shift_quest__away_live(public.shift_quest__bkk_today()) THEN
    v_gap := public.shift_quest__away_gap(v_member.id, public.shift_quest__bkk_today());
  END IF;
  IF v_gap IS NULL OR p_gap_from IS NULL OR v_gap <> p_gap_from THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;

  INSERT INTO public.shift_quest_away_answers (member_id, gap_from, reason, line, came_by_dm)
  VALUES (v_member.id, v_gap, p_reason, v_line, EXISTS (
    SELECT 1 FROM public.shift_quest_outbox o
    WHERE o.dedupe_key = public.shift_quest__away_key(v_member.id, v_gap) AND o.kind = 'away' AND o.status = 'sent'
  ))
  ON CONFLICT (member_id, gap_from) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    PERFORM public.shift_quest__audit(v_member.id, 'away_answer', 'member', v_member.id);
  END IF;
  RETURN jsonb_build_object('saved', v_id IS NOT NULL);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admins: counts and nameless lines, and the audited reveal
-- ---------------------------------------------------------------------------

/**
 * The come-back report, admins only (reviewers are 'sq:not_authorized'):
 *   consent: students (onboarded, not erased, no role) by choice;
 *   away_now: students away N days or more today, by why they are left
 *     alone (resting, waiting on a mentor, other);
 *   dms: every 'away' DM by outcome (queued, sent, unreachable: failed,
 *     dropped);
 *   answers: by reason, skipped (no reason picked), came_by_dm;
 *   lines: the non-empty lines of the last 90 days, {id, week (the Monday,
 *     Bangkok), reason, line}, newest week first, in id order within a week.
 * Every count is an integer, or "1-2" when it is 1 or 2. Never a member id,
 * name, plot or exact date.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_away(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_days integer := COALESCE((public.shift_quest__settings()).away_after_days, 7);
  v_today date := public.shift_quest__bkk_today();
  v_consent jsonb;
  v_away jsonb;
  v_dms jsonb;
  v_answers jsonb;
  v_lines jsonb;
BEGIN
  WITH students AS (
    SELECT m.id, m.away_dm FROM public.shift_quest_members m
    WHERE cardinality(m.roles) = 0 AND m.onboarded_at IS NOT NULL AND m.erased_at IS NULL
  ),
  away AS (
    SELECT public.shift_quest__away_held(st.id) AS held FROM students st
    WHERE v_today - public.shift_quest__away_last(st.id, v_today + 1) >= v_days
  )
  SELECT
    (SELECT jsonb_build_object(
       'yes', public.shift_quest__away_n(count(*) FILTER (WHERE away_dm IS TRUE)),
       'no', public.shift_quest__away_n(count(*) FILTER (WHERE away_dm IS FALSE)),
       'unasked', public.shift_quest__away_n(count(*) FILTER (WHERE away_dm IS NULL)))
     FROM students),
    (SELECT jsonb_build_object(
       'resting', public.shift_quest__away_n(count(*) FILTER (WHERE held = 'resting')),
       'waiting', public.shift_quest__away_n(count(*) FILTER (WHERE held = 'waiting')),
       'other', public.shift_quest__away_n(count(*) FILTER (WHERE held IS NULL)))
     FROM away)
  INTO v_consent, v_away;

  SELECT jsonb_build_object(
    'queued', public.shift_quest__away_n(count(*) FILTER (WHERE o.status IN ('pending', 'sending', 'blocked'))),
    'sent', public.shift_quest__away_n(count(*) FILTER (WHERE o.status = 'sent')),
    'unreachable', public.shift_quest__away_n(count(*) FILTER (WHERE o.status = 'failed')),
    'dropped', public.shift_quest__away_n(count(*) FILTER (WHERE o.status = 'dropped'))
  ) INTO v_dms
  FROM public.shift_quest_outbox o WHERE o.kind = 'away' AND o.target_kind = 'dm';

  SELECT jsonb_build_object(
    'by_reason', jsonb_build_object(
      'busy', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason = 'busy')),
      'stuck', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason = 'stuck')),
      'unclear', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason = 'unclear')),
      'team', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason = 'team')),
      'island', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason = 'island')),
      'break', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason = 'break'))
    ),
    'skipped', public.shift_quest__away_n(count(*) FILTER (WHERE a.reason IS NULL)),
    'came_by_dm', public.shift_quest__away_n(count(*) FILTER (WHERE a.came_by_dm))
  ) INTO v_answers
  FROM public.shift_quest_away_answers a;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', l.id, 'week', l.week, 'reason', l.reason, 'line', l.line)
                            ORDER BY l.week DESC, l.id), '[]'::jsonb)
  INTO v_lines
  FROM (
    SELECT a.id, date_trunc('week', a.created_at AT TIME ZONE 'Asia/Bangkok')::date AS week, a.reason, a.line
    FROM public.shift_quest_away_answers a
    WHERE a.line IS NOT NULL AND a.created_at >= now() - interval '90 days'
  ) l;

  RETURN jsonb_build_object(
    'consent', v_consent,
    'away_now', v_away,
    'dms', v_dms,
    'answers', v_answers,
    'lines', v_lines
  );
END;
$$;

/**
 * Who wrote a line, for a safeguarding concern: admins only, a line still
 * shown in the report (non-empty, last 90 days; else 'sq:not_found').
 * {name: the writer's display name, or 'ไม่ระบุชื่อ'}. Audited away_reveal
 * with the answer id.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_away_reveal(p_actor text, p_answer uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_name text;
BEGIN
  SELECT COALESCE(m.display_name, 'ไม่ระบุชื่อ') INTO v_name
  FROM public.shift_quest_away_answers a
  JOIN public.shift_quest_members m ON m.id = a.member_id
  WHERE a.id = p_answer AND a.line IS NOT NULL AND a.created_at >= now() - interval '90 days';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'away_reveal', 'away_answer', p_answer);
  RETURN jsonb_build_object('name', v_name);
END;
$$;

-- ---------------------------------------------------------------------------
-- The bot: queueing the DMs
-- ---------------------------------------------------------------------------

/**
 * The bot's tick (from schema 23). Clears lines older than 90 days, whatever
 * the switch. Then only while the switch is on, at away_hour (Bangkok) and
 * inside an active season, queues one 'away' DM (params '{}') for each
 * student who said yes and is away N days or more (see the header); dedupe
 * 'away:<member>:<last active day>' keeps it to one per stretch. Returns how
 * many it queued.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_enqueue_away(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_local timestamp := p_now AT TIME ZONE 'Asia/Bangkok';
  v_today date := (p_now AT TIME ZONE 'Asia/Bangkok')::date;
  v_count integer;
BEGIN
  UPDATE public.shift_quest_away_answers SET line = NULL
  WHERE line IS NOT NULL AND created_at < p_now - interval '90 days';

  IF NOT COALESCE(s.away_enabled, false)
     OR extract(hour FROM v_local) <> s.away_hour
     OR NOT public.shift_quest__away_live(v_today) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind, params)
  SELECT public.shift_quest__away_key(x.id, x.last_day), 'dm', x.id, 'away', '{}'::jsonb
  FROM (
    SELECT m.id, public.shift_quest__away_last(m.id, v_today + 1) AS last_day
    FROM public.shift_quest_members m
    WHERE m.away_dm IS TRUE AND m.erased_at IS NULL AND m.discord_user_id IS NOT NULL
      AND m.onboarded_at IS NOT NULL AND cardinality(m.roles) = 0
      AND public.shift_quest__away_held(m.id) IS NULL
      -- At most one per 14 days (a dropped one never went out).
      AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_outbox o
        WHERE o.member_id = m.id AND o.kind = 'away' AND o.status <> 'dropped'
          AND o.created_at > p_now - interval '14 days'
      )
  ) x
  WHERE v_today - x.last_day >= s.away_after_days
    -- Answering the card for this stretch is coming back.
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_away_answers a WHERE a.member_id = x.id AND a.gap_from = x.last_day
    )
  ORDER BY x.id
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- The latest bodies plus the away lines only
-- ---------------------------------------------------------------------------

/**
 * Leases due messages to the bot. Channels and DM recipients are resolved
 * here, at send time: a message for an unconfigured channel is parked as
 * 'blocked' (released when the channel is set), and one about an erased
 * member or for someone who opted out is dropped.
 * (20261111090400_shift_quests_admin_functions' body, with the DM CASE made
 * explicit and the 'away' kind of 20261121090000.)
 */
CREATE OR REPLACE FUNCTION public.shift_quest_outbox_claim(p_limit integer)
RETURNS TABLE (
  id uuid, kind text, params jsonb, channel_id text, dm_user_id text,
  member_user_id text, peer_user_id text, attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_row public.shift_quest_outbox;
  v_channel text;
  v_dm text;
  v_member text;
  v_peer text;
BEGIN
  FOR v_row IN
    SELECT o.* FROM public.shift_quest_outbox o
    WHERE (o.status = 'pending' AND o.next_attempt_at <= now())
       OR (o.status = 'sending' AND o.lease_until < now())
    ORDER BY o.created_at
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
    FOR UPDATE SKIP LOCKED
  LOOP
    v_channel := NULL; v_dm := NULL; v_member := NULL; v_peer := NULL;

    IF v_row.params ? 'member_id' AND v_row.params ->> 'member_id' IS NOT NULL THEN
      SELECT m.discord_user_id INTO v_member FROM public.shift_quest_members m
      WHERE m.id = (v_row.params ->> 'member_id')::uuid;
      IF v_member IS NULL THEN
        UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'member_gone' WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    END IF;
    IF v_row.params ? 'peer_member_id' AND v_row.params ->> 'peer_member_id' IS NOT NULL THEN
      SELECT m.discord_user_id INTO v_peer FROM public.shift_quest_members m
      WHERE m.id = (v_row.params ->> 'peer_member_id')::uuid;
      IF v_peer IS NULL THEN
        UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'member_gone' WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    END IF;

    IF v_row.target_kind = 'dm' THEN
      SELECT m.discord_user_id INTO v_dm FROM public.shift_quest_members m
      WHERE m.id = v_row.member_id
        AND m.erased_at IS NULL
        AND CASE v_row.kind
              WHEN 'reminder' THEN m.reminders_opt_in AND s.reminders_enabled
              WHEN 'nudge' THEN m.notify_dm
              -- 20261121090000_shift_quest_away: the come-back DM, checked again at send time.
              WHEN 'away' THEN public.shift_quest__away_due(m.id, v_row.dedupe_key, now())
              ELSE false
            END;
      IF v_dm IS NULL THEN
        UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'opted_out' WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    ELSE
      v_channel := CASE v_row.channel_key
        WHEN 'help' THEN s.help_channel_id
        WHEN 'staff' THEN s.staff_channel_id
        WHEN 'celebrate' THEN s.celebrate_channel_id
        WHEN 'coworking' THEN s.coworking_channel_id
      END;
      -- Shared posts also stop while sharing is paused, and wait for it.
      IF v_channel IS NULL OR (v_row.channel_key IN ('celebrate', 'coworking') AND NOT s.sharing_enabled) THEN
        UPDATE public.shift_quest_outbox SET status = 'blocked',
          last_error = CASE WHEN v_channel IS NULL THEN 'channel_not_configured' ELSE 'sharing_paused' END
        WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    END IF;

    UPDATE public.shift_quest_outbox
    SET status = 'sending', lease_until = now() + interval '2 minutes', attempts = shift_quest_outbox.attempts + 1
    WHERE shift_quest_outbox.id = v_row.id;

    id := v_row.id; kind := v_row.kind; params := v_row.params; channel_id := v_channel; dm_user_id := v_dm;
    member_user_id := v_member; peer_user_id := v_peer; attempts := v_row.attempts + 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

/**
 * 'squads' (20261111090800_shift_quests_seasons), plus 'campfire_call' and
 * 'campfire_call_ping' (20261118150000), plus 'away' (20261121090000), on or
 * off. No blockers: none needs anything published first. Reached through
 * shift_quest_admin_set's ELSE branch, which audits 'settings_<key>'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__set_feature(p_key text, p_on boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_key = 'squads' THEN
    UPDATE public.shift_quest_settings SET squads_enabled = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  IF p_key = 'campfire_call' THEN
    UPDATE public.shift_quest_settings SET campfire_call_enabled = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  IF p_key = 'campfire_call_ping' THEN
    UPDATE public.shift_quest_settings SET campfire_call_ping = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  -- 20261121090000_shift_quest_away: the come-back DM and the return card.
  IF p_key = 'away' THEN
    UPDATE public.shift_quest_settings SET away_enabled = COALESCE(p_on, false) WHERE id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

/** 20261120120000_shift_quest_deep_fire's body, plus away_enabled (20261121090000). */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  s public.shift_quest_settings := public.shift_quest__settings();
BEGIN
  RETURN jsonb_build_object(
    'settings', jsonb_build_object(
      'student_role_ids', to_jsonb(s.student_role_ids),
      'help_channel_id', s.help_channel_id,
      'staff_channel_id', s.staff_channel_id,
      'celebrate_channel_id', s.celebrate_channel_id,
      'coworking_channel_id', s.coworking_channel_id,
      -- 20261111094000_shift_quest_live.
      'live_channel_id', s.live_channel_id,
      'suggest_channel_id', s.suggest_channel_id,
      -- 20261118130000_shift_quest_island_news_daily.
      'news_channel_id', s.news_channel_id,
      -- 20261120120000_shift_quest_deep_fire: the deep fire's lobby.
      'deepfire_channel_id', s.deepfire_channel_id,
      'awards_enabled', s.awards_enabled,
      'redemption_enabled', s.redemption_enabled,
      'sharing_enabled', s.sharing_enabled,
      'reminders_enabled', s.reminders_enabled,
      'reward_terms', s.reward_terms IS NOT NULL,
      'redemption_terms', s.redemption_terms IS NOT NULL,
      'fulfillment_process', s.fulfillment_process IS NOT NULL,
      'fulfillment_owner', s.fulfillment_owner,
      -- 20261111090800_shift_quests_seasons (off before it; hook in 20261111090700).
      'squads_enabled', COALESCE((public.shift_quest__feature_flags() ->> 'squads')::boolean, false),
      -- 20261118150000_shift_quest_campfire_call.
      'campfire_call_enabled', s.campfire_call_enabled,
      'campfire_call_ping', s.campfire_call_ping,
      -- 20261121090000_shift_quest_away: the come-back DM and the return card.
      'away_enabled', s.away_enabled
    ),
    'live', jsonb_build_object(
      'awards', public.shift_quest__awards_live(),
      'redemption', public.shift_quest__redemption_live()
    ),
    'blockers', public.shift_quest__blockers(),
    'rules', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', key, 'version', version, 'amount', amount,
                                          'cap', cap_per_member, 'team_allocation', team_allocation) ORDER BY key)
      FROM public.shift_quest_reward_rules WHERE status = 'published'
    ), '[]'::jsonb),
    'staff', jsonb_build_object(
      'admin', (SELECT count(*) FROM public.shift_quest_members WHERE 'admin' = ANY (roles)),
      'reviewer', (SELECT count(*) FROM public.shift_quest_members WHERE 'reviewer' = ANY (roles)),
      'fulfillment', (SELECT count(*) FROM public.shift_quest_members WHERE 'fulfillment' = ANY (roles))
    ),
    'outbox', jsonb_build_object(
      'pending', (SELECT count(*) FROM public.shift_quest_outbox WHERE status IN ('pending', 'sending')),
      'blocked', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'blocked'),
      'failed', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'failed')
    ),
    'data_requests_open', (SELECT count(*) FROM public.shift_quest_data_requests WHERE status = 'open')
  );
END;
$$;

/**
 * 20261118150000_shift_quest_campfire_call's erasure hook, plus
 * (20261121090000) the member's return answers (reasons and lines) and their
 * come-back DM choice.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__island_erase(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_squad_members SET status = 'left', responded_at = now()
  WHERE member_id = p_member AND status IN ('active', 'invited');
  UPDATE public.shift_quest_squads SET name = '[erased]', target = '[erased]'
  WHERE created_by = p_member AND (name <> '[erased]' OR target <> '[erased]');
  UPDATE public.shift_quest_inbox SET params = params || '{"name": "[erased]"}'::jsonb
  WHERE kind = 'squad_invite'
    AND ref_id IN (SELECT id FROM public.shift_quest_squads WHERE created_by = p_member);
  -- 20261111095000_shift_quest_player: the consent row, and every AI summary
  -- of a project the member was ever on or contributed to (they were written
  -- from evidence the erasure clears, and go back to the model as 'previous').
  DELETE FROM public.shift_quest_consents WHERE member_id = p_member;
  DELETE FROM public.shift_quest_digests
  WHERE project_id IN (
    SELECT project_id FROM public.shift_quest_project_members WHERE member_id = p_member
    UNION
    SELECT i.project_id
    FROM public.shift_quest_contributions c
    JOIN public.shift_quest_submissions s ON s.id = c.submission_id
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE c.member_id = p_member AND i.project_id IS NOT NULL
    UNION
    SELECT i.project_id
    FROM public.shift_quest_submissions s
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE s.submitted_by = p_member AND i.project_id IS NOT NULL
  );
  -- 20261115130000_shift_quest_evidence_photos: the member's photos.
  DELETE FROM public.shift_quest_evidence_photos WHERE member_id = p_member;
  -- 20261115140000_shift_quest_peer_check: the checks the member wrote (their words about others' work).
  DELETE FROM public.shift_quest_peer_checks WHERE peer_id = p_member;
  -- 20261118150000_shift_quest_campfire_call: the evening guest's rows (the
  -- team sat at the fire tonight, and its roll) and drop gifts of the teams
  -- they leave empty (shift_quest_admin_erase sets
  -- their memberships to 'left' before this runs).
  DELETE FROM public.shift_quest_guest_drops d
  WHERE d.project_id IN (SELECT pm.project_id FROM public.shift_quest_project_members pm WHERE pm.member_id = p_member)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm WHERE pm.project_id = d.project_id AND pm.status = 'active'
    );
  DELETE FROM public.shift_quest_tree_gifts g
  WHERE g.source LIKE 'drop:%'
    AND g.project_id IN (SELECT pm.project_id FROM public.shift_quest_project_members pm WHERE pm.member_id = p_member)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm WHERE pm.project_id = g.project_id AND pm.status = 'active'
    );
  -- A staff member who was a night's guest: their name leaves that night (the guest stays 'mentor').
  UPDATE public.shift_quest_guest_nights n
  SET staff_names = array_remove(n.staff_names, v.name)
  FROM (
    SELECT public.shift_quest__staff_name(m.display_name) AS name
    FROM public.shift_quest_members m WHERE m.id = p_member
  ) v
  WHERE v.name IS NOT NULL AND v.name = ANY (n.staff_names);
  -- 20261121090000_shift_quest_away: the return answers (reasons and lines)
  -- and the come-back DM choice.
  DELETE FROM public.shift_quest_away_answers WHERE member_id = p_member;
  UPDATE public.shift_quest_members SET away_dm = NULL, away_dm_at = NULL
  WHERE id = p_member AND (away_dm IS NOT NULL OR away_dm_at IS NOT NULL);
END;
$$;

/**
 * 20261118150000_shift_quest_campfire_call's export hook, plus
 * (20261121090000) "away": the come-back DM choice (dm: true, false or null,
 * decided_at) and the member's return answers {gap_from, reason, line,
 * created_at}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__island_export(p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'recognitions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('category', g.category, 'reason', g.reason, 'amount', g.amount,
                                          'created_at', g.created_at) ORDER BY g.created_at)
      FROM public.shift_quest_recognitions g WHERE g.member_id = p_member
    ), '[]'::jsonb),
    'season_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', u.label, 'earned_at', e.earned_at) ORDER BY e.earned_at)
      FROM public.shift_quest_season_unlock_earned e JOIN public.shift_quest_season_unlocks u ON u.id = e.unlock_id
      WHERE e.member_id = p_member
    ), '[]'::jsonb),
    'squads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', q.name, 'target', q.target, 'starts_on', q.starts_on,
                                          'ends_on', q.ends_on, 'status', sm.status) ORDER BY q.created_at)
      FROM public.shift_quest_squad_members sm JOIN public.shift_quest_squads q ON q.id = sm.squad_id
      WHERE sm.member_id = p_member
    ), '[]'::jsonb),
    -- 20261111095000_shift_quest_player.
    'island_consent', (
      SELECT jsonb_build_object('state', c.state, 'basis', c.basis, 'ai', c.ai_ok,
                                'notice_version', c.notice_version, 'decided_at', c.decided_at)
      FROM public.shift_quest_consents c WHERE c.member_id = p_member
    ),
    -- 20261115130000_shift_quest_evidence_photos: what is stored, never the image.
    'evidence_photos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('quest', i.title, 'revision', s.revision, 'bytes', p.bytes,
                                          'width', p.width, 'height', p.height, 'created_at', p.created_at)
                       ORDER BY p.created_at)
      FROM public.shift_quest_evidence_photos p
      JOIN public.shift_quest_submissions s ON s.id = p.submission_id
      JOIN public.shift_quest_instances i ON i.id = s.instance_id
      WHERE p.member_id = p_member
    ), '[]'::jsonb),
    -- 20261115140000_shift_quest_peer_check: the checks the member wrote.
    'peer_checks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('quest', i.title, 'revision', s.revision, 'ticked', to_jsonb(c.ticked),
                                          'line', c.line, 'hidden', c.hidden_at IS NOT NULL, 'created_at', c.created_at)
                       ORDER BY c.created_at)
      FROM public.shift_quest_peer_checks c
      JOIN public.shift_quest_submissions s ON s.id = c.submission_id
      JOIN public.shift_quest_instances i ON i.id = s.instance_id
      WHERE c.peer_id = p_member
    ), '[]'::jsonb),
    -- 20261118150000_shift_quest_campfire_call: the tree gifts the member
    -- earned (a campfire round's, a quest's) on any team, and the evening
    -- guest's drop:<day> gifts of the member's active teams (no member: the
    -- team's). Never a teammate's own gift: its source names their work
    -- session and its times say when they closed a round.
    'tree_gifts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('project', p.name, 'source', g.source, 'options', to_jsonb(g.options),
                                          'picked', g.picked, 'created_at', g.created_at, 'picked_at', g.picked_at)
                       ORDER BY g.created_at, g.id)
      FROM public.shift_quest_tree_gifts g
      JOIN public.shift_quest_projects p ON p.id = g.project_id
      WHERE g.member_id = p_member
         OR (g.member_id IS NULL AND g.source LIKE 'drop:%' AND g.project_id IN (
           SELECT pm.project_id FROM public.shift_quest_project_members pm
           WHERE pm.member_id = p_member AND pm.status = 'active'
         ))
    ), '[]'::jsonb),
    -- Tonight's evening guest rows of the member's active teams: which team
    -- sat at the fire during the guest's rest and its roll (deleted the next day).
    'campfire_guest', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', d.day, 'project', p.name, 'guest', d.guest, 'look', d.look)
                       ORDER BY d.day, p.name)
      FROM public.shift_quest_guest_drops d
      JOIN public.shift_quest_projects p ON p.id = d.project_id
      WHERE d.project_id IN (
        SELECT pm.project_id FROM public.shift_quest_project_members pm
        WHERE pm.member_id = p_member AND pm.status = 'active'
      )
    ), '[]'::jsonb),
    -- 20261121090000_shift_quest_away: the come-back DM choice and the return answers.
    'away', (
      SELECT jsonb_build_object(
        'dm', m.away_dm,
        'decided_at', m.away_dm_at,
        'answers', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('gap_from', a.gap_from, 'reason', a.reason, 'line', a.line,
                                              'created_at', a.created_at) ORDER BY a.created_at, a.gap_from)
          FROM public.shift_quest_away_answers a WHERE a.member_id = p_member
        ), '[]'::jsonb)
      )
      FROM public.shift_quest_members m WHERE m.id = p_member
    )
  );
END;
$$;

/**
 * 20261115120000_shift_quest_admin_reset_self's body, plus (20261121090000)
 * the caller's own return answers and come-back DM choice.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_reset_self(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_project uuid;
  v_solo boolean := false;
  v_quests uuid[];
  v_kept integer;
  v_submissions uuid[];
  v_reviews uuid[];
  v_appeals uuid[];
  v_help uuid[];
  v_shares uuid[];
  v_refs text[];
  v_progress integer;
  v_ledger integer;
BEGIN
  -- The current project, and whether the caller is its only active member.
  SELECT p.id INTO v_project
  FROM public.shift_quest_projects p
  WHERE p.id = v_me.current_project_id AND p.archived_at IS NULL;
  IF v_project IS NOT NULL THEN
    v_solo := NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members pm
      WHERE pm.project_id = v_project AND pm.member_id <> v_me.id AND pm.status = 'active'
    );
  END IF;

  -- 1. The caller's quests (the ones reset): every state, except an approved
  -- one on a project that is not being archived (a team's tree stage).
  SELECT COALESCE(array_agg(i.id ORDER BY i.id), '{}') INTO v_quests
  FROM public.shift_quest_instances i
  WHERE i.member_id = v_me.id
    AND (i.state <> 'approved' OR i.project_id IS NULL OR (v_solo AND i.project_id = v_project));
  PERFORM 1 FROM public.shift_quest_instances WHERE id = ANY (v_quests) ORDER BY id FOR UPDATE;
  SELECT count(*) INTO v_kept FROM public.shift_quest_instances
  WHERE member_id = v_me.id AND NOT (id = ANY (v_quests));

  -- 2. The current project's plot (an approval in progress there finishes first).
  IF v_project IS NOT NULL THEN
    PERFORM public.shift_quest__lock_plot(v_project);
  END IF;

  -- 3. The member.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_me.id FOR NO KEY UPDATE;

  -- Never half a reset: an award (or a reversal) on one of these quests, or
  -- another member's follow-up quest built on one, stops it here.
  IF EXISTS (SELECT 1 FROM public.shift_quest_ledger WHERE instance_id = ANY (v_quests))
     OR EXISTS (
       SELECT 1 FROM public.shift_quest_instances
       WHERE parent_instance_id = ANY (v_quests) AND member_id <> v_me.id
     ) THEN
    PERFORM public.shift_quest__fail('reset_blocked');
  END IF;
  SELECT count(*) INTO v_ledger FROM public.shift_quest_ledger WHERE member_id = v_me.id;

  SELECT COALESCE(array_agg(id), '{}') INTO v_submissions
  FROM public.shift_quest_submissions WHERE instance_id = ANY (v_quests);
  SELECT COALESCE(array_agg(id), '{}') INTO v_reviews
  FROM public.shift_quest_reviews WHERE submission_id = ANY (v_submissions);
  SELECT COALESCE(array_agg(id), '{}') INTO v_appeals
  FROM public.shift_quest_appeals WHERE instance_id = ANY (v_quests) OR submission_id = ANY (v_submissions);
  SELECT COALESCE(array_agg(id), '{}') INTO v_help
  FROM public.shift_quest_help_requests WHERE member_id = v_me.id;
  SELECT COALESCE(array_agg(id), '{}') INTO v_shares
  FROM public.shift_quest_shares WHERE member_id = v_me.id;
  -- Every id a queued message or a notice can name (dedupe keys such as
  -- review:<submission>, reviewed:<review>, appeal:<id>, proposal:<quest>,
  -- help:<id>, share:<id>).
  SELECT COALESCE(array_agg(x::text), '{}') INTO v_refs
  FROM unnest(v_quests || v_submissions || v_reviews || v_appeals || v_help || v_shares) AS x;

  -- Messages still queued about them are dropped (kept, as erasure keeps
  -- them); one already sent stays as it is. So are DM nudges to the caller.
  UPDATE public.shift_quest_outbox o
  SET status = 'dropped', last_error = 'reset'
  WHERE o.status IN ('pending', 'sending', 'blocked')
    AND (
      (o.target_kind = 'dm' AND o.member_id = v_me.id)
      OR EXISTS (
        SELECT 1 FROM unnest(v_refs) AS r(id)
        WHERE position(r.id IN o.dedupe_key) > 0 OR position(r.id IN o.params::text) > 0
      )
    );
  -- The caller's own notices about them. Other people's notices are theirs.
  DELETE FROM public.shift_quest_inbox n
  WHERE n.member_id = v_me.id
    AND (
      n.ref_id::text = ANY (v_refs)
      OR EXISTS (SELECT 1 FROM unnest(v_refs) AS r(id) WHERE position(r.id IN n.dedupe_key) > 0)
    );

  DELETE FROM public.shift_quest_reviews WHERE id = ANY (v_reviews);
  DELETE FROM public.shift_quest_appeals WHERE id = ANY (v_appeals);
  -- Contributions go with their submission (ON DELETE CASCADE).
  DELETE FROM public.shift_quest_submissions WHERE id = ANY (v_submissions);
  -- Ownership checks that point at a help request lose the link (ON DELETE SET NULL).
  DELETE FROM public.shift_quest_help_requests WHERE id = ANY (v_help);
  DELETE FROM public.shift_quest_shares WHERE id = ANY (v_shares);
  DELETE FROM public.shift_quest_work_sessions WHERE member_id = v_me.id;
  WITH gone AS (DELETE FROM public.shift_quest_progress WHERE member_id = v_me.id RETURNING 1)
  SELECT count(*) INTO v_progress FROM gone;
  -- 20261121090000_shift_quest_away: the caller's own return answers and
  -- come-back DM choice (their queued 'away' DMs were dropped above).
  DELETE FROM public.shift_quest_away_answers WHERE member_id = v_me.id;
  UPDATE public.shift_quest_members SET away_dm = NULL, away_dm_at = NULL WHERE id = v_me.id;
  -- A kept quest (or a reset one) may be a follow-up of a reset one.
  UPDATE public.shift_quest_instances SET parent_instance_id = NULL
  WHERE member_id = v_me.id AND parent_instance_id = ANY (v_quests);
  -- Other people's journal entries, help requests and shares that named one
  -- of these quests keep their words and lose only the link (ON DELETE SET NULL).
  DELETE FROM public.shift_quest_instances WHERE id = ANY (v_quests);

  IF v_project IS NOT NULL AND v_solo THEN
    -- 4. The project's tree style, last.
    PERFORM 1 FROM public.shift_quest_tree_style WHERE project_id = v_project FOR UPDATE;
    UPDATE public.shift_quest_project_members SET status = 'left', responded_at = now(), show_name = false
    WHERE project_id = v_project AND member_id = v_me.id AND status = 'active';
    UPDATE public.shift_quest_projects SET archived_at = now(), updated_at = now() WHERE id = v_project;
    DELETE FROM public.shift_quest_tree_gifts WHERE project_id = v_project;
    DELETE FROM public.shift_quest_tree_style WHERE project_id = v_project;
    DELETE FROM public.shift_quest_canvas_links WHERE project_id = v_project;
    DELETE FROM public.shift_quest_ownership_checks WHERE project_id = v_project;
    DELETE FROM public.shift_quest_plots WHERE project_id = v_project;
    UPDATE public.shift_quest_members SET current_project_id = NULL, updated_at = now() WHERE id = v_me.id;
  END IF;

  PERFORM public.shift_quest__audit(v_me.id, 'admin_reset_self', 'member', v_me.id);
  RETURN jsonb_build_object(
    'reset', true,
    'project', CASE WHEN v_project IS NULL THEN 'none' WHEN v_solo THEN 'archived' ELSE 'shared' END,
    'quests', cardinality(v_quests),
    'kept_quests', v_kept,
    'journal', v_progress,
    'ledger_rows', v_ledger
  );
END;
$$;

/** Island schema 23: the come-back DM and the return card (22 is 20261120120000_shift_quest_deep_fire). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 23; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- Helpers: no login runs them, service_role included (as every helper since
-- 20261113173515). Supabase's default privileges grant every new function to
-- anon, authenticated and service_role, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION
  public.shift_quest__away_hold_end(uuid),
  public.shift_quest__away_last(uuid, date),
  public.shift_quest__away_held(uuid),
  public.shift_quest__away_gap(uuid, date),
  public.shift_quest__away_live(date),
  public.shift_quest__away_key(uuid, date),
  public.shift_quest__away_n(bigint),
  public.shift_quest__away_json(uuid),
  public.shift_quest__away_due(uuid, text, timestamptz)
FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;

-- The bot's only: queueing the DMs.
REVOKE ALL ON FUNCTION public.shift_quest_enqueue_away(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_enqueue_away(timestamptz) TO service_role, shift_quest_bot;

-- The bot's and the website's: the state and the choice (Discord /settings and the island).
REVOKE ALL ON FUNCTION
  public.shift_quest_away_state(text),
  public.shift_quest_away_set(text, boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_away_state(text),
  public.shift_quest_away_set(text, boolean)
TO service_role, shift_quest_bot;

-- The website's only: the answer and the two admin reads. A second pass of
-- the earlier grant loops (20261111090600, 091000, 091200) gives them to the
-- bot, so this takes that back.
REVOKE ALL ON FUNCTION
  public.shift_quest_away_answer(text, date, text, text),
  public.shift_quest_admin_away(text),
  public.shift_quest_admin_away_reveal(text, uuid)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_away_answer(text, date, text, text),
  public.shift_quest_admin_away(text),
  public.shift_quest_admin_away_reveal(text, uuid)
TO service_role;

-- The replaced functions (shift_quest_outbox_claim, shift_quest__set_feature,
-- shift_quest_admin_status, shift_quest__island_erase,
-- shift_quest__island_export, shift_quest_admin_reset_self) and the schema
-- version keep the grants they already have: CREATE OR REPLACE leaves them as
-- they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest__away_hold_end(uuid),
      public.shift_quest__away_last(uuid, date),
      public.shift_quest__away_held(uuid),
      public.shift_quest__away_gap(uuid, date),
      public.shift_quest__away_live(date),
      public.shift_quest__away_key(uuid, date),
      public.shift_quest__away_n(bigint),
      public.shift_quest__away_json(uuid),
      public.shift_quest__away_due(uuid, text, timestamptz),
      public.shift_quest_enqueue_away(timestamptz)
    FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION
      public.shift_quest_away_state(text),
      public.shift_quest_away_set(text, boolean),
      public.shift_quest_away_answer(text, date, text, text),
      public.shift_quest_admin_away(text),
      public.shift_quest_admin_away_reveal(text, uuid)
    TO shift_quest_web;
  END IF;
END;
$$;
