-- SHIFT High Island, wave 1: the quest bot as a small shared island.
--
-- Plan: docs/designs/shift-high-island.md. Each project owns a plot, and its
-- tree grows one stage for every one of the seven starter milestones with an
-- approved quest on that project (any order, any member's quest filed under
-- it; a stage is never lost). Students check in with a tap, reach a milestone
-- in one step, and can rest without penalty. Nobody is ranked.
--
-- Wave 2 (seasons, dated unlocks, the island goal, recognitions, squads and
-- the weekly island post) is 20261111090800_shift_quests_seasons. Nothing in
-- this file or an earlier one names a wave-2 table: where wave-1 code needs a
-- season answer it calls a hook defined here as a no-op (shift_quest__island_
-- season, __island_extras, __season_after_approval, __season_report,
-- __island_export, __island_erase, __on_role_grant, __on_project_join,
-- __feature_flags, __set_feature), and the later migration replaces those
-- hooks with CREATE OR REPLACE. This file applies and works on its own.
--
-- The same rules as the earlier shift_quest migrations: every rule lives in a
-- SECURITY DEFINER function that takes the caller's Discord user ID first;
-- refusals are 'sq:<code>'; helpers (shift_quest__*) are never granted to the
-- bot; the database queues kind + params and the bot owns every word.
--
-- Lock order everywhere: quest, then the project's plot, then members (one
-- sorted pass), then catalog item, then redemption; the active season row is
-- last (wave 2). Every mutex is FOR NO KEY UPDATE.
--
-- Privacy of the island map: a plot shows its real stage, decorations and
-- name only to its own active members, or to everyone once every active
-- member consented (show_name). Any other viewer, and the weekly post, sees
-- its slot only: stage 0, no decorations, no name. No member identity or
-- display name is ever in a map.
--
-- Prod-first apply: additive and idempotent. Keep this file after
-- 20261111090600_shift_quest_bot_role: it repeats that file's grant loop.

-- ---------------------------------------------------------------------------
-- Columns on existing tables
-- ---------------------------------------------------------------------------

-- The island milestone a starter quest stands for (1..7). Null: not a milestone.
ALTER TABLE public.shift_quest_templates
  ADD COLUMN IF NOT EXISTS milestone smallint NULL CHECK (milestone BETWEEN 1 AND 7);

UPDATE public.shift_quest_templates t
SET milestone = v.milestone
FROM (VALUES
  ('find-something-worth-fixing', 1::smallint),
  ('make-it-exist', 2::smallint),
  ('let-reality-surprise-you', 3::smallint),
  ('give-them-a-reason-to-return', 4::smallint),
  ('take-the-keys', 5::smallint),
  ('help-another-builder-move', 6::smallint),
  ('improve-our-community', 7::smallint)
) AS v (slug, milestone)
WHERE t.slug = v.slug AND t.milestone IS DISTINCT FROM v.milestone;

CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_templates_one_milestone
  ON public.shift_quest_templates (milestone) WHERE status = 'published' AND milestone IS NOT NULL;

-- Consent to show the project's name in shared island output. Off by default,
-- reset on every (re)invite and on leaving.
ALTER TABLE public.shift_quest_project_members
  ADD COLUMN IF NOT EXISTS show_name boolean NOT NULL DEFAULT false;

-- The milestone a quest stands for, copied from its template when the quest
-- is created (shift_quest_choose), so one open quest per project and
-- milestone can be a unique index. Teammates share that one quest.
ALTER TABLE public.shift_quest_instances
  ADD COLUMN IF NOT EXISTS milestone smallint NULL CHECK (milestone BETWEEN 1 AND 7);

UPDATE public.shift_quest_instances i
SET milestone = t.milestone
FROM public.shift_quest_templates t
WHERE t.id = i.template_id AND i.milestone IS DISTINCT FROM t.milestone;

