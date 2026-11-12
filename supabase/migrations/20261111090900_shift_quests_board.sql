-- SHIFT High Island on the web: the quest board, side quests and the web role.
--
-- Plan: docs/designs/shift-high-island-web.md ("Database: side quests and the
-- board"). The website at /shift/island is where students play; the bot stays
-- the doorbell. This file adds:
--
--   * side quests: templates with side = true that branch off a main quest
--     (branch_of), suit some project routes (route_keys, a soft filter only)
--     and unlock by prerequisites in the current project (requires_milestones,
--     requires_slugs). One trigger refuses a locked side quest on every path.
--     Side quests never grow the tree (they have no milestone).
--   * shift_quest_board(actor): the main quests, side quests, the caller's
--     proposed quests and open help requests in one read.
--   * shift_quest_side_choose / shift_quest_side_submit: one-step side quests,
--     mirroring shift_quest_milestone_submit.
--   * eleven DRAFT side quests in Thai, unpublished until reviewed.
--   * shift_quest_schema_version() = 3. The bot needs 2 and keeps working.
--   * shift_quest_web: a least-privilege login for the website, the same model
--     as shift_quest_bot (20261111090600). Among the shift_quest_* functions it
--     can execute only an explicit allowlist of student functions: no table,
--     no helper, no staff, review, admin, outbox or data function. As a LOGIN
--     role it is also in PUBLIC: other public functions that still grant
--     EXECUTE to PUBLIC are reachable (runbook check in
--     docs/features/shift-high-quests.md before setting LOGIN).
--
-- LOGIN and the password are set out of band, never in this public repo:
--   ALTER ROLE shift_quest_web WITH LOGIN PASSWORD '<SCRAM verifier>';
-- The website connects through the Supavisor pooler as
-- shift_quest_web.<project ref> (SHIFT_QUEST_DATABASE_URL in Vercel).
--
-- The grant loop of later migrations never touches shift_quest_web, so a new
-- function stays closed to the website until a migration grants it on
-- purpose (and a function that is dropped and created again loses its grant).
-- Every later student function the website needs must be added to the
-- allowlist that way, and to check_privileges in
-- supabase/tests/shift_quests/run-local.sh.
--
-- Prod-first apply: additive and idempotent. Keep this file after
-- 20261111090800_shift_quests_seasons: it repeats the grant loop.

-- ---------------------------------------------------------------------------
-- Template columns
-- ---------------------------------------------------------------------------

-- A side quest on the web board (never a milestone, never in the bot's browse).
ALTER TABLE public.shift_quest_templates ADD COLUMN IF NOT EXISTS side boolean NOT NULL DEFAULT false;
-- Routes it is meant for. Null: every route. A soft filter: any route may take it.
ALTER TABLE public.shift_quest_templates ADD COLUMN IF NOT EXISTS route_keys text[] NULL;
-- Main quests (1..7) the current project must have approved.
ALTER TABLE public.shift_quest_templates ADD COLUMN IF NOT EXISTS requires_milestones smallint[] NOT NULL DEFAULT '{}';
-- Side quest slugs the current project must have an approved quest of (any member's).
ALTER TABLE public.shift_quest_templates ADD COLUMN IF NOT EXISTS requires_slugs text[] NOT NULL DEFAULT '{}';
-- The main quest it hangs off on the board.
ALTER TABLE public.shift_quest_templates ADD COLUMN IF NOT EXISTS branch_of smallint NULL;
-- Web icon key.
ALTER TABLE public.shift_quest_templates ADD COLUMN IF NOT EXISTS icon text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_quest_templates_route_keys' AND conrelid = 'public.shift_quest_templates'::regclass
  ) THEN
    ALTER TABLE public.shift_quest_templates ADD CONSTRAINT shift_quest_templates_route_keys
      CHECK (route_keys <@ ARRAY['software', 'creative', 'service', 'other']::text[]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_quest_templates_requires_milestones' AND conrelid = 'public.shift_quest_templates'::regclass
  ) THEN
    ALTER TABLE public.shift_quest_templates ADD CONSTRAINT shift_quest_templates_requires_milestones
      CHECK (requires_milestones <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_quest_templates_branch_of' AND conrelid = 'public.shift_quest_templates'::regclass
  ) THEN
    ALTER TABLE public.shift_quest_templates ADD CONSTRAINT shift_quest_templates_branch_of
      CHECK (branch_of BETWEEN 1 AND 7);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_quest_templates_icon' AND conrelid = 'public.shift_quest_templates'::regclass
  ) THEN
    ALTER TABLE public.shift_quest_templates ADD CONSTRAINT shift_quest_templates_icon
      CHECK (icon ~ '^[a-z_]{2,20}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'shift_quest_templates_side_no_milestone' AND conrelid = 'public.shift_quest_templates'::regclass
  ) THEN
    ALTER TABLE public.shift_quest_templates ADD CONSTRAINT shift_quest_templates_side_no_milestone
      CHECK (NOT side OR milestone IS NULL);
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted to the bot or the website)
-- ---------------------------------------------------------------------------

