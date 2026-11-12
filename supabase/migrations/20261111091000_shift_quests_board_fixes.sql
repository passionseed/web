-- SHIFT High Island on the web: fixes to the quest board (review of PR #268).
--
-- Plan: docs/designs/shift-high-island-web.md. This file:
--
--   * scopes the not_repeatable rule of shift_quest_choose to the current
--     project for side quests, so a side quest done (or tried) in one project
--     can be done again in the next one, as the board shows it. Main quests
--     keep the member-wide rule.
--   * shift_quest__side_open looks for the caller's own open quest before the
--     quest_done check, so a teammate's approval never strands the caller's
--     own open quest of the same side quest.
--   * shift_quest_milestone_start(actor, milestone): start a main quest from
--     the board without submitting, through the same gates as
--     shift_quest_milestone_submit (one shared helper, so both stay in step).
--   * shift_quest_resume(actor, instance): resume one paused quest the caller
--     owns (any kind), for the web's per-quest resume.
--   * caps on shift_quest_help_create and shift_quest_propose, shared by the
--     bot and the website ('sq:too_many_open'): both post into group channels.
--   * draft side quest seeds: icons that are not main quest icons, and
--     side-share-a-lesson branches off the main quest that unlocks it.
--   * shift_quest_schema_version() = 4. The website needs 4, the bot 2.
--
-- Prod-first apply: additive and idempotent (CREATE OR REPLACE with the same
-- signatures, guarded UPDATEs). Keep this file after
-- 20261111090900_shift_quests_board: it repeats both grant loops.

-- ---------------------------------------------------------------------------
-- shift_quest_choose: side quests are not_repeatable per project
-- ---------------------------------------------------------------------------

-- The body of 20261111090100's shift_quest_choose; only the not_repeatable
-- check changes (side quests count the current project only).
CREATE OR REPLACE FUNCTION public.shift_quest_choose(
  p_actor text, p_template uuid, p_goal text, p_next_step text, p_criteria text, p_review_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_template public.shift_quest_templates;
  v_rule uuid;
  v_id uuid;
BEGIN
  SELECT * INTO v_template FROM public.shift_quest_templates WHERE id = p_template AND status = 'published';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;

  -- Serialize this member's choices so two clicks cannot both pass the check.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  -- A side quest belongs to the project (the board, side_open and the unlock
  -- rules all read the current project), so it counts that project only.
  IF NOT v_template.repeatable AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances i
    JOIN public.shift_quest_templates t ON t.id = i.template_id
    WHERE i.member_id = v_member.id AND t.slug = v_template.slug AND i.state <> 'archived'
      AND (NOT v_template.side OR i.project_id IS NOT DISTINCT FROM v_project)
  ) THEN
    PERFORM public.shift_quest__fail('not_repeatable');
  END IF;
  IF p_review_date IS NOT NULL AND p_review_date < (now() AT TIME ZONE 'Asia/Bangkok')::date THEN
    PERFORM public.shift_quest__fail('date_in_past');
  END IF;
  -- An island milestone grows a project's tree, so it needs a current project
  -- the caller is still on (a stale or forged choice would file it nowhere).
  IF v_template.milestone IS NOT NULL AND v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  -- One open quest per project and island milestone (milestone column and
  -- unique index: 20261111090700_shift_quests_island): teammates share it.
  IF v_template.milestone IS NOT NULL AND v_project IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances
    WHERE project_id = v_project AND milestone = v_template.milestone
      AND state IN ('active', 'paused', 'submitted', 'clarification', 'appealed')
  ) THEN
    PERFORM public.shift_quest__fail('milestone_open');
  END IF;

  -- Pin the rule version published now; later edits never change this quest.
  SELECT id INTO v_rule FROM public.shift_quest_reward_rules
  WHERE key = v_template.reward_rule_key AND status = 'published';

  BEGIN
    INSERT INTO public.shift_quest_instances (
      member_id, project_id, template_id, milestone, title, goal, next_step, criteria, review_date, reward_rule_id
    )
    VALUES (
      v_member.id, v_project, v_template.id, v_template.milestone, v_template.title,
      public.shift_quest__check_len(p_goal, 1000, true),
      public.shift_quest__check_len(p_next_step, 500, true),
      COALESCE(public.shift_quest__check_len(p_criteria, 1000, false), left(v_template.evidence_criteria, 1000)),
      p_review_date, v_rule
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- A teammate opened the same milestone a moment earlier.
    PERFORM public.shift_quest__fail('milestone_open');
  END;

  PERFORM public.shift_quest__audit(v_member.id, 'quest_choose', 'quest', v_id);
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- shift_quest__side_open: the caller's own open quest first
-- ---------------------------------------------------------------------------

/**
 * The shared start of shift_quest_side_choose and shift_quest_side_submit.
 * Gates, in order: a student ('not_started'), a current project
 * ('no_project'), a published side template ('template_unavailable'), then,
 * under an advisory lock on the caller and the template, unlocked in the
 * project ('quest_locked'). The caller's own open quest of this side quest in
 * the project (active, clarification, submitted, paused or appealed) is
 * returned next, even when a teammate's quest of it was approved meanwhile;
 * for a submit an appealed one is 'sq:quest_appealed' and a paused one is
 * resumed. Only a new quest is refused once the project has it approved
 * ('quest_done', unless repeatable). Otherwise it is chosen exactly as
 * shift_quest_choose would (goal = the template's purpose, next step '-');
 * a declined quest of a non-repeatable side quest in this project is archived
 * first, so "try again" works (shift_quest_choose counts side quests per
 * project). Returns {instance_id, version, created}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__side_open(p_actor text, p_template uuid, p_submit boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_template public.shift_quest_templates;
  v_missing jsonb;
  v_id uuid;
  v_state text;
  v_version integer;
  v_declined uuid;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  SELECT * INTO v_template FROM public.shift_quest_templates
  WHERE id = p_template AND side AND status = 'published';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;

  -- Two presses of the same side quest take turns. Taken before any row lock,
  -- and nothing else takes it, so it cannot join a lock cycle.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_side:' || v_member.id || ':' || p_template));

  v_missing := public.shift_quest__side_missing(v_project, v_template);
  IF jsonb_array_length(v_missing -> 'missing_milestones') > 0
     OR jsonb_array_length(v_missing -> 'missing_slugs') > 0 THEN
    PERFORM public.shift_quest__fail('quest_locked');
  END IF;

  SELECT i.id, i.state, i.version INTO v_id, v_state, v_version
  FROM public.shift_quest_instances i
  JOIN public.shift_quest_templates t ON t.id = i.template_id
  WHERE i.member_id = v_member.id AND i.project_id = v_project AND t.slug = v_template.slug
    AND i.state IN ('active', 'clarification', 'submitted', 'paused', 'appealed')
  ORDER BY i.updated_at DESC, i.created_at DESC
  LIMIT 1
  FOR NO KEY UPDATE OF i;

  IF v_id IS NOT NULL THEN
    IF p_submit AND v_state = 'appealed' THEN
      PERFORM public.shift_quest__fail('quest_appealed');
    ELSIF p_submit AND v_state = 'paused' THEN
      v_version := public.shift_quest_set_state(p_actor, v_id, NULL, 'resume');
    END IF;
    RETURN jsonb_build_object('instance_id', v_id, 'version', v_version, 'created', false);
  END IF;

  IF NOT v_template.repeatable AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances i
    JOIN public.shift_quest_templates t ON t.id = i.template_id
    WHERE i.project_id = v_project AND i.state = 'approved' AND t.slug = v_template.slug
  ) THEN
    PERFORM public.shift_quest__fail('quest_done');
  END IF;

  IF NOT v_template.repeatable THEN
    FOR v_declined IN
      SELECT i.id FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.member_id = v_member.id AND i.project_id = v_project AND t.slug = v_template.slug
        AND i.state = 'declined'
      ORDER BY i.id
    LOOP
      PERFORM public.shift_quest_set_state(p_actor, v_declined, NULL, 'archive');
    END LOOP;
  END IF;

  v_id := public.shift_quest_choose(p_actor, v_template.id, left(v_template.purpose, 1000), '-', NULL, NULL);
  SELECT version INTO v_version FROM public.shift_quest_instances WHERE id = v_id;
  RETURN jsonb_build_object('instance_id', v_id, 'version', v_version, 'created', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Main quests: one gate for start and submit
-- ---------------------------------------------------------------------------

/**
 * The shared start of shift_quest_milestone_start and
 * shift_quest_milestone_submit. Gates, in order: a student ('not_started'), a
 * current project ('no_project'), a published milestone template
 * ('template_unavailable'), then, under the advisory lock on the project and
 * milestone, not approved in the project yet ('milestone_done', unless
 * repeatable). The project's one open quest for the milestone: the caller's
 * own is reused (a paused one resumed); a teammate's is 'sq:milestone_open';
 * one under appeal is 'sq:milestone_appealed'. With none open it is chosen
 * exactly as shift_quest_choose would (goal = the template's purpose, next
 * step '-'). Returns {instance_id, version, created}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__milestone_open(p_actor text, p_milestone smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_template public.shift_quest_templates;
  v_id uuid;
  v_state text;
  v_owner uuid;
  v_version integer;
  v_created boolean := false;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  SELECT * INTO v_template FROM public.shift_quest_templates
  WHERE milestone = p_milestone AND status = 'published';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;

  -- Teammates pressing the same milestone take turns. Taken before any row
  -- lock, and nothing else takes it, so it cannot join a lock cycle.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_milestone:' || v_project || ':' || p_milestone));

  IF NOT v_template.repeatable AND p_milestone = ANY (public.shift_quest__milestones(v_project)) THEN
    PERFORM public.shift_quest__fail('milestone_done');
  END IF;

  SELECT i.id, i.state, i.member_id INTO v_id, v_state, v_owner
  FROM public.shift_quest_instances i
  WHERE i.project_id = v_project AND i.milestone = p_milestone
    AND i.state IN ('active', 'clarification', 'submitted', 'paused', 'appealed')
  FOR NO KEY UPDATE;

  IF v_id IS NULL THEN
    v_id := public.shift_quest_choose(
      p_actor, v_template.id, left(v_template.purpose, 1000), '-', NULL, NULL
    );
    v_created := true;
  ELSIF v_state = 'appealed' THEN
    PERFORM public.shift_quest__fail('milestone_appealed');
  ELSIF v_owner <> v_member.id THEN
    PERFORM public.shift_quest__fail('milestone_open');
  ELSIF v_state = 'paused' THEN
    PERFORM public.shift_quest_set_state(p_actor, v_id, NULL, 'resume');
  END IF;

  SELECT version INTO v_version FROM public.shift_quest_instances WHERE id = v_id;
  RETURN jsonb_build_object('instance_id', v_id, 'version', v_version, 'created', v_created);
END;
$$;

/**
 * "I'm starting this main quest": open it without submitting anything, so it
 * shows as the caller's active quest (and as held to teammates). See
 * shift_quest__milestone_open. Returns {instance_id, version, created}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_milestone_start(p_actor text, p_milestone smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest__milestone_open(p_actor, p_milestone);
END;
$$;

/**
 * "I reached milestone N": one step. The milestone's open quest comes from
 * shift_quest__milestone_open (the same gates as shift_quest_milestone_start),
 * then it is submitted through shift_quest_submit: proof as evidence, the
 * reflection required, visible to reviewers only, no contributors.
 * Returns {instance_id, submission_id, revision, version, created}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_milestone_submit(
  p_actor text, p_milestone smallint, p_proof text, p_reflection text, p_artifact_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open jsonb := public.shift_quest__milestone_open(p_actor, p_milestone);
  v_id uuid := (v_open ->> 'instance_id')::uuid;
  v_result jsonb;
BEGIN
  v_result := public.shift_quest_submit(
    p_actor, v_id, NULL, p_proof, p_reflection, p_artifact_url, 'reviewers', NULL, '{}'::text[]
  );
  RETURN jsonb_build_object(
    'instance_id', v_id,
    'submission_id', v_result -> 'submission_id',
    'revision', v_result -> 'revision',
    'version', v_result -> 'version',
    'created', v_open -> 'created'
  );
END;
$$;

/**
 * Resume one paused quest the caller owns, of any kind (main, side or
 * proposed), through shift_quest_set_state ('sq:not_found' for someone
 * else's, 'sq:bad_state' unless paused). Returns the new version.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_resume(p_actor text, p_instance uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest_set_state(p_actor, p_instance, NULL, 'resume');
END;
$$;

-- ---------------------------------------------------------------------------
-- Caps on posts into shared channels (bot and website alike)
-- ---------------------------------------------------------------------------

/**
 * Refuses a member who already has too much waiting ('sq:too_many_open'):
 * help requests (p_kind 'help': 3 open or claimed, or 5 asked in the last
 * hour) or proposed quests (p_kind 'propose': 5 open ones a mentor has not
 * agreed yet). Takes an advisory lock on the member and kind first, so two
 * calls at once cannot both pass the count; nothing else takes it.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__cap(p_member uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_cap:' || p_kind || ':' || p_member));
  IF p_kind = 'help' THEN
    IF (SELECT count(*) FROM public.shift_quest_help_requests
        WHERE member_id = p_member AND status IN ('open', 'claimed')) >= 3
       OR (SELECT count(*) FROM public.shift_quest_help_requests
           WHERE member_id = p_member AND created_at > now() - interval '1 hour') >= 5 THEN
      PERFORM public.shift_quest__fail('too_many_open');
    END IF;
  ELSIF p_kind = 'propose' THEN
    IF (SELECT count(*) FROM public.shift_quest_instances
        WHERE member_id = p_member AND template_id IS NULL AND reward_agreed_at IS NULL
          AND state IN ('active', 'paused', 'clarification', 'submitted', 'appealed')) >= 5 THEN
      PERFORM public.shift_quest__fail('too_many_open');
    END IF;
  ELSE
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
END;
$$;

-- The body of 20261111090100's shift_quest_help_create, plus the cap.
CREATE OR REPLACE FUNCTION public.shift_quest_help_create(
  p_actor text, p_summary text, p_visibility text, p_source text, p_instance uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_summary text := public.shift_quest__check_len(p_summary, 1000, true);
  v_id uuid;
BEGIN
  IF p_visibility NOT IN ('community', 'mentors') OR COALESCE(p_source, 'student') NOT IN ('student', 'progress') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_instance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_instances WHERE id = p_instance AND member_id = v_member.id
  ) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__cap(v_member.id, 'help');

  INSERT INTO public.shift_quest_help_requests (member_id, project_id, instance_id, summary, visibility, source)
  VALUES (v_member.id, public.shift_quest__current_project(v_member), p_instance, v_summary, p_visibility,
          COALESCE(p_source, 'student'))
  RETURNING id INTO v_id;

  IF p_visibility = 'community' THEN
    PERFORM public.shift_quest__post('help:' || v_id, 'help', 'help_community',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_id, 'summary', v_summary));
  ELSE
    PERFORM public.shift_quest__post('help:' || v_id, 'staff', 'help_mentors',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_id, 'summary', v_summary, 'source', p_source));
  END IF;

  PERFORM public.shift_quest__audit(v_member.id, 'help_create', 'help', v_id);
  RETURN v_id;
END;
$$;

-- The body of 20261111090100's shift_quest_propose, plus the cap.
CREATE OR REPLACE FUNCTION public.shift_quest_propose(
  p_actor text, p_title text, p_why text, p_goal text, p_criteria text, p_next_step text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_id uuid;
BEGIN
  PERFORM public.shift_quest__cap(v_member.id, 'propose');
  INSERT INTO public.shift_quest_instances (member_id, project_id, title, why, goal, next_step, criteria)
  VALUES (
    v_member.id, public.shift_quest__current_project(v_member),
    public.shift_quest__check_len(p_title, 80, true),
    public.shift_quest__check_len(p_why, 1000, false),
    public.shift_quest__check_len(p_goal, 1000, true),
    public.shift_quest__check_len(p_next_step, 500, true),
    public.shift_quest__check_len(p_criteria, 1000, true)
  )
  RETURNING id INTO v_id;

  -- A mentor agrees scope and any reward before reward-bearing work starts.
  PERFORM public.shift_quest__post(
    'proposal:' || v_id || ':1', 'staff', 'proposal_needs_agreement',
    jsonb_build_object('member_id', v_member.id, 'instance_id', v_id, 'title', left(p_title, 80))
  );
  PERFORM public.shift_quest__audit(v_member.id, 'quest_propose', 'quest', v_id);
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Draft side quest seeds (still DRAFT COPY, unpublished until reviewed)
-- ---------------------------------------------------------------------------

-- Icons that never repeat a main quest's icon, and share-a-lesson hangs off
-- the main quest it needs (3). Only rows still in draft at version 1 change.
UPDATE public.shift_quest_templates t
SET icon = v.icon, branch_of = v.branch_of
FROM (VALUES
  ('side-five-voices', 'bubble', 1::smallint),
  ('side-outside-circle', 'eye', 3::smallint),
  ('side-fix-one-thing', 'gear', 3::smallint),
  ('side-demo-three-minutes', 'star', 3::smallint),
  ('side-handoff-page', 'scroll', 5::smallint),
  ('side-share-a-lesson', 'well', 3::smallint)
) AS v (slug, icon, branch_of)
WHERE t.slug = v.slug AND t.version = 1 AND t.status = 'draft' AND t.side
  AND (t.icon IS DISTINCT FROM v.icon OR t.branch_of IS DISTINCT FROM v.branch_of);

/** Island schema 4: the board fixes (milestone start, resume, caps). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 4;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the loop of 20261111090600_shift_quest_bot_role, then the web
-- allowlist of 20261111090900_shift_quests_board plus the two new functions.
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

-- The website executes exactly this allowlist (student functions it calls)
-- among the shift_quest_* functions. Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges) and web_board.ts.
-- As a LOGIN role it is also a member of PUBLIC, so any function outside
-- shift_quest_* that still grants EXECUTE to PUBLIC is reachable too: see the
-- runbook check in docs/features/shift-high-quests.md before setting LOGIN.
DO $$
DECLARE
  fn record;
  v_sig text;
  v_proc regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM shift_quest_web', fn.sig);
  END LOOP;

  FOREACH v_sig IN ARRAY ARRAY[
    'public.shift_quest_schema_version()',
    'public.shift_quest_session(text, text)',
    'public.shift_quest_start(text, text, boolean)',
    'public.shift_quest_island(text)',
    'public.shift_quest_island_map(text)',
    'public.shift_quest_board(text)',
    'public.shift_quest_checkin(text, text)',
    'public.shift_quest_rest(text, boolean)',
    'public.shift_quest_resume(text, uuid)',
    'public.shift_quest_island_optin(text, uuid, boolean)',
    'public.shift_quest_milestone_start(text, smallint)',
    'public.shift_quest_milestone_submit(text, smallint, text, text, text)',
    'public.shift_quest_side_choose(text, uuid)',
    'public.shift_quest_side_submit(text, uuid, text, text, text)',
    'public.shift_quest_propose(text, text, text, text, text, text)',
    'public.shift_quest_submit(text, uuid, integer, text, text, text, text, text, text[])',
    'public.shift_quest_help_create(text, text, text, text, uuid)',
    'public.shift_quest_project_create(text, text, text, text)',
    'public.shift_quest_project_list(text)',
    'public.shift_quest_project_respond(text, uuid, boolean)'
  ]
  LOOP
    v_proc := to_regprocedure(v_sig);
    IF v_proc IS NULL THEN
      RAISE EXCEPTION 'shift_quest_web allowlist: % does not exist', v_sig;
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO shift_quest_web', v_proc);
  END LOOP;
END;
$$;