-- Open = not approved, declined or archived. A refused second quest is
-- 'sq:milestone_open' (shift_quest_choose, shift_quest_appeal, milestone submit).
CREATE UNIQUE INDEX IF NOT EXISTS shift_quest_instances_one_open_milestone
  ON public.shift_quest_instances (project_id, milestone)
  WHERE milestone IS NOT NULL AND state IN ('active', 'paused', 'submitted', 'clarification', 'appealed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- A stable position on the island. The lowest free slot is taken when a
-- project is created; archiving keeps the plot (it is just not drawn).
CREATE TABLE IF NOT EXISTS public.shift_quest_plots (
  project_id uuid PRIMARY KEY REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  slot integer NOT NULL UNIQUE CHECK (slot >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_quest_plots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_plots FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_plots TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted to the bot)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest__bkk_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Bangkok')::date;
$$;

/** The first instant of the given Bangkok calendar day. */
CREATE OR REPLACE FUNCTION public.shift_quest__bkk_start(p_day date)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT (p_day::timestamp AT TIME ZONE 'Asia/Bangkok');
$$;

/** The first instant after the given Bangkok calendar day (a deadline includes its whole day). */
CREATE OR REPLACE FUNCTION public.shift_quest__bkk_end(p_day date)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT ((p_day + 1)::timestamp AT TIME ZONE 'Asia/Bangkok');
$$;

/** The project's plot slot, assigning the lowest free one if it has none. */
CREATE OR REPLACE FUNCTION public.shift_quest__assign_plot(p_project uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot integer;
BEGIN
  SELECT slot INTO v_slot FROM public.shift_quest_plots WHERE project_id = p_project;
  IF FOUND THEN
    RETURN v_slot;
  END IF;
  -- One assignment at a time, so two new projects never pick the same slot.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_plots'));
  SELECT slot INTO v_slot FROM public.shift_quest_plots WHERE project_id = p_project;
  IF FOUND THEN
    RETURN v_slot;
  END IF;
  SELECT s INTO v_slot
  FROM generate_series(1, (SELECT count(*) + 1 FROM public.shift_quest_plots)::integer) AS s
  WHERE NOT EXISTS (SELECT 1 FROM public.shift_quest_plots WHERE slot = s)
  ORDER BY s LIMIT 1;
  INSERT INTO public.shift_quest_plots (project_id, slot) VALUES (p_project, v_slot);
  RETURN v_slot;
END;
$$;

/**
 * The per-project mutex: approvals on one project take turns, and joining or
 * leaving a project waits for them, so the members an approval locked up
 * front are the members it finds later. Taken after the quest and before any
 * member.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__lock_plot(p_project uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_project IS NULL THEN
    RETURN;
  END IF;
  PERFORM 1 FROM public.shift_quest_plots WHERE project_id = p_project FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__assign_plot(p_project);
    PERFORM 1 FROM public.shift_quest_plots WHERE project_id = p_project FOR NO KEY UPDATE;
  END IF;
END;
$$;

/**
 * A member who leaves a project (or is erased) frees the milestones they were
 * still working on, so the rest of the team can take them: their open
 * milestone quests on the project that are not with the reviewers (active,
 * paused, clarification) are archived, version + 1, and any revision still
 * pending is withdrawn. Submitted and appealed ones stay for the reviewers;
 * deciding them frees the milestone. Callers lock those quest rows first,
 * then the project's plot (shift_quest_project_leave). Returns how many were
 * archived.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__release_milestones(p_project uuid, p_member uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  -- The state is checked by the UPDATE itself, so a decision that committed
  -- after the caller's lock pass (a clarification request) is seen too.
  WITH archived AS (
    UPDATE public.shift_quest_instances
    SET state = 'archived', version = version + 1, updated_at = now()
    WHERE member_id = p_member AND project_id = p_project AND milestone IS NOT NULL
      AND state IN ('active', 'paused', 'clarification')
    RETURNING id
  )
  SELECT COALESCE(array_agg(id), '{}') INTO v_ids FROM archived;
  UPDATE public.shift_quest_submissions SET status = 'withdrawn', decided_at = now()
  WHERE instance_id = ANY (v_ids) AND status = 'pending';
  RETURN cardinality(v_ids);
END;
$$;

/**
 * Distinct milestones with an approved quest filed under the project, sorted.
 * The tree stage is the length of this list; nothing ever removes one (an
 * approved quest is never archived, re-decided or moved). p_before is kept
 * for signature stability: with it, only approvals decided before that
 * instant count. Season counting uses shift_quest__season_approvals (wave 2),
 * which goes by submission time instead.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__milestones(p_project uuid, p_before timestamptz DEFAULT NULL)
RETURNS smallint[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT t.milestone ORDER BY t.milestone), '{}')::smallint[]
  FROM public.shift_quest_instances i
  JOIN public.shift_quest_templates t ON t.id = i.template_id
  WHERE i.project_id = p_project AND i.state = 'approved' AND t.milestone IS NOT NULL
    AND (p_before IS NULL OR EXISTS (
      SELECT 1 FROM public.shift_quest_submissions s
      WHERE s.instance_id = i.id AND s.status = 'approved' AND s.decided_at < p_before
    ));
$$;

/** A project's name may be shown only with every active member's consent. */
CREATE OR REPLACE FUNCTION public.shift_quest__name_visible(p_project uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.shift_quest_projects WHERE id = p_project AND archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.shift_quest_project_members WHERE project_id = p_project AND status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members
      WHERE project_id = p_project AND status = 'active' AND NOT show_name
    );
$$;

/**
 * One plot as a viewer may see it. The project's own active members, and
 * everyone once every active member consented, see the real stage and
 * decorations (3 visitor, 5 key flag, 6 helper path, 7 plaza lantern). Any
 * other viewer, and the shared view (p_viewer null), sees the slot only:
 * stage 0, no decorations, no name, plain = true. So a quiet student's tree
 * is never compared in public. The name appears only with full consent.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__plot_json(p_project uuid, p_viewer uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot integer;
  v_name text;
  v_mine boolean := p_viewer IS NOT NULL AND public.shift_quest__is_teammate(p_project, p_viewer);
  v_consented boolean := public.shift_quest__name_visible(p_project);
  v_done smallint[] := '{}';
BEGIN
  SELECT pl.slot, p.name INTO v_slot, v_name
  FROM public.shift_quest_plots pl JOIN public.shift_quest_projects p ON p.id = pl.project_id
  WHERE pl.project_id = p_project;
  IF v_mine OR v_consented THEN
    v_done := public.shift_quest__milestones(p_project);
  END IF;
  RETURN jsonb_build_object(
    'slot', v_slot,
    'stage', cardinality(v_done),
    'visitor', 3 = ANY (v_done),
    'key', 5 = ANY (v_done),
    'helper', 6 = ANY (v_done),
    'lantern', 7 = ANY (v_done),
    'name', CASE WHEN v_consented THEN v_name END,
    'mine', v_mine,
    'plain', NOT (v_mine OR v_consented)
  );
END;
$$;

/** Every drawn plot (archived projects keep their slot but are not drawn), by slot. */
CREATE OR REPLACE FUNCTION public.shift_quest__map_plots(p_viewer uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(public.shift_quest__plot_json(pl.project_id, p_viewer) ORDER BY pl.slot), '[]'::jsonb)
  FROM public.shift_quest_plots pl
  JOIN public.shift_quest_projects p ON p.id = pl.project_id
  WHERE p.archived_at IS NULL;
$$;

-- ---------------------------------------------------------------------------
-- Wave-2 hooks. No-ops here; 20261111090800_shift_quests_seasons replaces
-- each with CREATE OR REPLACE (same signature). Wave-1 code calls only these.
-- ---------------------------------------------------------------------------

/** The season block of /island for a member and their current project. Wave 1: none. */
CREATE OR REPLACE FUNCTION public.shift_quest__island_season(p_member uuid, p_project uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NULL;
END;
$$;

/** The goal and season objects of both island maps. Wave 1: both null. */
CREATE OR REPLACE FUNCTION public.shift_quest__island_extras()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('goal', NULL, 'season', NULL);
END;
$$;

/**
 * Runs after an approval grew (or did not grow) the project's tree, holding
 * the quest, the plot and every member lock. Returns how many season unlocks
 * were earned. Wave 1: none.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__season_after_approval(p_project uuid, p_actor uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 0;
END;
$$;

/** Season counts merged into the report's island block. Wave 1: nothing. */
CREATE OR REPLACE FUNCTION public.shift_quest__season_report(p_since timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '{}'::jsonb;
END;
$$;

/** Season records merged into /data. Wave 1: nothing. */
CREATE OR REPLACE FUNCTION public.shift_quest__island_export(p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '{}'::jsonb;
END;
$$;

/** Season and squad parts of an erasure. Wave 1: nothing to erase. */
CREATE OR REPLACE FUNCTION public.shift_quest__island_erase(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN;
END;
$$;

/** Runs when an application role is granted (staff never hold squad places). Wave 1: nothing. */
CREATE OR REPLACE FUNCTION public.shift_quest__on_role_grant(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN;
END;
$$;

/**
 * Runs when a member becomes active on a project (shift_quest_project_create,
 * and shift_quest_project_respond on accept), after the membership row says
 * 'active'. The caller holds no quest lock; the hook may take the project's
 * plot and then its members (the approval order). Returns how many season
 * unlocks were earned. Wave 1: none.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__on_project_join(p_project uuid, p_member uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 0;
END;
$$;

/**
 * Feature switches that live in later migrations, merged into the session's
 * and /admin status's settings (key: the feature name, value: on). Wave 1:
 * none, so squads read as off.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__feature_flags()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '{}'::jsonb;
END;
$$;

/**
 * Sets a feature switch that lives in a later migration (shift_quest_admin_set
 * calls it for any key it does not know, holding the settings row lock).
 * Returns false for an unknown key, which admin_set refuses as bad_input.
 * Wave 1: no such feature.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__set_feature(p_key text, p_on boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN false;
END;
$$;

/**
 * Runs inside shift_quest_review_decide after an approval and its award,
 * under the quest's row lock, the project's plot lock and every member lock.
 * Returns the milestone this quest stands for, the project's stage, and how
 * many season unlocks were earned (wave 2).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__after_approval(p_instance uuid, p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance public.shift_quest_instances;
  v_milestone smallint;
  v_done smallint[];
  v_earned integer;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance;
  SELECT milestone INTO v_milestone FROM public.shift_quest_templates WHERE id = v_instance.template_id;
  IF v_instance.project_id IS NULL OR v_instance.state IS DISTINCT FROM 'approved' THEN
    RETURN jsonb_build_object('milestone', v_milestone, 'stage', NULL, 'unlocks_earned', 0);
  END IF;

  PERFORM public.shift_quest__lock_plot(v_instance.project_id);
  v_done := public.shift_quest__milestones(v_instance.project_id);
  v_earned := public.shift_quest__season_after_approval(v_instance.project_id, p_actor);

  RETURN jsonb_build_object('milestone', v_milestone, 'stage', cardinality(v_done), 'unlocks_earned', v_earned);
END;
$$;

/** Island counts for the pilot report. No names, no identities. */
CREATE OR REPLACE FUNCTION public.shift_quest__island_report(p_since timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'projects_by_stage', COALESCE((
      SELECT jsonb_object_agg(stage::text, n ORDER BY stage) FROM (
        SELECT cardinality(public.shift_quest__milestones(p.id)) AS stage, count(*) AS n
        FROM public.shift_quest_projects p WHERE p.archived_at IS NULL
        GROUP BY 1
      ) x
    ), '{}'::jsonb),
    'taps_in_window', (
      SELECT count(*) FROM public.shift_quest_progress WHERE kind = 'tap' AND created_at >= p_since
    ),
    'members_resting', (
      SELECT count(DISTINCT i.member_id) FROM public.shift_quest_instances i
      WHERE i.state = 'paused' AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_instances a
        WHERE a.member_id = i.member_id AND a.state IN ('active', 'clarification')
      )
    )
  ) || public.shift_quest__season_report(p_since);
END;
$$;

-- Plots for projects made before this migration (idempotent).
DO $$
DECLARE
  v_project uuid;
BEGIN
  FOR v_project IN
    SELECT p.id FROM public.shift_quest_projects p
    WHERE NOT EXISTS (SELECT 1 FROM public.shift_quest_plots pl WHERE pl.project_id = p.id)
    ORDER BY p.created_at, p.id
  LOOP
    PERFORM public.shift_quest__assign_plot(v_project);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Students: the island, check-ins, milestones, rest
-- ---------------------------------------------------------------------------

/** Opt in or out of showing the project's name (and its real stage) in shared island output. */
CREATE OR REPLACE FUNCTION public.shift_quest_island_optin(p_actor text, p_project uuid, p_show boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := COALESCE(p_project, public.shift_quest__current_project(v_member));
  v_show boolean := COALESCE(p_show, false);
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  UPDATE public.shift_quest_project_members SET show_name = v_show
  WHERE project_id = v_project AND member_id = v_member.id AND status = 'active';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_project_member');
  END IF;
  PERFORM public.shift_quest__audit(v_member.id, CASE WHEN v_show THEN 'island_name_on' ELSE 'island_name_off' END,
                                    'project', v_project);
  RETURN jsonb_build_object(
    'project_id', v_project,
    'show_name', v_show,
    'project_name_visible', public.shift_quest__name_visible(v_project)
  );
END;
$$;

/**
 * "I worked on it today". No words: a tap, at most one per member per
 * Bangkok day (a second tap returns the first). One line: a private journal
 * note. Neither grows the tree, mints a coin or reaches any channel.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_checkin(p_actor text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_note text := public.shift_quest__check_len(p_note, 300, false);
  v_today date := public.shift_quest__bkk_today();
  v_id uuid;
  v_taps integer;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  -- Two taps at once take turns, and the second finds the first.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;

  IF v_note IS NULL THEN
    SELECT id INTO v_id FROM public.shift_quest_progress
    WHERE member_id = v_member.id AND kind = 'tap'
      AND (created_at AT TIME ZONE 'Asia/Bangkok')::date = v_today;
    IF v_id IS NULL THEN
      INSERT INTO public.shift_quest_progress (member_id, project_id, kind, visibility)
      VALUES (v_member.id, v_project, 'tap', 'private')
      RETURNING id INTO v_id;
      PERFORM public.shift_quest__audit(v_member.id, 'checkin_tap', 'progress', v_id);
    END IF;
  ELSE
    INSERT INTO public.shift_quest_progress (member_id, project_id, kind, changed, visibility)
    VALUES (v_member.id, v_project, 'note', v_note, 'private')
    RETURNING id INTO v_id;
    PERFORM public.shift_quest__audit(v_member.id, 'checkin_note', 'progress', v_id);
  END IF;

  SELECT count(*) INTO v_taps FROM public.shift_quest_progress
  WHERE member_id = v_member.id AND kind = 'tap'
    AND (created_at AT TIME ZONE 'Asia/Bangkok')::date = v_today;

  RETURN jsonb_build_object(
    'kind', CASE WHEN v_note IS NULL THEN 'tap' ELSE 'note' END,
    'taps_today', v_taps,
    'progress_id', v_id
  );
END;
$$;

/**
 * /island for one student: their plot, the seven milestones, and the season
 * (null until wave 2 is applied and a season is active). A milestone's
 * in_flight is the project's one open quest for it, whoever holds it: mine
 * says whether it is the caller's, owner names the teammate who holds it.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island(p_actor text)
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
  v_project_json jsonb;
BEGIN
  IF v_project_id IS NOT NULL THEN
    SELECT * INTO v_project FROM public.shift_quest_projects WHERE id = v_project_id;
    v_done := public.shift_quest__milestones(v_project_id);
    v_project_json := jsonb_build_object(
      'id', v_project.id,
      'name', v_project.name,
      'route', v_project.route,
      'slot', (SELECT slot FROM public.shift_quest_plots WHERE project_id = v_project_id),
      'stage', cardinality(v_done),
      'milestones_done', to_jsonb(v_done::integer[]),
      'next_milestone', (
        SELECT min(t.milestone) FROM public.shift_quest_templates t
        WHERE t.status = 'published' AND t.milestone IS NOT NULL AND NOT (t.milestone = ANY (v_done))
      ),
      'show_name', (
        SELECT show_name FROM public.shift_quest_project_members
        WHERE project_id = v_project_id AND member_id = v_member.id
      ),
      'name_visible', public.shift_quest__name_visible(v_project_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'project', v_project_json,
    'milestones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'milestone', t.milestone,
        'template_id', t.id,
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
        )
      ) ORDER BY t.milestone)
      FROM public.shift_quest_templates t
      WHERE t.status = 'published' AND t.milestone IS NOT NULL
    ), '[]'::jsonb),
    'taps_today', (
      SELECT count(*) FROM public.shift_quest_progress
      WHERE member_id = v_member.id AND kind = 'tap'
        AND (created_at AT TIME ZONE 'Asia/Bangkok')::date = public.shift_quest__bkk_today()
    ),
    'resting', EXISTS (
        SELECT 1 FROM public.shift_quest_instances WHERE member_id = v_member.id AND state = 'paused'
      ) AND NOT EXISTS (
        SELECT 1 FROM public.shift_quest_instances
        WHERE member_id = v_member.id AND state IN ('active', 'clarification')
      ),
    'season', public.shift_quest__island_season(v_member.id, v_project_id)
  );
END;
$$;

/**
 * Every drawn plot for the caller's private island image: their own plot in
 * full (mine = true), a fully consented plot in full, every other plot as a
 * plain slot (see shift_quest__plot_json). No member identities and no
 * display names. A null actor is refused: the weekly post uses
 * shift_quest_island_post_map().
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_map(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- A null or unknown actor is 'sq:not_started'.
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;
  RETURN jsonb_build_object('plots', public.shift_quest__map_plots(v_member.id))
    || public.shift_quest__island_extras();
END;
$$;

/**
 * The shared island for the weekly post (no caller; the outbox worker calls
 * it at send time). Every plot is seen as by an outsider: the real stage,
 * decorations and name only where every active member consented, otherwise
 * a plain slot. mine is always false.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_post_map()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object('plots', public.shift_quest__map_plots(NULL))
    || public.shift_quest__island_extras();
END;
$$;

/**
 * "I reached milestone N": one step. A project has at most one open quest per
 * milestone (unique index shift_quest_instances_one_open_milestone). If the
 * caller holds it, it is reused (a paused one is resumed); if a teammate
 * holds it, 'sq:milestone_open' (the teammate shows in /island in_flight);
 * if it is under appeal, 'sq:milestone_appealed'. Otherwise the quest is
 * chosen exactly as shift_quest_choose would (goal = the template's purpose,
 * next step '-', criteria = its evidence criteria, the reward rule pinned
 * now). Then it is submitted through shift_quest_submit: proof as evidence,
 * the reflection required, visible to reviewers only, no contributors.
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
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_template public.shift_quest_templates;
  v_id uuid;
  v_state text;
  v_owner uuid;
  v_created boolean := false;
  v_result jsonb;
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

  v_result := public.shift_quest_submit(
    p_actor, v_id, NULL, p_proof, p_reflection, p_artifact_url, 'reviewers', NULL, '{}'::text[]
  );
  RETURN jsonb_build_object(
    'instance_id', v_id,
    'submission_id', v_result -> 'submission_id',
    'revision', v_result -> 'revision',
    'version', v_result -> 'version',
    'created', v_created
  );
END;
$$;

/** Rest: pause every active or clarification quest (or resume the paused ones). No penalty. */
CREATE OR REPLACE FUNCTION public.shift_quest_rest(p_actor text, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_id uuid;
  v_paused integer := 0;
  v_resumed integer := 0;
BEGIN
  IF p_on IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  -- Quest locks in a fixed order; each change goes through shift_quest_set_state.
  FOR v_id IN
    SELECT id FROM public.shift_quest_instances
    WHERE member_id = v_member.id
      AND state = ANY (CASE WHEN p_on THEN ARRAY['active', 'clarification'] ELSE ARRAY['paused'] END)
    ORDER BY id
    FOR NO KEY UPDATE
  LOOP
    PERFORM public.shift_quest_set_state(p_actor, v_id, NULL, CASE WHEN p_on THEN 'pause' ELSE 'resume' END);
    IF p_on THEN
      v_paused := v_paused + 1;
    ELSE
      v_resumed := v_resumed + 1;
    END IF;
  END LOOP;
  PERFORM public.shift_quest__audit(v_member.id, CASE WHEN p_on THEN 'rest_on' ELSE 'rest_off' END, 'member', v_member.id);
  RETURN jsonb_build_object('paused', v_paused, 'resumed', v_resumed);
END;
$$;

/**
 * The island schema the database holds, for the bot's startup check: 1 for
 * the island core (this file), 2 once 20261111090800_shift_quests_seasons is
 * applied (it replaces this function). Bump it with every later island
 * migration that changes a contract the bot depends on.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 1;
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