/**
 * What still locks a side quest for a project: {missing_milestones: int[],
 * missing_slugs: text[]}. A required milestone is missing until the project
 * has it approved (shift_quest__milestones); a required slug until the
 * project has an approved quest of that slug, whoever's it is. Without a
 * project everything required is missing. Both lists keep the template's order.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__side_missing(p_project uuid, p_template public.shift_quest_templates)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH done AS (
    SELECT CASE WHEN p_project IS NULL THEN '{}'::integer[]
                ELSE public.shift_quest__milestones(p_project)::integer[] END AS milestones
  )
  SELECT jsonb_build_object(
    'missing_milestones', to_jsonb(COALESCE((
      SELECT array_agg(m.v ORDER BY m.n)
      FROM unnest(p_template.requires_milestones::integer[]) WITH ORDINALITY AS m(v, n), done
      WHERE NOT (m.v = ANY (done.milestones))
    ), '{}'::integer[])),
    'missing_slugs', to_jsonb(COALESCE((
      SELECT array_agg(s.v ORDER BY s.n)
      FROM unnest(p_template.requires_slugs) WITH ORDINALITY AS s(v, n)
      WHERE p_project IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.shift_quest_instances i
        JOIN public.shift_quest_templates t ON t.id = i.template_id
        WHERE i.project_id = p_project AND i.state = 'approved' AND t.slug = s.v
      )
    ), '{}'::text[]))
  );
$$;

/**
 * One quest as the board shows the caller's own work on it (QuestMine):
 * {instance_id, state, version, updated_at, latest_submission: null |
 * {revision, status, created_at}, latest_review: null | {outcome, feedback,
 * created_at}}. Built from shift_quest__quest_json, so both stay in step.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__quest_mine(p_instance public.shift_quest_instances)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'instance_id', q -> 'id',
    'state', q -> 'state',
    'version', q -> 'version',
    'updated_at', to_jsonb(p_instance.updated_at),
    'latest_submission', CASE WHEN jsonb_typeof(q -> 'latest_submission') = 'object'
                              THEN (q -> 'latest_submission') - 'id' ELSE 'null'::jsonb END,
    'latest_review', COALESCE(q -> 'latest_review', 'null'::jsonb)
  )
  FROM (SELECT public.shift_quest__quest_json(p_instance) AS q) x;
$$;

/**
 * The one gate for side quests, on every path that creates a quest (the
 * board's side_choose and side_submit, the bot's shift_quest_choose, a direct
 * insert): a side quest needs a project ('sq:no_project') and everything it
 * requires in that project ('sq:quest_locked').
 */
CREATE OR REPLACE FUNCTION public.shift_quest__side_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.shift_quest_templates;
  v_missing jsonb;
BEGIN
  SELECT * INTO v_template FROM public.shift_quest_templates WHERE id = NEW.template_id;
  IF NOT FOUND OR NOT v_template.side THEN
    RETURN NEW;
  END IF;
  IF NEW.project_id IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  v_missing := public.shift_quest__side_missing(NEW.project_id, v_template);
  IF jsonb_array_length(v_missing -> 'missing_milestones') > 0
     OR jsonb_array_length(v_missing -> 'missing_slugs') > 0 THEN
    PERFORM public.shift_quest__fail('quest_locked');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shift_quest_instances_side_gate ON public.shift_quest_instances;
CREATE TRIGGER shift_quest_instances_side_gate
  BEFORE INSERT ON public.shift_quest_instances
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION public.shift_quest__side_gate();

