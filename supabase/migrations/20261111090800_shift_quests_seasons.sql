-- SHIFT High Island, wave 2: Season 1.
--
-- Plan: docs/designs/shift-high-island.md ("Season 1" and the accepted Eng
-- block). Fixed dates and an audience (demo day), an island goal, dated
-- unlocks that are the same for everyone, admin recognitions with a cap,
-- opt-in squads, and the weekly island post. Nobody is ranked; nothing
-- rewards activity volume or speed; trees never shrink; no streaks.
--
-- Built on 20261111090700_shift_quests_island (wave 1), which must apply and
-- work without this file. Wave-1 code reaches seasons only through the hooks
-- that file defines as no-ops; this file replaces them (CREATE OR REPLACE,
-- same signatures): shift_quest__island_season, __island_extras,
-- __season_after_approval, __season_report, __island_export, __island_erase,
-- __on_role_grant, __on_project_join (a joiner earns what the project already
-- meets), __feature_flags and __set_feature (the squads switch).
-- shift_quest_schema_version() becomes 2.
--
-- Demo-day bars have a confirmed number (approved work) and a provisional one
-- that also counts work submitted in the window and still waiting for a
-- mentor, so a submission pending at the cutoff never costs a slot; only the
-- confirmed number grants anything.
--
-- Counting (one helper, shift_quest__season_approvals, used by the demo-day
-- bars, dated unlocks, the island goal, squads and the report): an approved
-- milestone quest counts when its qualifying submission falls inside the
-- window, Bangkok whole days (starts_on 00:00 to the end of demo day, of the
-- unlock deadline or of the goal deadline). The qualifying submission is the
-- first of the unbroken chain that ended in the approval: clarifications and
-- replaced revisions continue it, a withdrawal or a decline breaks it. So
-- the clock is the student's submission, never the mentor's review, and a
-- submission still pending at the cutoff counts once it is approved.
--
-- Lock order (as in wave 1): quest, then plot, then members in one sorted
-- pass, then the active season row. A sweep over the whole island (unlock or
-- season edits) takes every plot, then every member, then the season row.
--
-- Prod-first apply: additive and idempotent; RLS on every table, no grants
-- to anon or authenticated; ends with the grant loop.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Seasons: fixed dates, an audience (demo day) and an island goal. Admin-set.
CREATE TABLE IF NOT EXISTS public.shift_quest_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  demo_day date NOT NULL,
  -- Demo-day slots: at least table_bar counted milestones including
  -- milestone 2 for a gallery table, stage_bar including milestone 3 for a
  -- stage slot (counted by submission time, starts_on to the end of demo day).
  table_bar smallint NOT NULL DEFAULT 2 CHECK (table_bar BETWEEN 1 AND 7),
  stage_bar smallint NOT NULL DEFAULT 3 CHECK (stage_bar BETWEEN 1 AND 7),
  -- Island goal: goal_target projects with goal_milestone submitted by the
  -- end of goal_deadline (Bangkok) and approved unlocks goal_unlock for everyone.
  goal_milestone smallint NULL CHECK (goal_milestone BETWEEN 1 AND 7),
  goal_target integer NULL CHECK (goal_target > 0),
  goal_deadline date NULL,
  goal_unlock text NULL CHECK (goal_unlock IS NULL OR char_length(goal_unlock) <= 300),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_quest_seasons_dates CHECK (ends_on >= starts_on AND demo_day BETWEEN starts_on AND ends_on),
  CONSTRAINT shift_quest_seasons_bars CHECK (table_bar <= stage_bar),
  CONSTRAINT shift_quest_seasons_goal CHECK (
    (goal_milestone IS NULL) = (goal_target IS NULL) AND (goal_milestone IS NULL) = (goal_deadline IS NULL)
  )
);

-- When the island goal was first reached. Once set it stays: archiving or
-- erasing a project later never takes the goal back. Cleared only when an
-- admin changes the goal itself.
ALTER TABLE public.shift_quest_seasons ADD COLUMN IF NOT EXISTS goal_reached_at timestamptz NULL;

-- Surprise recognitions (no category) per member in this season. Admin-set
-- (shift_quest_admin_season); category awards are not counted against it.
ALTER TABLE public.shift_quest_seasons
  ADD COLUMN IF NOT EXISTS surprise_cap smallint NOT NULL DEFAULT 1 CHECK (surprise_cap >= 0);

-- Squads are a switch, off by default: /admin feature squads (no blockers).
-- While off, starting a squad, inviting and answering an invite are
-- 'sq:squads_off'. Read through shift_quest__feature_flags().
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS squads_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_seasons_one_active
  ON public.shift_quest_seasons (status) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_seasons_open_name
  ON public.shift_quest_seasons (name) WHERE status IN ('draft', 'active');

-- Dated unlocks: every active member of a project with milestone_count
-- counted milestones by the end of deadline (Bangkok) earns the same item,
-- once, whenever they qualify (sweeps on approval and on unlock or season edits).
CREATE TABLE IF NOT EXISTS public.shift_quest_season_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.shift_quest_seasons(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  milestone_count smallint NOT NULL CHECK (milestone_count BETWEEN 1 AND 7),
  deadline date NOT NULL,
  -- A published reward rule: credited (once, under its cap) while awards are live.
  reward_rule_key text NULL CHECK (reward_rule_key IS NULL OR reward_rule_key ~ '^[a-z0-9-]{2,40}$'),
  created_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, label)
);

CREATE TABLE IF NOT EXISTS public.shift_quest_season_unlock_earned (
  unlock_id uuid NOT NULL REFERENCES public.shift_quest_season_unlocks(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unlock_id, member_id)
);

-- Category awards at demo day and surprise recognitions (no category),
-- recorded by an admin. Per member per season: at most the season's
-- surprise_cap surprise recognitions, and at most 200 coins between all of them.
CREATE TABLE IF NOT EXISTS public.shift_quest_recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NULL REFERENCES public.shift_quest_seasons(id) ON DELETE SET NULL,
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  category text NULL CHECK (category IS NULL OR char_length(category) BETWEEN 1 AND 80),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  amount integer NOT NULL DEFAULT 0 CHECK (amount BETWEEN 0 AND 200),
  request_key text NOT NULL UNIQUE CHECK (char_length(request_key) BETWEEN 8 AND 200),
  ledger_entry_id uuid NULL REFERENCES public.shift_quest_ledger(id),
  created_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.shift_quest_recognitions.reason IS
  'Admin-written, shown to the student, and kept forever, also after the member is erased: never put a name or personal detail here.';
COMMENT ON COLUMN public.shift_quest_recognitions.category IS
  'Admin-written award category (for example a demo-day category). Never a personal detail.';

CREATE INDEX IF NOT EXISTS shift_quest_recognitions_member
  ON public.shift_quest_recognitions (member_id, created_at DESC);

-- Squads: 3 to 4 student builders, a short sprint with a self-chosen target.
-- Visible only to their active members. Staff are never members. Forming
-- until 3 members are active.
CREATE TABLE IF NOT EXISTS public.shift_quest_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NULL REFERENCES public.shift_quest_seasons(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  target text NOT NULL CHECK (char_length(target) BETWEEN 1 AND 300),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_by uuid NOT NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_quest_squads_window CHECK (ends_on >= starts_on)
);

