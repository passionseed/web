-- SHIFT High Island schema 16: the celebrate channel cheers when a tree grows.
--
-- Design: docs/designs/shift-island-tree-grew-post.md (decided 2026-11-18).
-- When a mentor approves a team's main quest and that approval grows the
-- team's tree a stage, the bot posts one short celebration in the celebrate
-- channel. Only that moment: starts, submissions, "needs more", "not passed",
-- side quests and repeat approvals of a milestone the tree already counts
-- post nothing, and no mentor's words ever travel in it.
--
--   * shift_quest__after_approval (20261111090700, the hook
--     shift_quest_review_decide calls after an approval and its award, under
--     the quest, plot and member locks): the same body plus one call to
--     shift_quest__tree_grew. The plot lock makes approvals on one project
--     take turns, so the stage in the post is exact. The review function
--     itself is not touched.
--   * shift_quest__tree_grew(instance, milestone, stage): queues the post
--     (kind tree_grew, channel celebrate) when the quest is a main quest on a
--     project and no other approved quest on that project counts for the same
--     milestone, which is exactly when the stage rose. Params are ids and
--     numbers only: {project_id, instance_id, milestone, stage}. Dedupe key
--     tree:<project>:<milestone>, so a milestone posts at most once per
--     project, ever.
--   * shift_quest_tree_post(project, instance): the bot's read at send time,
--     {slot, title, name, team_user_ids}, or null when the project is gone.
--     title is the main quest's title from its template (staff-written).
--     name and team_user_ids (the active members' Discord ids, for the
--     channel ping) are there only while shift_quest__name_visible says the
--     team shows its name (every active member opted in and has consent,
--     20261111095000); otherwise name is null and the list is empty, and the
--     bot says "ทีมปริศนา แปลง #<slot>". Read when the post is sent, not when
--     it is queued, so a team that hides its name in between is not named.
--     Bot-only, like shift_quest_island_post_map: never the website's.
--   * shift_quest_schema_version() = 16.
--
-- Unchanged: shift_quest_outbox_claim still holds every celebrate post while
-- the sharing switch is off (20261111090400) and releases it when sharing is
-- turned on; a missing celebrate channel parks it the same way.
--
-- Deploy order: the bot that knows tree_grew first, then this file. A bot
-- without it drops an unknown kind for good (bot/src/quests/outbox.ts).
--
-- Prod-first apply: CREATE OR REPLACE only, grants per function, idempotent.

/**
 * Queues the celebrate post for an approval that grew the project's tree:
 * a main quest (its template has a milestone) on a project, and no other
 * approved quest on that project counts for the same milestone. Called by
 * shift_quest__after_approval under the quest, plot and member locks.
 * Returns whether this approval grew the tree.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__tree_grew(
  p_instance public.shift_quest_instances, p_milestone smallint, p_stage integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_milestone IS NULL OR p_instance.project_id IS NULL OR p_instance.state IS DISTINCT FROM 'approved' THEN
    RETURN false;
  END IF;
  -- The same test as shift_quest__milestones: approved, filed under the project, its template's milestone.
  IF EXISTS (
    SELECT 1 FROM public.shift_quest_instances i
    JOIN public.shift_quest_templates t ON t.id = i.template_id
    WHERE i.project_id = p_instance.project_id AND i.state = 'approved'
      AND t.milestone = p_milestone AND i.id <> p_instance.id
  ) THEN
    RETURN false;
  END IF;
  PERFORM public.shift_quest__post(
    'tree:' || p_instance.project_id::text || ':' || p_milestone::text, 'celebrate', 'tree_grew',
    jsonb_build_object('project_id', p_instance.project_id, 'instance_id', p_instance.id,
                       'milestone', p_milestone, 'stage', p_stage)
  );
  RETURN true;
END;
$$;

/**
 * Runs inside shift_quest_review_decide after an approval and its award,
 * under the quest's row lock, the project's plot lock and every member lock.
 * Returns the milestone this quest stands for, the project's stage, and how
 * many season unlocks were earned (wave 2). The body of
 * 20261111090700_shift_quests_island plus the tree_grew post (schema 16).
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
  -- 20261118090000: one celebrate post when this approval grew the tree.
  PERFORM public.shift_quest__tree_grew(v_instance, v_milestone, cardinality(v_done));

  RETURN jsonb_build_object('milestone', v_milestone, 'stage', cardinality(v_done), 'unlocks_earned', v_earned);
END;
$$;

/**
 * The bot's read when it sends a tree_grew post: the plot's slot, the main
 * quest's title, and, only while the team shows its name
 * (shift_quest__name_visible: every active member opted in and has consent),
 * the team's name and its active members' Discord ids for the ping. Null
 * when the project no longer has a plot (it was deleted).
 */
CREATE OR REPLACE FUNCTION public.shift_quest_tree_post(p_project uuid, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot integer;
  v_visible boolean;
BEGIN
  SELECT slot INTO v_slot FROM public.shift_quest_plots WHERE project_id = p_project;
  IF v_slot IS NULL THEN
    RETURN NULL;
  END IF;
  v_visible := public.shift_quest__name_visible(p_project);
  RETURN jsonb_build_object(
    'slot', v_slot,
    'title', (
      SELECT t.title FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.id = p_instance AND i.project_id = p_project AND t.milestone IS NOT NULL
    ),
    'name', CASE WHEN v_visible THEN (SELECT p.name FROM public.shift_quest_projects p WHERE p.id = p_project) END,
    'team_user_ids', CASE WHEN v_visible THEN COALESCE((
      SELECT jsonb_agg(m.discord_user_id ORDER BY m.discord_user_id)
      FROM public.shift_quest_project_members pm
      JOIN public.shift_quest_members m ON m.id = pm.member_id
      WHERE pm.project_id = p_project AND pm.status = 'active'
        AND m.erased_at IS NULL AND m.discord_user_id IS NOT NULL
    ), '[]'::jsonb) ELSE '[]'::jsonb END
  );
END;
$$;

/** Island schema 16: the tree_grew celebrate post. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 16; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function
-- ---------------------------------------------------------------------------

-- The helper: only shift_quest__after_approval calls it. Supabase's default
-- privileges grant every new function to anon, authenticated and
-- service_role, and Postgres to PUBLIC: take all of that back.
REVOKE ALL ON FUNCTION public.shift_quest__tree_grew(public.shift_quest_instances, smallint, integer)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
-- shift_quest__after_approval and shift_quest_schema_version keep their grants: CREATE OR REPLACE leaves them.

-- The send-time read: the bot's and service_role's, never the Data API's or the website's.
REVOKE ALL ON FUNCTION public.shift_quest_tree_post(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_tree_post(uuid, uuid) TO shift_quest_bot, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION public.shift_quest__tree_grew(public.shift_quest_instances, smallint, integer) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest_tree_post(uuid, uuid) FROM shift_quest_web;
  END IF;
END;
$$;