/**
 * The shared start of shift_quest_side_choose and shift_quest_side_submit.
 * Gates, in order: a student ('not_started'), a current project
 * ('no_project'), a published side template ('template_unavailable'), then,
 * under an advisory lock on the caller and the template, unlocked in the
 * project ('quest_locked') and, unless repeatable, not approved in the
 * project yet ('quest_done'). Returns the caller's open quest of this side
 * quest in the project (active, clarification, submitted, paused or
 * appealed); for a submit an appealed one is 'sq:quest_appealed' and a paused
 * one is resumed. With none open it is chosen exactly as shift_quest_choose
 * would (goal = the template's purpose, next step '-'); a declined quest of a
 * non-repeatable side quest is archived first, so "try again" works (the
 * bot's not_repeatable rule counts every quest that is not archived).
 * Returns {instance_id, version, created}.
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
  IF NOT v_template.repeatable AND EXISTS (
    SELECT 1 FROM public.shift_quest_instances i
    JOIN public.shift_quest_templates t ON t.id = i.template_id
    WHERE i.project_id = v_project AND i.state = 'approved' AND t.slug = v_template.slug
  ) THEN
    PERFORM public.shift_quest__fail('quest_done');
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
-- Bot browse: side quests are web-only
-- ---------------------------------------------------------------------------

-- The body of 20261111090100's shift_quest_templates, plus AND NOT t.side.
CREATE OR REPLACE FUNCTION public.shift_quest_templates(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_awards boolean := public.shift_quest__awards_live();
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', t.id, 'slug', t.slug, 'title', t.title, 'purpose', t.purpose, 'routes', t.routes,
      'examples', t.examples, 'evidence_criteria', t.evidence_criteria,
      'reflection_prompt', t.reflection_prompt, 'support_options', t.support_options,
      'repeatable', t.repeatable,
      'milestone', t.milestone,
      'reward', CASE WHEN v_awards THEN public.shift_quest__rule_summary(r.id) END,
      'taken', EXISTS (
        SELECT 1 FROM public.shift_quest_instances i
        JOIN public.shift_quest_templates t2 ON t2.id = i.template_id
        WHERE i.member_id = v_member.id AND t2.slug = t.slug AND i.state <> 'archived'
      )
    ) ORDER BY t.sort_order, t.title)
    FROM public.shift_quest_templates t
    LEFT JOIN public.shift_quest_reward_rules r ON r.key = t.reward_rule_key AND r.status = 'published'
    WHERE t.status = 'published' AND NOT t.side
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Students: the board and side quests
-- ---------------------------------------------------------------------------

/**
 * The web quest board for one student.
 *   project:   null, or {id, route, stage, milestones_done[]} of the current project
 *   main:      the published milestone templates by milestone, each with done,
 *              in_flight (the project's one open quest for it, as in
 *              shift_quest_island) and mine
 *   side:      the published side quests by branch_of (nulls last), sort_order,
 *              slug, each with route_match, locked, missing_milestones,
 *              missing_slugs, approved (in the project, by anyone) and mine
 *   proposed:  the caller's own proposed quests that are not archived, newest
 *              first, at most 20
 *   help_open: the caller's help requests still open or claimed
 * mine is the caller's most recent quest that is not archived for that
 * milestone or side quest in the current project (QuestMine,
 * shift_quest__quest_mine), never another member's. Without a project every
 * side quest is locked.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_board(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project_id uuid := public.shift_quest__current_project(v_member);
  v_project public.shift_quest_projects;
  v_done smallint[] := '{}';
BEGIN
  IF v_project_id IS NOT NULL THEN
    SELECT * INTO v_project FROM public.shift_quest_projects WHERE id = v_project_id;
    v_done := public.shift_quest__milestones(v_project_id);
  END IF;

  RETURN jsonb_build_object(
    'project', CASE WHEN v_project_id IS NOT NULL THEN jsonb_build_object(
      'id', v_project.id,
      'route', v_project.route,
      'stage', cardinality(v_done),
      'milestones_done', to_jsonb(v_done::integer[])
    ) END,
    'main', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'milestone', t.milestone,
        'template_id', t.id,
        'slug', t.slug,
        'title', t.title,
        'purpose', t.purpose,
        'evidence_criteria', t.evidence_criteria,
        'reflection_prompt', t.reflection_prompt,
        'done', t.milestone = ANY (v_done),
        -- The project's one open quest for this milestone (any member's).
        'in_flight', (
          SELECT jsonb_build_object('instance_id', i.id, 'state', i.state, 'version', i.version,
                                    'mine', i.member_id = v_member.id, 'owner', o.display_name)
          FROM public.shift_quest_instances i
          JOIN public.shift_quest_members o ON o.id = i.member_id
          WHERE i.project_id = v_project_id AND i.milestone = t.milestone
            AND i.state IN ('active', 'clarification', 'submitted', 'paused', 'appealed')
          ORDER BY i.updated_at DESC LIMIT 1
        ),
        'mine', (
          SELECT public.shift_quest__quest_mine(i)
          FROM public.shift_quest_instances i
          WHERE i.member_id = v_member.id AND i.project_id = v_project_id AND i.milestone = t.milestone
            AND i.state <> 'archived'
          ORDER BY i.updated_at DESC, i.created_at DESC LIMIT 1
        )
      ) ORDER BY t.milestone)
      FROM public.shift_quest_templates t
      WHERE t.status = 'published' AND t.milestone IS NOT NULL
    ), '[]'::jsonb),
    'side', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'template_id', s.id,
        'slug', s.slug,
        'title', s.title,
        'purpose', s.purpose,
        'examples', s.examples,
        'evidence_criteria', s.evidence_criteria,
        'reflection_prompt', s.reflection_prompt,
        'route_keys', to_jsonb(s.route_keys),
        'route_match', v_project_id IS NOT NULL AND (s.route_keys IS NULL OR v_project.route = ANY (s.route_keys)),
        'branch_of', s.branch_of,
        'requires_milestones', to_jsonb(s.requires_milestones::integer[]),
        'requires_slugs', to_jsonb(s.requires_slugs),
        'icon', s.icon,
        'repeatable', s.repeatable,
        'sort_order', s.sort_order,
        'locked', v_project_id IS NULL
          OR jsonb_array_length(s.missing -> 'missing_milestones') > 0
          OR jsonb_array_length(s.missing -> 'missing_slugs') > 0,
        'missing_milestones', s.missing -> 'missing_milestones',
        'missing_slugs', s.missing -> 'missing_slugs',
        'approved', v_project_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.shift_quest_instances i
          JOIN public.shift_quest_templates t2 ON t2.id = i.template_id
          WHERE i.project_id = v_project_id AND i.state = 'approved' AND t2.slug = s.slug
        ),
        'mine', (
          SELECT public.shift_quest__quest_mine(i)
          FROM public.shift_quest_instances i
          JOIN public.shift_quest_templates t2 ON t2.id = i.template_id
          WHERE i.member_id = v_member.id AND i.project_id = v_project_id AND t2.slug = s.slug
            AND i.state <> 'archived'
          ORDER BY i.updated_at DESC, i.created_at DESC LIMIT 1
        )
      ) ORDER BY s.branch_of NULLS LAST, s.sort_order, s.slug)
      FROM (
        SELECT t.*, public.shift_quest__side_missing(v_project_id, t) AS missing
        FROM public.shift_quest_templates t
        WHERE t.status = 'published' AND t.side
      ) s
    ), '[]'::jsonb),
    'proposed', COALESCE((
      SELECT jsonb_agg(public.shift_quest__quest_mine(i)
                         || jsonb_build_object('title', i.title, 'goal', i.goal, 'criteria', i.criteria)
                       ORDER BY i.created_at DESC, i.id)
      FROM (
        SELECT * FROM public.shift_quest_instances
        WHERE member_id = v_member.id AND template_id IS NULL AND state <> 'archived'
        ORDER BY created_at DESC, id
        LIMIT 20
      ) i
    ), '[]'::jsonb),
    'help_open', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', h.id, 'instance_id', h.instance_id, 'status', h.status,
        'visibility', h.visibility, 'created_at', h.created_at
      ) ORDER BY h.created_at DESC, h.id)
      FROM (
        SELECT * FROM public.shift_quest_help_requests
        WHERE member_id = v_member.id AND status IN ('open', 'claimed')
        ORDER BY created_at DESC, id
        LIMIT 50
      ) h
    ), '[]'::jsonb)
  );
END;
$$;

/**
 * Start a side quest (or find the one already open): see
 * shift_quest__side_open. Returns {instance_id, version, created}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_side_choose(p_actor text, p_template uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.shift_quest__side_open(p_actor, p_template, false);
END;
$$;

/**
 * "I did this side quest": one step, like shift_quest_milestone_submit. The
 * caller's open quest of it is reused (a paused one resumed, an appealed one
 * refused with 'sq:quest_appealed'), or one is chosen
 * (shift_quest__side_open); then it is submitted through shift_quest_submit:
 * proof as evidence, the reflection required, visible to reviewers only, no
 * contributors. A refused submit leaves no quest behind.
 * Returns {instance_id, submission_id, revision, version, created}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_side_submit(
  p_actor text, p_template uuid, p_proof text, p_reflection text, p_artifact_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open jsonb := public.shift_quest__side_open(p_actor, p_template, true);
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

-- ---------------------------------------------------------------------------
-- Draft side quests
--
-- DRAFT COPY: needs the founder's multi-model Thai review (AGENTS.md) before
-- an admin publishes each slug (/admin template, i.e.
-- shift_quest_admin_template_state(actor, slug, true)). Seeded as 'draft', so
-- nobody sees them until then. No reward rule. Inserts only what is missing:
-- a reviewed rewrite is a new version (or an UPDATE before publishing).
-- ---------------------------------------------------------------------------

INSERT INTO public.shift_quest_templates (
  slug, version, title, purpose, routes, examples, evidence_criteria, reflection_prompt, support_options,
  repeatable, status, sort_order, side, route_keys, requires_milestones, requires_slugs, branch_of, icon
)
VALUES
(
  'side-five-voices', 1, 'ฟังเสียงจริงอีก 5 คน',
  'คุยกับคนที่เจอปัญหานี้จริงเพิ่มอีก 5 คน เพื่อดูว่าเรื่องที่คุณเลือกยังจริงอยู่ไหม',
  'ทุกเส้นทาง',
  'คุยกับเพื่อนต่างห้อง รุ่นพี่ หรือคนในชุมชนที่เจอเรื่องเดียวกัน',
  'สรุปแบบไม่ระบุตัวตนว่าคุยกับใครบ้าง (เช่น "นักเรียน ม.4 สามคน") ได้ยินอะไรซ้ำ และอะไรไม่ตรงกับที่คิดไว้',
  'ประโยคไหนจากที่คุยที่คุณยังคิดถึงอยู่',
  'ขอให้ทีมพี่เลี้ยงช่วยดูคำถามก่อนไปคุยได้',
  false, 'draft', 110, true, NULL, '{1}', '{}', 1, 'compass'
),
(
  'side-open-on-phone', 1, 'ให้คนอื่นเปิดได้จากมือถือ',
  'ทำให้งานของคุณเปิดใช้ได้จากลิงก์เดียวบนมือถือ โดยไม่ต้องรันบนเครื่องคุณ',
  'ซอฟต์แวร์',
  'เว็บที่เปิดจากลิงก์ได้เลย หรือแอปที่ลองผ่านลิงก์ทดสอบได้',
  'ลิงก์ที่เปิดได้จริง และบอกว่าลองเปิดบนมือถือแบบไหนแล้ว',
  'อะไรพังตอนย้ายจากเครื่องคุณขึ้นเว็บ แล้วแก้ยังไง',
  'ติดตอนขึ้นเว็บ กด ติด แล้วถามเพื่อนในห้องช่วยเหลือได้',
  false, 'draft', 120, true, '{software}', '{2}', '{}', 2, 'gear'
),
(
  'side-readme', 1, 'เขียนคู่มือให้เพื่อนรันเองได้',
  'เขียน README สั้นๆ ที่ทำให้เพื่อนรันหรือใช้งานของคุณได้เองโดยไม่ต้องถามคุณ',
  'ซอฟต์แวร์',
  'วิธีติดตั้ง วิธีรัน และตัวอย่างการใช้งานหนึ่งอย่าง',
  'ลิงก์ README และบอกว่าใครลองทำตามแล้ว (บอกแค่บทบาท เช่น "เพื่อนร่วมห้อง")',
  'เพื่อนติดตรงไหนตอนทำตาม',
  'ชวนเพื่อนในห้องช่วยเหลือลองทำตามแล้วบอกว่าติดตรงไหน',
  false, 'draft', 130, true, '{software}', '{2}', '{}', 2, 'scroll'
),
(
  'side-thirty-second-cut', 1, 'ตัวอย่าง 30 วินาที',
  'ทำตัวอย่างที่สั้นที่สุดที่ทำให้คนเข้าใจว่างานของคุณคืออะไร เช่น คลิป ภาพชุด หรือเพลงท่อนเดียว',
  'งานสร้างสรรค์',
  'คลิปสั้น ภาพชุด 3 ภาพ หรือเพลงท่อนฮุก',
  'ลิงก์ตัวอย่าง และบอกว่าตัดอะไรทิ้งไปเพื่อให้เหลือ 30 วินาที',
  'ถ้าคนดูจำได้แค่อย่างเดียว คุณอยากให้เป็นอะไร',
  'ให้เพื่อนในห้องช่วยเหลือดู แล้วเล่ากลับว่าเข้าใจว่าอะไร',
  false, 'draft', 140, true, '{creative}', '{2}', '{}', 2, 'paint'
),
(
  'side-clear-offer', 1, 'บอกให้ชัดว่าช่วยอะไร',
  'ทำหน้าเดียวที่บอกว่าบริการของคุณช่วยใคร ทำอะไรให้ และเริ่มใช้ได้ยังไง',
  'บริการ',
  'โพสต์เดียว หน้าเว็บหน้าเดียว หรือใบปลิวหนึ่งแผ่น',
  'ลิงก์หรือคำอธิบายของหน้านั้น ห้ามใส่เบอร์โทร ที่อยู่ หรือข้อมูลส่วนตัว',
  'ประโยคไหนที่คุณเขียนใหม่บ่อยที่สุด เพราะอะไร',
  'ขอให้ทีมพี่เลี้ยงช่วยอ่านว่าชัดพอไหม',
  false, 'draft', 150, true, '{service}', '{2}', '{}', 2, 'megaphone'
),
(
  'side-outside-circle', 1, 'ให้คนนอกวงเพื่อนลอง',
  'ให้คนที่ไม่ใช่เพื่อนสนิทหรือครอบครัวลองงานของคุณ เช่น เพื่อนต่างห้อง ครูวิชาอื่น หรือคนในชุมชน SHIFT',
  'ทุกเส้นทาง',
  'เพื่อนต่างห้อง ครูวิชาอื่น หรือคนในชุมชน SHIFT ที่ยังไม่เคยเห็นงานนี้',
  'สรุปแบบไม่ระบุตัวตนว่าใครลอง (บอกแค่บทบาท) เกิดอะไรขึ้น และต่างจากตอนเพื่อนสนิทลองยังไง',
  'อะไรที่คนนอกเห็น แต่เพื่อนสนิทไม่เคยพูด',
  'ชวนคนในชุมชน SHIFT มาลองได้ในห้องช่วยเหลือ',
  false, 'draft', 160, true, NULL, '{3}', '{}', 3, 'visitor'
),
(
  'side-fix-one-thing', 1, 'แก้หนึ่งอย่างจากสิ่งที่เห็น',
  'เลือกปัญหาหนึ่งข้อที่เห็นตอนคนลอง แก้มัน แล้วให้คนลองอีกรอบ',
  'ทุกเส้นทาง',
  'ปุ่มที่คนหาไม่เจอ ท่อนที่คนข้าม หรือขั้นตอนที่คนถามซ้ำ',
  'ก่อนแก้เป็นยังไง แก้อะไร และรอบใหม่เป็นยังไง ผลที่ไม่ดีขึ้นก็นับ',
  'ทำไมเลือกแก้ข้อนี้ก่อนข้ออื่น',
  'ถ้าเลือกไม่ได้ว่าจะแก้ข้อไหนก่อน ถามทีมพี่เลี้ยงได้',
  true, 'draft', 170, true, NULL, '{3}', '{side-outside-circle}', 3, 'hammer'
),
(
  'side-demo-three-minutes', 1, 'เตรียมเดโม 3 นาที',
  'ซ้อมเล่างานของคุณใน 3 นาที: ปัญหา สิ่งที่ทำ และสิ่งที่เรียนรู้ ให้พร้อมสำหรับ Demo Day',
  'ทุกเส้นทาง',
  'ซ้อมให้เพื่อน ครอบครัว หรือคนในชุมชน SHIFT ฟัง แล้วจับเวลา',
  'ลิงก์คลิปซ้อมหรือสไลด์ และบอกว่าซ้อมให้ใครฟังแล้ว (บอกแค่บทบาท)',
  'ตอนไหนที่คนฟังสนใจที่สุด',
  'ขอซ้อมให้ทีมพี่เลี้ยงฟังในห้องรวมของเกาะได้',
  false, 'draft', 180, true, NULL, '{2,3}', '{}', 3, 'lantern'
),
(
  'side-handoff-page', 1, 'คู่มือส่งต่อหนึ่งหน้า',
  'เขียนหน้าเดียวที่บอกว่า ถ้าคุณหายไปหนึ่งเดือน คนในทีมจะทำงานนี้ต่อได้ยังไง',
  'ทุกเส้นทาง',
  'ใช้บัญชีอะไรบ้าง (ไม่ใส่รหัสผ่าน) ไฟล์อยู่ที่ไหน และงานที่ต้องทำประจำ',
  'ลิงก์หรือข้อความของหน้านั้น ห้ามใส่รหัสผ่าน โทเคน หรือข้อมูลบัญชีส่วนตัว',
  'ส่วนไหนที่ยังมีแค่คุณคนเดียวที่ทำได้',
  'ถามทีมพี่เลี้ยงได้ว่าส่วนที่ยังมีแค่คุณทำได้ จะส่งต่อยังไง',
  false, 'draft', 190, true, NULL, '{5}', '{}', 5, 'key'
),
(
  'side-review-a-friend', 1, 'ช่วยดูงานเพื่อนหนึ่งชิ้น',
  'ลองใช้งานของเพื่อนอีกโปรเจกต์ แล้วให้คำติชมในห้องรวมของเกาะที่เขาเอาไปใช้ต่อได้',
  'ทุกเส้นทาง',
  'ลองเล่นเกม ลองใช้แอป หรือลองทำตามคู่มือของเพื่อน แล้วบอกสิ่งที่เห็นจริง',
  'ลิงก์ข้อความคำติชมในห้องรวม (ไม่ใช่ข้อความส่วนตัว) และบอกว่าเพื่อนเอาไปใช้ยังไง',
  'การดูงานคนอื่นทำให้คุณเห็นอะไรในงานตัวเอง',
  'หาโปรเจกต์ที่อยากให้ช่วยดูได้ในห้องช่วยเหลือ',
  true, 'draft', 200, true, NULL, '{}', '{}', 6, 'heart'
),
(
  'side-share-a-lesson', 1, 'แบ่งสิ่งที่เรียนรู้ให้ทั้งเกาะ',
  'เล่าสิ่งหนึ่งที่คุณเรียนรู้จากการทำโปรเจกต์ เป็นโพสต์หรือคลิปสั้น แล้วแชร์ในห้องรวมของเกาะ',
  'ทุกเส้นทาง',
  'บั๊กที่แก้นานที่สุด คำติชมที่เปลี่ยนงาน หรือสิ่งที่จะไม่ทำแบบเดิมอีก',
  'ลิงก์โพสต์ในห้องรวม',
  'ถ้าย้อนกลับไปเริ่มใหม่ได้ จะบอกตัวเองว่าอะไร',
  'ขอให้ทีมพี่เลี้ยงช่วยดูโพสต์ก่อนแชร์ได้',
  true, 'draft', 210, true, NULL, '{3}', '{}', 7, 'well'
)
ON CONFLICT (slug, version) DO NOTHING;

/** Island schema 3: wave 2 plus the web board (side quests, shift_quest_board, the web role). */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 3;
$$;

-- ---------------------------------------------------------------------------
-- The web role
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    CREATE ROLE shift_quest_web NOLOGIN NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE shift_quest_web SET statement_timeout = '8s';
ALTER ROLE shift_quest_web CONNECTION LIMIT 20;

GRANT USAGE ON SCHEMA public TO shift_quest_web;

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

-- The website executes exactly this allowlist among the shift_quest_*
-- functions (20261111091000 extends it). A missing signature stops the migration, so a renamed or
-- re-typed function cannot silently drop out. Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges) and web_board.ts.
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
    'public.shift_quest_island_optin(text, uuid, boolean)',
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