-- An invite lives 3 days (created_at, reset on a re-invite) unless answered
-- or withdrawn by the member who sent it.
CREATE TABLE IF NOT EXISTS public.shift_quest_squad_members (
  squad_id uuid NOT NULL REFERENCES public.shift_quest_squads(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  status text NOT NULL,
  invited_by uuid NULL REFERENCES public.shift_quest_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz NULL,
  PRIMARY KEY (squad_id, member_id)
);

ALTER TABLE public.shift_quest_squad_members DROP CONSTRAINT IF EXISTS shift_quest_squad_members_status_check;
ALTER TABLE public.shift_quest_squad_members ADD CONSTRAINT shift_quest_squad_members_status_check
  CHECK (status IN ('invited', 'active', 'left', 'declined', 'withdrawn'));

CREATE INDEX IF NOT EXISTS shift_quest_squad_members_member
  ON public.shift_quest_squad_members (member_id, status);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shift_quest_seasons', 'shift_quest_season_unlocks', 'shift_quest_season_unlock_earned',
    'shift_quest_recognitions', 'shift_quest_squads', 'shift_quest_squad_members'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Counting (helpers: never granted to the bot)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest__active_season()
RETURNS public.shift_quest_seasons
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.shift_quest_seasons WHERE status = 'active';
$$;

/**
 * The one season counting helper. Approved milestone quests on the project
 * whose qualifying submission falls in [p_from, p_to): the first submission
 * of the unbroken chain that ended in the approval (a clarification or a
 * replaced revision continues the chain; a withdrawal or a decline breaks
 * it). Mentor review time never moves a quest out of a window.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_approvals(p_project uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (instance_id uuid, milestone smallint, qualified_at timestamptz, distinct_confirmed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, t.milestone, q.qualified_at, a.distinct_confirmed
  FROM public.shift_quest_instances i
  JOIN public.shift_quest_templates t ON t.id = i.template_id
  JOIN public.shift_quest_submissions a ON a.instance_id = i.id AND a.status = 'approved'
  CROSS JOIN LATERAL (
    SELECT min(s.created_at) AS qualified_at
    FROM public.shift_quest_submissions s
    WHERE s.instance_id = i.id AND s.revision <= a.revision
      AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_submissions x
        WHERE x.instance_id = i.id AND x.revision >= s.revision AND x.revision < a.revision
          AND x.status IN ('withdrawn', 'declined')
      )
  ) q
  WHERE i.project_id = p_project AND i.state = 'approved' AND t.milestone IS NOT NULL
    AND q.qualified_at >= p_from AND q.qualified_at < p_to;
$$;

/**
 * Milestone quests on the project still waiting for a mentor (submitted with
 * a pending revision, or a declined revision under an open appeal) whose
 * qualifying submission falls in [p_from, p_to), by the same chain rule as
 * shift_quest__season_approvals. Only ever a provisional number: it never
 * grants an unlock, reaches the goal or counts for a squad.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_pending(p_project uuid, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (instance_id uuid, milestone smallint, qualified_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, t.milestone, q.qualified_at
  FROM public.shift_quest_instances i
  JOIN public.shift_quest_templates t ON t.id = i.template_id
  JOIN LATERAL (
    SELECT s.revision, s.status FROM public.shift_quest_submissions s
    WHERE s.instance_id = i.id ORDER BY s.revision DESC LIMIT 1
  ) a ON (i.state = 'submitted' AND a.status = 'pending') OR (i.state = 'appealed' AND a.status = 'declined')
  CROSS JOIN LATERAL (
    SELECT min(s.created_at) AS qualified_at
    FROM public.shift_quest_submissions s
    WHERE s.instance_id = i.id AND s.revision <= a.revision
      AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_submissions x
        WHERE x.instance_id = i.id AND x.revision >= s.revision AND x.revision < a.revision
          AND x.status IN ('withdrawn', 'declined')
      )
  ) q
  WHERE i.project_id = p_project AND i.state IN ('submitted', 'appealed') AND t.milestone IS NOT NULL
    AND q.qualified_at >= p_from AND q.qualified_at < p_to;
$$;

/**
 * {count, milestones, pending} for a project in a window. count is one per
 * distinct milestone, plus each further approval of milestone 3 or 4 that the
 * reviewer confirmed as distinct work (a new real test counts again).
 * milestones is the distinct list, sorted. With p_with_pending, work still
 * waiting for a mentor (shift_quest__season_pending) adds the milestones it
 * would newly count, never more (pending rows sort after approvals, and a
 * pending repeat is not confirmed as distinct); pending is how many such
 * submissions are in the window.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_count(
  p_project uuid, p_from timestamptz, p_to timestamptz, p_with_pending boolean
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT x.milestone, x.distinct_confirmed, false AS pending, x.qualified_at, x.instance_id
    FROM public.shift_quest__season_approvals(p_project, p_from, p_to) x
    UNION ALL
    SELECT p.milestone, false, true, p.qualified_at, p.instance_id
    FROM public.shift_quest__season_pending(p_project, p_from, p_to) p
    WHERE p_with_pending
  ), a AS (
    SELECT r.*, row_number() OVER (PARTITION BY r.milestone ORDER BY r.pending, r.qualified_at, r.instance_id) AS n
    FROM r
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM a WHERE a.n = 1 OR (a.milestone IN (3, 4) AND a.distinct_confirmed)),
    'milestones', to_jsonb(ARRAY(SELECT DISTINCT a.milestone FROM a ORDER BY 1)),
    'pending', (SELECT count(*) FROM a WHERE a.pending)
  );
$$;

/** The confirmed count (mentor-approved only): bars, unlocks, the goal and squads. */
CREATE OR REPLACE FUNCTION public.shift_quest__season_tally(p_project uuid, p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.shift_quest__season_count(p_project, p_from, p_to, false);
$$;

/**
 * Demo-day standing of a project: {count, milestones, table, stage,
 * qualifies, provisional}. A table needs table_bar counted milestones
 * including 2 (it works); a stage slot needs stage_bar including 3 (a real
 * person tried it). The confirmed numbers count approved work only.
 * provisional {count, milestones, pending, table, stage, qualifies} also
 * counts work submitted in the window that a mentor has not decided yet, so a
 * submission still pending at the cutoff never costs a slot: staff review it
 * before the event, and a decline takes it back out.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_slot(p_season public.shift_quest_seasons, p_project uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_to timestamptz;
  v_tally jsonb;
  v_prov jsonb;
BEGIN
  IF p_season.id IS NULL OR p_project IS NULL THEN
    RETURN jsonb_build_object(
      'count', 0, 'milestones', '[]'::jsonb, 'table', false, 'stage', false, 'qualifies', NULL,
      'provisional', jsonb_build_object('count', 0, 'milestones', '[]'::jsonb, 'pending', 0,
                                        'table', false, 'stage', false, 'qualifies', NULL)
    );
  END IF;
  v_from := public.shift_quest__bkk_start(p_season.starts_on);
  v_to := public.shift_quest__bkk_end(p_season.demo_day);
  v_tally := public.shift_quest__season_count(p_project, v_from, v_to, false) - 'pending';
  v_prov := public.shift_quest__season_count(p_project, v_from, v_to, true);
  RETURN public.shift_quest__slot_bars(p_season, v_tally)
    || jsonb_build_object('provisional', public.shift_quest__slot_bars(p_season, v_prov));
END;
$$;

/** {count, milestones} plus table, stage and qualifies against the season's bars. */
CREATE OR REPLACE FUNCTION public.shift_quest__slot_bars(p_season public.shift_quest_seasons, p_tally jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_count integer := (p_tally ->> 'count')::integer;
  v_table boolean := v_count >= p_season.table_bar AND (p_tally -> 'milestones') @> '[2]'::jsonb;
  v_stage boolean := v_count >= p_season.stage_bar AND (p_tally -> 'milestones') @> '[3]'::jsonb;
BEGIN
  RETURN p_tally || jsonb_build_object(
    'table', v_table,
    'stage', v_stage,
    'qualifies', CASE WHEN v_stage THEN 'stage' WHEN v_table THEN 'table' END
  );
END;
$$;

/** Non-archived projects with the goal milestone counted by the goal deadline. */
CREATE OR REPLACE FUNCTION public.shift_quest__goal_count(p_season public.shift_quest_seasons)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.shift_quest_projects p
  WHERE p.archived_at IS NULL AND p_season.goal_milestone IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      WHERE i.project_id = p.id AND i.state = 'approved' AND i.milestone = p_season.goal_milestone
    )
    AND EXISTS (
      SELECT 1 FROM public.shift_quest__season_approvals(
        p.id, public.shift_quest__bkk_start(p_season.starts_on), public.shift_quest__bkk_end(p_season.goal_deadline)
      ) a
      WHERE a.milestone = p_season.goal_milestone
    );
$$;

/** The island goal: reached once goal_reached_at is set, or while the live count meets the target. */
CREATE OR REPLACE FUNCTION public.shift_quest__goal_json(p_season public.shift_quest_seasons)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN p_season.id IS NULL OR p_season.goal_milestone IS NULL THEN NULL ELSE jsonb_build_object(
    'milestone', p_season.goal_milestone,
    'target', p_season.goal_target,
    'count', x.n,
    'deadline', p_season.goal_deadline,
    'unlock', p_season.goal_unlock,
    'reached', p_season.goal_reached_at IS NOT NULL OR x.n >= p_season.goal_target,
    'reached_at', p_season.goal_reached_at
  ) END
  FROM (SELECT public.shift_quest__goal_count(p_season) AS n) x;
$$;

/**
 * Records that the active season's island goal was reached, once. Takes the
 * season row last (after the plot and member locks), and only when it
 * actually sets the mark.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__goal_latch(p_season uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_seasons s
  SET goal_reached_at = now(), updated_at = now()
  WHERE s.id = p_season AND s.status = 'active' AND s.goal_reached_at IS NULL AND s.goal_milestone IS NOT NULL
    AND public.shift_quest__goal_count(s) >= s.goal_target;
END;
$$;

/** True while the member is under the rule's cap (awards reversed in full do not count). */
CREATE OR REPLACE FUNCTION public.shift_quest__under_cap(p_member uuid, p_rule public.shift_quest_reward_rules)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_rule.cap_per_member IS NULL OR (
    SELECT count(*) FROM public.shift_quest_ledger l
    JOIN public.shift_quest_reward_rules r ON r.id = l.reward_rule_id
    WHERE l.member_id = p_member AND l.kind = 'award' AND r.key = p_rule.key
      AND l.amount + COALESCE((
        SELECT sum(x.amount) FROM public.shift_quest_ledger x WHERE x.references_entry_id = l.id
      ), 0) > 0
  ) < p_rule.cap_per_member;
$$;

/**
 * Gives every active member of the project each unlock of the season the
 * project now meets (counted milestones submitted by the end of the unlock's
 * deadline, approved whenever). Equal for everyone: it does not matter when
 * the unlock was created, when the member joined or when they were last
 * active. Each grant is recorded once (primary key) and credited at most once
 * (ledger source key unlock:<unlock>:<member>), and only while awards are
 * live and under the rule's cap. A grant made while awards are off is
 * recorded and told with no coins, and is never paid later.
 *
 * Callers hold the project's plot lock and every member lock (one sorted
 * pass): shift_quest_review_decide, or shift_quest__lock_island for a sweep.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__grant_unlocks(
  p_season public.shift_quest_seasons, p_project uuid, p_actor uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_unlock public.shift_quest_season_unlocks;
  v_rule public.shift_quest_reward_rules;
  v_person uuid;
  v_inserted boolean;
  v_entry uuid;
  v_amount integer;
  v_earned integer := 0;
BEGIN
  IF p_season.id IS NULL OR p_project IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.shift_quest_projects WHERE id = p_project AND archived_at IS NULL
  ) THEN
    RETURN 0;
  END IF;
  v_from := public.shift_quest__bkk_start(p_season.starts_on);

  FOR v_unlock IN
    SELECT * FROM public.shift_quest_season_unlocks u
    WHERE u.season_id = p_season.id
      AND (public.shift_quest__season_tally(p_project, v_from, public.shift_quest__bkk_end(u.deadline)) ->> 'count')::integer
          >= u.milestone_count
    ORDER BY u.created_at, u.id
  LOOP
    v_rule := NULL;
    SELECT * INTO v_rule FROM public.shift_quest_reward_rules
    WHERE key = v_unlock.reward_rule_key AND status = 'published';

    FOR v_person IN
      SELECT pm.member_id FROM public.shift_quest_project_members pm
      JOIN public.shift_quest_members m ON m.id = pm.member_id
      WHERE pm.project_id = p_project AND pm.status = 'active' AND m.erased_at IS NULL
      ORDER BY pm.member_id
    LOOP
      -- Re-entrant: the caller locked every member up front.
      PERFORM 1 FROM public.shift_quest_members WHERE id = v_person FOR NO KEY UPDATE;
      v_inserted := NULL;
      INSERT INTO public.shift_quest_season_unlock_earned (unlock_id, member_id)
      VALUES (v_unlock.id, v_person)
      ON CONFLICT DO NOTHING
      RETURNING true INTO v_inserted;
      IF v_inserted IS NULL THEN
        CONTINUE;
      END IF;
      v_earned := v_earned + 1;

      v_amount := NULL;
      IF v_rule.id IS NOT NULL AND public.shift_quest__awards_live()
         AND public.shift_quest__under_cap(v_person, v_rule) THEN
        v_entry := NULL;
        INSERT INTO public.shift_quest_ledger (
          member_id, amount, kind, source_key, reward_rule_id, reason, actor_id
        )
        VALUES (
          v_person, v_rule.amount, 'award', 'unlock:' || v_unlock.id || ':' || v_person, v_rule.id,
          'season_unlock', p_actor
        )
        ON CONFLICT (source_key) DO NOTHING
        RETURNING id INTO v_entry;
        IF v_entry IS NOT NULL THEN
          v_amount := v_rule.amount;
        END IF;
      END IF;

      PERFORM public.shift_quest__notify(
        v_person, 'unlock:' || v_unlock.id || ':' || v_person, 'unlock_earned',
        jsonb_build_object('label', v_unlock.label, 'amount', v_amount), v_unlock.id
      );
    END LOOP;
  END LOOP;

  RETURN v_earned;
END;
$$;

/**
 * Locks the whole island in the approval order for a sweep: every plot, then
 * every member with an active project, each in one sorted pass. Joining and
 * leaving wait on the plot locks, so the member set holds until commit.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__lock_island()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.shift_quest_plots ORDER BY project_id FOR NO KEY UPDATE;
  PERFORM 1 FROM public.shift_quest_members m
  WHERE m.erased_at IS NULL AND EXISTS (
    SELECT 1 FROM public.shift_quest_project_members pm
    JOIN public.shift_quest_projects p ON p.id = pm.project_id
    WHERE pm.member_id = m.id AND pm.status = 'active' AND p.archived_at IS NULL
  )
  ORDER BY m.id
  FOR NO KEY UPDATE;
END;
$$;

/**
 * Grants every unlock of the active season to everyone who qualifies, and
 * marks the island goal if reached. Idempotent. Callers hold
 * shift_quest__lock_island. Returns the number of new grants.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__sweep_season(p_season uuid, p_actor uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons;
  v_project uuid;
  v_earned integer := 0;
BEGIN
  SELECT * INTO v_season FROM public.shift_quest_seasons WHERE id = p_season AND status = 'active';
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  FOR v_project IN
    SELECT p.id FROM public.shift_quest_projects p WHERE p.archived_at IS NULL ORDER BY p.id
  LOOP
    v_earned := v_earned + public.shift_quest__grant_unlocks(v_season, v_project, p_actor);
  END LOOP;
  PERFORM public.shift_quest__goal_latch(p_season);
  RETURN v_earned;
END;
$$;

/** The season block of /island for one member and their current project. */
CREATE OR REPLACE FUNCTION public.shift_quest__season_json(
  p_season public.shift_quest_seasons, p_member uuid, p_project uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot jsonb;
BEGIN
  IF p_season.id IS NULL THEN
    RETURN NULL;
  END IF;
  v_slot := public.shift_quest__season_slot(p_season, p_project);
  RETURN jsonb_build_object(
    'id', p_season.id,
    'name', p_season.name,
    'starts_on', p_season.starts_on,
    'ends_on', p_season.ends_on,
    'demo_day', p_season.demo_day,
    'days_to_demo', p_season.demo_day - public.shift_quest__bkk_today(),
    'table_bar', p_season.table_bar,
    'stage_bar', p_season.stage_bar,
    -- Counted milestones: submitted from starts_on to the end of demo day, approved.
    'stage_at_cutoff', v_slot -> 'count',
    'season_milestones', v_slot -> 'milestones',
    'qualifies', CASE WHEN p_project IS NULL THEN NULL ELSE v_slot -> 'qualifies' END,
    -- Provisional: also counting work submitted in that window that still
    -- waits for a mentor. Higher than the confirmed numbers only while
    -- something is pending; never grants anything.
    'stage_with_pending', v_slot -> 'provisional' -> 'count',
    'qualifies_with_pending', CASE WHEN p_project IS NULL THEN NULL ELSE v_slot -> 'provisional' -> 'qualifies' END,
    'goal', public.shift_quest__goal_json(p_season),
    'unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', u.id, 'label', u.label, 'milestone_count', u.milestone_count, 'deadline', u.deadline,
        'expired', u.deadline < public.shift_quest__bkk_today(),
        'earned', EXISTS (
          SELECT 1 FROM public.shift_quest_season_unlock_earned e
          WHERE e.unlock_id = u.id AND e.member_id = p_member
        )
      ) ORDER BY u.milestone_count, u.deadline, u.label)
      FROM public.shift_quest_season_unlocks u WHERE u.season_id = p_season.id
    ), '[]'::jsonb)
  );
END;
$$;

/** Admin view of a season, with how many members earned each unlock. */
CREATE OR REPLACE FUNCTION public.shift_quest__season_admin_json(p_season uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons;
BEGIN
  SELECT * INTO v_season FROM public.shift_quest_seasons WHERE id = p_season;
  RETURN jsonb_build_object(
    'id', v_season.id,
    'name', v_season.name,
    'status', v_season.status,
    'starts_on', v_season.starts_on,
    'ends_on', v_season.ends_on,
    'demo_day', v_season.demo_day,
    'table_bar', v_season.table_bar,
    'stage_bar', v_season.stage_bar,
    'surprise_cap', v_season.surprise_cap,
    'goal', public.shift_quest__goal_json(v_season),
    'unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', u.id, 'label', u.label, 'milestone_count', u.milestone_count, 'deadline', u.deadline,
        'reward_rule_key', u.reward_rule_key,
        'earned', (SELECT count(*) FROM public.shift_quest_season_unlock_earned e WHERE e.unlock_id = u.id)
      ) ORDER BY u.milestone_count, u.deadline, u.label)
      FROM public.shift_quest_season_unlocks u WHERE u.season_id = v_season.id
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Squads (helpers)
-- ---------------------------------------------------------------------------

/** A student who may be in a squad: finished /start and holds no staff role. */
CREATE OR REPLACE FUNCTION public.shift_quest__squad_student(p_actor text)
RETURNS public.shift_quest_members
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  -- No adult (reviewer, admin, fulfillment) ever shares a squad with students.
  IF cardinality(v_member.roles) > 0 THEN
    PERFORM public.shift_quest__fail('staff_no_squad');
  END IF;
  RETURN v_member;
END;
$$;

/** How long a squad invite lives (plan: 3 days). */
CREATE OR REPLACE FUNCTION public.shift_quest__invite_ttl()
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT interval '3 days';
$$;

/** An invite still open: not answered or withdrawn, and under 3 days old. */
CREATE OR REPLACE FUNCTION public.shift_quest__invite_live(p_status text, p_created timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_status = 'invited' AND p_created > now() - public.shift_quest__invite_ttl();
$$;

/** Squads switched on (/admin feature squads), else 'sq:squads_off'. */
CREATE OR REPLACE FUNCTION public.shift_quest__squads_open()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT COALESCE((SELECT squads_enabled FROM public.shift_quest_settings WHERE id), false) THEN
    PERFORM public.shift_quest__fail('squads_off');
  END IF;
END;
$$;

/** Active squad members who hold no staff role and are not erased. */
CREATE OR REPLACE FUNCTION public.shift_quest__squad_size(p_squad uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.shift_quest_squad_members sm
  JOIN public.shift_quest_members m ON m.id = sm.member_id
  WHERE sm.squad_id = p_squad AND sm.status = 'active' AND m.erased_at IS NULL AND cardinality(m.roles) = 0;
$$;

/** 'ended' after its window, 'running' with 3 or more active members, otherwise 'forming'. */
CREATE OR REPLACE FUNCTION public.shift_quest__squad_phase(p_squad public.shift_quest_squads)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_squad.ends_on < public.shift_quest__bkk_today() THEN 'ended'
    WHEN public.shift_quest__squad_size(p_squad.id) >= 3 THEN 'running'
    ELSE 'forming'
  END;
$$;

-- A per-member number from an earlier draft (never applied to production):
-- members are never compared, so the view carries the group number only.
DROP FUNCTION IF EXISTS public.shift_quest__squad_gained(uuid, public.shift_quest_squads);

/**
 * The squad's progress as one group number: counted milestones in the window
 * on the active members' current projects, each project once (two teammates
 * on one project never count it twice).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__squad_total(p_squad public.shift_quest_squads)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(sum((public.shift_quest__season_tally(
    x.project, public.shift_quest__bkk_start(p_squad.starts_on), public.shift_quest__bkk_end(p_squad.ends_on)
  ) ->> 'count')::integer), 0)::integer
  FROM (
    SELECT DISTINCT public.shift_quest__current_project(m) AS project
    FROM public.shift_quest_squad_members sm
    JOIN public.shift_quest_members m ON m.id = sm.member_id
    WHERE sm.squad_id = p_squad.id AND sm.status = 'active' AND m.erased_at IS NULL
  ) x
  WHERE x.project IS NOT NULL;
$$;

/** True if the member is active in a squad of this season whose window has not ended. */
CREATE OR REPLACE FUNCTION public.shift_quest__in_squad(p_member uuid, p_season uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shift_quest_squad_members sm
    JOIN public.shift_quest_squads q ON q.id = sm.squad_id
    WHERE sm.member_id = p_member AND sm.status = 'active'
      AND q.season_id IS NOT DISTINCT FROM p_season
      AND q.ends_on >= public.shift_quest__bkk_today()
  );
$$;

-- ---------------------------------------------------------------------------
-- Hooks from wave 1 (same signatures as in 20261111090700_shift_quests_island)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest__island_season(p_member uuid, p_project uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest__season_json(public.shift_quest__active_season(), p_member, p_project);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__island_extras()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
BEGIN
  RETURN jsonb_build_object(
    'goal', public.shift_quest__goal_json(v_season),
    'season', CASE WHEN v_season.id IS NULL THEN NULL ELSE jsonb_build_object(
      'name', v_season.name, 'demo_day', v_season.demo_day,
      'days_to_demo', v_season.demo_day - public.shift_quest__bkk_today()
    ) END
  );
END;
$$;

/**
 * After an approval (quest, plot and member locks held): the project's
 * members earn every unlock it now meets, and the island goal is marked once
 * reached. Members who joined since an earlier grant earn here too.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_after_approval(p_project uuid, p_actor uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
  v_earned integer;
BEGIN
  IF v_season.id IS NULL THEN
    RETURN 0;
  END IF;
  v_earned := public.shift_quest__grant_unlocks(v_season, p_project, p_actor);
  PERFORM public.shift_quest__goal_latch(v_season.id);
  RETURN v_earned;
END;
$$;

/**
 * A member became active on a project: everyone on it, the joiner included,
 * earns at once every unlock the project already meets (the same sweep as
 * after an approval, so the joiner never waits for the next one). The caller
 * holds the plot lock when it has one (shift_quest_project_respond); the
 * project's active members are then locked in one sorted pass, as in an
 * approval. A system grant: the ledger row has no actor.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__on_project_join(p_project uuid, p_member uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
BEGIN
  IF v_season.id IS NULL OR p_project IS NULL THEN
    RETURN 0;
  END IF;
  PERFORM public.shift_quest__lock_plot(p_project);
  PERFORM 1 FROM public.shift_quest_members m
  WHERE m.erased_at IS NULL AND m.id IN (
    SELECT pm.member_id FROM public.shift_quest_project_members pm
    WHERE pm.project_id = p_project AND pm.status = 'active'
  )
  ORDER BY m.id
  FOR NO KEY UPDATE;
  RETURN public.shift_quest__grant_unlocks(v_season, p_project, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest__feature_flags()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_build_object('squads', s.squads_enabled) FROM public.shift_quest_settings s WHERE s.id
  ), '{}'::jsonb);
END;
$$;

/** 'squads' on or off. No blockers: squads need nothing published first. */
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
  RETURN false;
END;
$$;

/**
 * Season counts for the report. The bars come twice: confirmed (approved
 * only) and with pending work (submitted in the window, not decided yet), and
 * milestones_pending_review says how many such submissions staff still have
 * to decide before demo day.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_report(p_since timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
  v_bars jsonb;
BEGIN
  IF v_season.id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'projects_at_table_bar', count(*) FILTER (WHERE (x.slot ->> 'table')::boolean),
      'projects_at_stage_bar', count(*) FILTER (WHERE (x.slot ->> 'stage')::boolean),
      'projects_at_table_bar_with_pending', count(*) FILTER (WHERE (x.slot -> 'provisional' ->> 'table')::boolean),
      'projects_at_stage_bar_with_pending', count(*) FILTER (WHERE (x.slot -> 'provisional' ->> 'stage')::boolean),
      'milestones_pending_review', COALESCE(sum((x.slot -> 'provisional' ->> 'pending')::integer), 0)
    ) INTO v_bars
    FROM (
      SELECT public.shift_quest__season_slot(v_season, p.id) AS slot
      FROM public.shift_quest_projects p WHERE p.archived_at IS NULL
    ) x;
  END IF;
  RETURN jsonb_build_object(
    'season', CASE WHEN v_season.id IS NULL THEN NULL ELSE jsonb_build_object(
      'demo_day', v_season.demo_day,
      'goal', public.shift_quest__goal_json(v_season),
      'unlocks_earned', (
        SELECT count(*) FROM public.shift_quest_season_unlock_earned e
        JOIN public.shift_quest_season_unlocks u ON u.id = e.unlock_id
        WHERE u.season_id = v_season.id
      )
    ) || v_bars END,
    'unlocks_earned_in_window', (
      SELECT count(*) FROM public.shift_quest_season_unlock_earned WHERE earned_at >= p_since
    ),
    'recognitions_in_window', (
      SELECT count(*) FROM public.shift_quest_recognitions WHERE created_at >= p_since
    ),
    'squads_active', (
      SELECT count(*) FROM public.shift_quest_squads q WHERE public.shift_quest__squad_phase(q) = 'running'
    ),
    'squads_forming', (
      SELECT count(*) FROM public.shift_quest_squads q
      WHERE public.shift_quest__squad_phase(q) = 'forming' AND public.shift_quest__squad_size(q.id) > 0
    )
  );
END;
$$;

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
    ), '[]'::jsonb)
  );
END;
$$;

/**
 * Erasure, seasons part: squad places end; every squad the member named
 * loses its name and target (their words), also when others are still in it,
 * and in other people's squad invite notices. Recognitions and earned
 * unlocks stay, keyed by the opaque ID.
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
END;
$$;

/** A staff role ends every squad place and pending invite of its holder. */
CREATE OR REPLACE FUNCTION public.shift_quest__on_role_grant(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_squad_members SET status = 'left', responded_at = now()
  WHERE member_id = p_member AND status IN ('active', 'invited');
END;
$$;

-- ---------------------------------------------------------------------------
-- Seasons, unlocks, recognitions (admin)
-- ---------------------------------------------------------------------------

-- The 12- and 13-argument versions from earlier drafts (never applied to
-- production); dropped so a re-run sandbox has no ambiguous overload.
DROP FUNCTION IF EXISTS public.shift_quest_admin_season(
  text, text, date, date, date, smallint, smallint, smallint, integer, date, text, boolean
);
DROP FUNCTION IF EXISTS public.shift_quest_admin_season(
  text, text, date, date, date, smallint, smallint, smallint, integer, date, text, boolean, boolean
);

/**
 * Creates the season with this name, or updates it while it is a draft or
 * active. On an update every parameter left null keeps its stored value;
 * p_clear_goal removes the goal (and then no goal parameter may be given).
 * The merged season is validated: 'sq:bad_dates' (starts_on <= demo_day <=
 * ends_on) or 'sq:bad_input' (bars 1 to 7 with table <= stage; a goal is a
 * milestone, a target and a deadline, or none; a surprise cap of 0 or more).
 * Changing the goal's milestone, target or deadline clears its reached mark
 * (it is re-checked at once). p_activate makes it the active season and
 * closes any other. While the season is active, every edit sweeps the
 * unlocks and the goal. p_surprise_cap is how many surprise recognitions (no
 * category) one member may get in the season (default 1). The trailing
 * parameters default, so a 12- or 13-argument call still works.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_season(
  p_actor text, p_name text, p_starts_on date, p_ends_on date, p_demo_day date,
  p_table_bar smallint, p_stage_bar smallint, p_goal_milestone smallint, p_goal_target integer,
  p_goal_deadline date, p_goal_unlock text, p_activate boolean, p_clear_goal boolean DEFAULT false,
  p_surprise_cap smallint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_name text := public.shift_quest__check_len(p_name, 80, true);
  v_unlock text := public.shift_quest__check_len(p_goal_unlock, 300, false);
  v_clear boolean := COALESCE(p_clear_goal, false);
  v_old public.shift_quest_seasons;
  v_new public.shift_quest_seasons;
  v_id uuid;
BEGIN
  IF v_clear AND (p_goal_milestone IS NOT NULL OR p_goal_target IS NOT NULL
                  OR p_goal_deadline IS NOT NULL OR v_unlock IS NOT NULL) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  -- One season edit at a time; then the island in the approval lock order
  -- (every plot, every member), then the season row.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_season'));
  PERFORM public.shift_quest__lock_island();
  SELECT * INTO v_old FROM public.shift_quest_seasons
  WHERE name = v_name AND status IN ('draft', 'active')
  FOR NO KEY UPDATE;

  v_new.starts_on := COALESCE(p_starts_on, v_old.starts_on);
  v_new.ends_on := COALESCE(p_ends_on, v_old.ends_on);
  v_new.demo_day := COALESCE(p_demo_day, v_old.demo_day);
  v_new.table_bar := COALESCE(p_table_bar, v_old.table_bar, 2);
  v_new.stage_bar := COALESCE(p_stage_bar, v_old.stage_bar, 3);
  v_new.surprise_cap := COALESCE(p_surprise_cap, v_old.surprise_cap, 1);
  IF NOT v_clear THEN
    v_new.goal_milestone := COALESCE(p_goal_milestone, v_old.goal_milestone);
    v_new.goal_target := COALESCE(p_goal_target, v_old.goal_target);
    v_new.goal_deadline := COALESCE(p_goal_deadline, v_old.goal_deadline);
    v_new.goal_unlock := COALESCE(v_unlock, v_old.goal_unlock);
  END IF;

  IF v_new.starts_on IS NULL OR v_new.ends_on IS NULL OR v_new.demo_day IS NULL
     OR v_new.ends_on < v_new.starts_on OR v_new.demo_day NOT BETWEEN v_new.starts_on AND v_new.ends_on THEN
    PERFORM public.shift_quest__fail('bad_dates');
  END IF;
  IF v_new.table_bar < 1 OR v_new.stage_bar > 7 OR v_new.table_bar > v_new.stage_bar
     OR v_new.surprise_cap < 0 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF NOT COALESCE(
       (v_new.goal_milestone IS NULL AND v_new.goal_target IS NULL AND v_new.goal_deadline IS NULL)
       OR (v_new.goal_milestone BETWEEN 1 AND 7 AND v_new.goal_target >= 1 AND v_new.goal_deadline IS NOT NULL),
       false) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  IF v_old.id IS NULL THEN
    INSERT INTO public.shift_quest_seasons (
      name, starts_on, ends_on, demo_day, table_bar, stage_bar, surprise_cap,
      goal_milestone, goal_target, goal_deadline, goal_unlock, created_by
    )
    VALUES (
      v_name, v_new.starts_on, v_new.ends_on, v_new.demo_day, v_new.table_bar, v_new.stage_bar, v_new.surprise_cap,
      v_new.goal_milestone, v_new.goal_target, v_new.goal_deadline, v_new.goal_unlock, v_me.id
    )
    RETURNING id INTO v_id;
  ELSE
    v_id := v_old.id;
    UPDATE public.shift_quest_seasons
    SET starts_on = v_new.starts_on, ends_on = v_new.ends_on, demo_day = v_new.demo_day,
        table_bar = v_new.table_bar, stage_bar = v_new.stage_bar, surprise_cap = v_new.surprise_cap,
        goal_milestone = v_new.goal_milestone, goal_target = v_new.goal_target,
        goal_deadline = v_new.goal_deadline, goal_unlock = v_new.goal_unlock,
        goal_reached_at = CASE
          WHEN v_new.goal_milestone IS NOT DISTINCT FROM v_old.goal_milestone
           AND v_new.goal_target IS NOT DISTINCT FROM v_old.goal_target
           AND v_new.goal_deadline IS NOT DISTINCT FROM v_old.goal_deadline
          THEN goal_reached_at END,
        updated_at = now()
    WHERE id = v_id;
  END IF;

  IF COALESCE(p_activate, false) THEN
    UPDATE public.shift_quest_seasons SET status = 'closed', updated_at = now()
    WHERE status = 'active' AND id <> v_id;
    UPDATE public.shift_quest_seasons SET status = 'active', updated_at = now()
    WHERE id = v_id AND status <> 'active';
  END IF;

  -- Grants and the goal follow the season at once (no-op unless it is active).
  PERFORM public.shift_quest__sweep_season(v_id, v_me.id);

  PERFORM public.shift_quest__audit(v_me.id, 'season_upsert', 'season', v_id);
  RETURN public.shift_quest__season_admin_json(v_id);
END;
$$;

/**
 * Adds (or, by label, updates) a dated unlock on a draft or active season,
 * then, while the season is active, grants it to everyone who already meets
 * it. Once anyone earned it, it can only get easier (a lower count or a
 * later deadline) and its rule stays: 'sq:unlock_has_grants' otherwise, so
 * it stays the same item on the same terms for everyone.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_unlock(
  p_actor text, p_season uuid, p_label text, p_milestone_count smallint, p_deadline date, p_rule_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_label text := public.shift_quest__check_len(p_label, 80, true);
  v_key text := public.shift_quest__trim(p_rule_key);
  v_old public.shift_quest_season_unlocks;
  v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_seasons WHERE id = p_season AND status IN ('draft', 'active')) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_milestone_count IS NULL OR p_milestone_count NOT BETWEEN 1 AND 7 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_deadline IS NULL THEN
    PERFORM public.shift_quest__fail('bad_dates');
  END IF;
  IF v_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_reward_rules WHERE key = v_key AND status = 'published'
  ) THEN
    PERFORM public.shift_quest__fail('rule_not_found');
  END IF;

  -- As shift_quest_admin_season: one edit at a time, then the whole island.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_season'));
  PERFORM public.shift_quest__lock_island();

  SELECT * INTO v_old FROM public.shift_quest_season_unlocks WHERE season_id = p_season AND label = v_label;
  IF v_old.id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.shift_quest_season_unlock_earned WHERE unlock_id = v_old.id)
     AND (p_milestone_count > v_old.milestone_count OR p_deadline < v_old.deadline
          OR v_key IS DISTINCT FROM v_old.reward_rule_key) THEN
    PERFORM public.shift_quest__fail('unlock_has_grants');
  END IF;

  INSERT INTO public.shift_quest_season_unlocks (season_id, label, milestone_count, deadline, reward_rule_key, created_by)
  VALUES (p_season, v_label, p_milestone_count, p_deadline, v_key, v_me.id)
  ON CONFLICT (season_id, label) DO UPDATE
    SET milestone_count = EXCLUDED.milestone_count, deadline = EXCLUDED.deadline,
        reward_rule_key = EXCLUDED.reward_rule_key
  RETURNING id INTO v_id;

  -- Everyone who already qualifies earns it now (no-op unless the season is active).
  PERFORM public.shift_quest__sweep_season(p_season, v_me.id);

  PERFORM public.shift_quest__audit(v_me.id, 'season_unlock_upsert', 'season_unlock', v_id);
  RETURN v_id;
END;
$$;

/**
 * Records a category award or a surprise recognition, optionally with a few
 * coins (0 = recognition only). The student sees the reason in /inbox. It is
 * admin-written and kept forever, also after an erasure: never put a name or
 * personal detail in it. p_request_key makes a retry a no-op (checked before
 * the cap, so retrying the grant that filled the cap still succeeds); the
 * same key for someone else is refused. Capped per member per season (the
 * active one, or none), counted under the member lock after that lookup: at
 * most the season's surprise_cap surprise recognitions (no category; 1 with
 * no active season), and at most 200 coins between all recognitions, else
 * 'sq:recognition_cap'. Category awards (demo-day categories) have no count
 * cap: a project team can win several.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_recognize(
  p_actor text, p_target text, p_amount integer, p_reason text, p_category text, p_request_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_reason text := public.shift_quest__check_len(p_reason, 500, true);
  v_category text := public.shift_quest__check_len(p_category, 80, false);
  v_amount integer := COALESCE(p_amount, 0);
  v_active public.shift_quest_seasons := public.shift_quest__active_season();
  v_season uuid := v_active.id;
  v_target public.shift_quest_members;
  v_existing public.shift_quest_recognitions;
  v_surprises integer;
  v_coins integer;
  v_id uuid;
  v_entry uuid;
BEGIN
  IF p_request_key IS NULL OR char_length(p_request_key) NOT BETWEEN 8 AND 200 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF v_amount < 0 OR v_amount > 200 THEN
    PERFORM public.shift_quest__fail('bad_amount');
  END IF;
  SELECT * INTO v_target FROM public.shift_quest_members WHERE discord_user_id = p_target;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_target.id = v_me.id THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  -- One grant to this member at a time: the cap and a double click both see the first.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_target.id FOR NO KEY UPDATE;

  SELECT * INTO v_existing FROM public.shift_quest_recognitions WHERE request_key = p_request_key;
  IF FOUND THEN
    -- The same key for someone else is a mistake, not a retry.
    IF v_existing.member_id IS DISTINCT FROM v_target.id THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    RETURN jsonb_build_object('entry_id', v_existing.ledger_entry_id, 'recognition_id', v_existing.id,
                              'duplicate', true);
  END IF;

  SELECT count(*) FILTER (WHERE category IS NULL), COALESCE(sum(amount), 0) INTO v_surprises, v_coins
  FROM public.shift_quest_recognitions
  WHERE member_id = v_target.id AND season_id IS NOT DISTINCT FROM v_season;
  IF (v_category IS NULL AND v_surprises >= COALESCE(v_active.surprise_cap, 1)) OR v_coins + v_amount > 200 THEN
    PERFORM public.shift_quest__fail('recognition_cap');
  END IF;
  -- Coins only under the published terms.
  IF v_amount > 0 AND NOT public.shift_quest__awards_live() THEN
    PERFORM public.shift_quest__fail('awards_paused');
  END IF;

  INSERT INTO public.shift_quest_recognitions (
    season_id, member_id, category, reason, amount, request_key, created_by
  )
  VALUES (v_season, v_target.id, v_category, v_reason, v_amount, p_request_key, v_me.id)
  ON CONFLICT (request_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    -- The same key used at this instant for another member (another member lock).
    SELECT * INTO v_existing FROM public.shift_quest_recognitions WHERE request_key = p_request_key;
    IF v_existing.member_id IS DISTINCT FROM v_target.id THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    RETURN jsonb_build_object('entry_id', v_existing.ledger_entry_id, 'recognition_id', v_existing.id,
                              'duplicate', true);
  END IF;

  IF v_amount > 0 THEN
    INSERT INTO public.shift_quest_ledger (member_id, amount, kind, source_key, reason, actor_id)
    VALUES (v_target.id, v_amount, 'recognition', 'recognition:' || p_request_key, 'recognition', v_me.id)
    RETURNING id INTO v_entry;
    UPDATE public.shift_quest_recognitions SET ledger_entry_id = v_entry WHERE id = v_id;
  END IF;

  PERFORM public.shift_quest__notify(
    v_target.id, 'recognized:' || v_id, 'recognized',
    jsonb_build_object('category', v_category, 'amount', v_amount, 'reason', v_reason), v_id
  );
  PERFORM public.shift_quest__audit(v_me.id, 'recognize', 'recognition', v_id);
  RETURN jsonb_build_object('entry_id', v_entry, 'recognition_id', v_id, 'duplicate', false,
                            'balance', public.shift_quest__balance(v_target.id));
END;
$$;

-- ---------------------------------------------------------------------------
-- Squads: opt-in, students only, a short window, visible only to their
-- active members. No Discord channel or thread is ever made for one.
-- ---------------------------------------------------------------------------

/**
 * Starts a squad with the caller as its first member. One squad per member
 * per season at a time. 'sq:squads_off' while squads are switched off.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_squad_create(
  p_actor text, p_name text, p_target text, p_days integer DEFAULT 14
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__squad_student(p_actor);
  v_name text;
  v_target text;
  v_days integer := COALESCE(p_days, 14);
  v_season uuid := (public.shift_quest__active_season()).id;
  v_today date := public.shift_quest__bkk_today();
  v_id uuid;
BEGIN
  PERFORM public.shift_quest__squads_open();
  v_name := public.shift_quest__check_len(p_name, 80, true);
  v_target := public.shift_quest__check_len(p_target, 300, true);
  IF v_days < 1 OR v_days > 28 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  -- Member before squad, as in shift_quest_squad_respond.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  IF public.shift_quest__in_squad(v_member.id, v_season) THEN
    PERFORM public.shift_quest__fail('squad_limit');
  END IF;

  INSERT INTO public.shift_quest_squads (season_id, name, target, starts_on, ends_on, created_by)
  VALUES (v_season, v_name, v_target, v_today, v_today + (v_days - 1), v_member.id)
  RETURNING id INTO v_id;
  INSERT INTO public.shift_quest_squad_members (squad_id, member_id, status, responded_at)
  VALUES (v_id, v_member.id, 'active', now());

  PERFORM public.shift_quest__audit(v_member.id, 'squad_create', 'squad', v_id);
  RETURN v_id;
END;
$$;

/**
 * An active member invites a student who has run /start (never staff:
 * 'sq:staff_no_squad'). At most 4 active members and live invites; an invite
 * lives 3 days, and an expired one can be sent again. 'sq:squads_off' while
 * squads are switched off.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_squad_invite(p_actor text, p_squad uuid, p_invitee text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__squad_student(p_actor);
  v_squad public.shift_quest_squads;
  v_invitee public.shift_quest_members;
  v_status text;
  v_invited_at timestamptz;
BEGIN
  PERFORM public.shift_quest__squads_open();
  SELECT * INTO v_squad FROM public.shift_quest_squads WHERE id = p_squad FOR NO KEY UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.shift_quest_squad_members
    WHERE squad_id = p_squad AND member_id = v_member.id AND status = 'active'
  ) THEN
    PERFORM public.shift_quest__fail('not_squad_member');
  END IF;
  IF v_squad.ends_on < public.shift_quest__bkk_today() THEN
    PERFORM public.shift_quest__fail('squad_closed');
  END IF;

  SELECT * INTO v_invitee FROM public.shift_quest_members
  WHERE discord_user_id = p_invitee AND onboarded_at IS NOT NULL;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('invitee_not_started');
  END IF;
  IF cardinality(v_invitee.roles) > 0 THEN
    PERFORM public.shift_quest__fail('staff_no_squad');
  END IF;
  SELECT status, created_at INTO v_status, v_invited_at FROM public.shift_quest_squad_members
  WHERE squad_id = p_squad AND member_id = v_invitee.id;
  IF v_invitee.id = v_member.id OR v_status = 'active'
     OR COALESCE(public.shift_quest__invite_live(v_status, v_invited_at), false) THEN
    PERFORM public.shift_quest__fail('already_member');
  END IF;
  IF (SELECT count(*) FROM public.shift_quest_squad_members sm
      WHERE sm.squad_id = p_squad
        AND (sm.status = 'active' OR public.shift_quest__invite_live(sm.status, sm.created_at))) >= 4 THEN
    PERFORM public.shift_quest__fail('squad_full');
  END IF;

  INSERT INTO public.shift_quest_squad_members (squad_id, member_id, status, invited_by)
  VALUES (p_squad, v_invitee.id, 'invited', v_member.id)
  ON CONFLICT (squad_id, member_id) DO UPDATE
    SET status = 'invited', invited_by = EXCLUDED.invited_by, created_at = now(), responded_at = NULL;

  PERFORM public.shift_quest__notify(
    v_invitee.id,
    'squad_invite:' || p_squad || ':' || v_invitee.id || ':' || extract(epoch FROM clock_timestamp())::text,
    'squad_invite',
    -- actor_id lets erasure scrub the sender's name from this notice later.
    jsonb_build_object('squad_id', p_squad, 'name', v_squad.name, 'from', v_member.display_name,
                       'actor_id', v_member.id),
    p_squad
  );
  PERFORM public.shift_quest__audit(v_member.id, 'squad_invite', 'squad', p_squad);
END;
$$;

/**
 * Accept or decline a live invite. Accepting re-checks the window, the
 * one-squad rule and the size. 'sq:squads_off' while squads are switched off
 * (the invite stays until it expires).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_squad_respond(p_actor text, p_squad uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__squad_student(p_actor);
  v_squad public.shift_quest_squads;
BEGIN
  PERFORM public.shift_quest__squads_open();
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  SELECT * INTO v_squad FROM public.shift_quest_squads WHERE id = p_squad FOR NO KEY UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.shift_quest_squad_members
    WHERE squad_id = p_squad AND member_id = v_member.id
      AND public.shift_quest__invite_live(status, created_at)
  ) THEN
    PERFORM public.shift_quest__fail('no_invite');
  END IF;
  IF p_accept THEN
    IF v_squad.ends_on < public.shift_quest__bkk_today() THEN
      PERFORM public.shift_quest__fail('squad_closed');
    END IF;
    IF public.shift_quest__in_squad(v_member.id, v_squad.season_id) THEN
      PERFORM public.shift_quest__fail('squad_limit');
    END IF;
    IF (SELECT count(*) FROM public.shift_quest_squad_members
        WHERE squad_id = p_squad AND status = 'active') >= 4 THEN
      PERFORM public.shift_quest__fail('squad_full');
    END IF;
  END IF;

  UPDATE public.shift_quest_squad_members
  SET status = CASE WHEN p_accept THEN 'active' ELSE 'declined' END, responded_at = now()
  WHERE squad_id = p_squad AND member_id = v_member.id;
  PERFORM public.shift_quest__audit(v_member.id, CASE WHEN p_accept THEN 'squad_join' ELSE 'squad_decline' END,
                                    'squad', p_squad);
END;
$$;

/** The member who sent an invite takes it back (live or expired). It leaves the invitee's inbox. */
CREATE OR REPLACE FUNCTION public.shift_quest_squad_withdraw(p_actor text, p_squad uuid, p_invitee text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__squad_student(p_actor);
  v_invitee uuid;
BEGIN
  PERFORM 1 FROM public.shift_quest_squads WHERE id = p_squad FOR NO KEY UPDATE;
  SELECT id INTO v_invitee FROM public.shift_quest_members WHERE discord_user_id = p_invitee;
  UPDATE public.shift_quest_squad_members SET status = 'withdrawn', responded_at = now()
  WHERE squad_id = p_squad AND member_id = v_invitee AND status = 'invited' AND invited_by = v_member.id;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('no_invite');
  END IF;
  DELETE FROM public.shift_quest_inbox
  WHERE member_id = v_invitee AND kind = 'squad_invite' AND ref_id = p_squad;
  PERFORM public.shift_quest__audit(v_member.id, 'squad_withdraw', 'squad', p_squad);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_squad_leave(p_actor text, p_squad uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  UPDATE public.shift_quest_squad_members SET status = 'left', responded_at = now()
  WHERE squad_id = p_squad AND member_id = v_member.id AND status = 'active';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_squad_member');
  END IF;
  PERFORM public.shift_quest__audit(v_member.id, 'squad_leave', 'squad', p_squad);
END;
$$;

/**
 * The caller's squads (active, or a live invite), newest first. phase is
 * forming, running or ended; running = phase 'running'. Staff get an empty
 * list (they are never squad members).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_squad_mine(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  IF cardinality(v_member.roles) > 0 THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id, 'name', q.name, 'status', sm.status, 'starts_on', q.starts_on, 'ends_on', q.ends_on,
      'phase', public.shift_quest__squad_phase(q),
      'running', public.shift_quest__squad_phase(q) = 'running',
      'members_active', public.shift_quest__squad_size(q.id),
      'invite_expires_at', CASE WHEN sm.status = 'invited' THEN sm.created_at + public.shift_quest__invite_ttl() END
    ) ORDER BY q.created_at DESC)
    FROM public.shift_quest_squad_members sm
    JOIN public.shift_quest_squads q ON q.id = sm.squad_id
    WHERE sm.member_id = v_member.id
      AND (sm.status = 'active' OR public.shift_quest__invite_live(sm.status, sm.created_at))
  ), '[]'::jsonb);
END;
$$;

/**
 * A squad's sprint, for its active members only. milestones_gained is the
 * group's one number (each project once), and null while the squad is
 * forming (fewer than 3 active members): a group of one or two would read as
 * someone's own count. Members carry names only, never a number to compare.
 * phase 'forming' until 3 members are active.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_squad_view(p_actor text, p_squad uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__squad_student(p_actor);
  v_squad public.shift_quest_squads;
  v_phase text;
BEGIN
  SELECT * INTO v_squad FROM public.shift_quest_squads WHERE id = p_squad;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.shift_quest_squad_members
    WHERE squad_id = p_squad AND member_id = v_member.id AND status = 'active'
  ) THEN
    PERFORM public.shift_quest__fail('not_squad_member');
  END IF;
  v_phase := public.shift_quest__squad_phase(v_squad);
  RETURN jsonb_build_object(
    'id', v_squad.id,
    'name', v_squad.name,
    'target', v_squad.target,
    'starts_on', v_squad.starts_on,
    'ends_on', v_squad.ends_on,
    'days_left', GREATEST(v_squad.ends_on - public.shift_quest__bkk_today() + 1, 0),
    'phase', v_phase,
    'running', v_phase = 'running',
    'members_active', public.shift_quest__squad_size(v_squad.id),
    -- Fewer than three would read as one student's own count, whatever the phase.
    'milestones_gained', CASE WHEN v_phase <> 'forming' AND public.shift_quest__squad_size(v_squad.id) >= 3
                              THEN public.shift_quest__squad_total(v_squad) END,
    'members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', m.display_name, 'me', m.id = v_member.id)
        ORDER BY sm.created_at, m.id)
      FROM public.shift_quest_squad_members sm
      JOIN public.shift_quest_members m ON m.id = sm.member_id
      WHERE sm.squad_id = p_squad AND sm.status = 'active' AND cardinality(m.roles) = 0
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Weekly island post
-- ---------------------------------------------------------------------------

/**
 * The bot calls this every minute. Only during an active season, while
 * sharing is on, Mondays 18:00 to 18:59 Bangkok time, it queues one island
 * post for the celebrate channel per ISO week. No names in params: when it
 * sends, the bot draws the image from shift_quest_island_post_map(), where
 * a plot shows its stage and name only with every member's consent.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_enqueue_island_post(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local timestamp := p_now AT TIME ZONE 'Asia/Bangkok';
  v_season public.shift_quest_seasons := public.shift_quest__active_season();
  v_week text;
  v_key text;
BEGIN
  IF v_season.id IS NULL OR NOT (public.shift_quest__settings()).sharing_enabled THEN
    RETURN 0;
  END IF;
  IF extract(isodow FROM v_local) <> 1 OR extract(hour FROM v_local) <> 18 THEN
    RETURN 0;
  END IF;
  v_week := to_char(v_local, 'IYYY-"W"IW');
  v_key := 'island:' || v_week;
  IF EXISTS (SELECT 1 FROM public.shift_quest_outbox WHERE dedupe_key = v_key) THEN
    RETURN 0;
  END IF;
  PERFORM public.shift_quest__post(v_key, 'celebrate', 'island_weekly',
    jsonb_build_object(
      'week', v_week,
      'goal_milestone', v_season.goal_milestone,
      'goal_count', CASE WHEN v_season.goal_milestone IS NOT NULL THEN public.shift_quest__goal_count(v_season) END,
      'goal_target', v_season.goal_target
    ));
  RETURN 1;
END;
$$;

/** Island schema 2: wave 1 plus seasons (see 20261111090700_shift_quests_island). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the same loop as 20261111090600_shift_quest_bot_role, so the
-- functions above reach the bot and nothing reaches the Data API.
-- ---------------------------------------------------------------------------

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
