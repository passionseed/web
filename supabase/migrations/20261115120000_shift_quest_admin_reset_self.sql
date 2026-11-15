-- SHIFT High Island: an admin resets their own island progress, to replay
-- onboarding and the quests from the start (testing only).
--
--   * shift_quest_admin_reset_self(actor) RETURNS jsonb. The caller must hold
--     the 'admin' application role (shift_quest__staff: 'sq:not_authorized'
--     otherwise). It only ever touches the caller's own rows:
--       - their quest instances and everything hanging off them: submissions
--         (their contributions go by cascade), reviews and appeals of those
--         submissions, the caller's help requests and shares, the caller's
--         inbox notices about them, and channel or DM messages still queued
--         about them (dropped, never deleted, as erasure does);
--       - their journal (taps, notes, reflections: the roots) and work
--         sessions;
--       - their current project, when they are its only active member: they
--         leave it, it is archived, its plot is freed and its tree style,
--         gifts, canvas link and ownership checks are cleared, so the island
--         shows the planting flow again ({project: 'archived'}). When anyone
--         else is still on it, the project and its tree stay as they are
--         ({project: 'shared'}), and so do the caller's approved quests on
--         any project that is not being archived: they are a team's tree.
--     The ledger is append-only and never touched: the result reports how
--     many ledger rows the caller has, and a quest an award or a reversal
--     points at is refused ('sq:reset_blocked') rather than half reset, as is
--     a quest another member's follow-up quest points at.
--   * One audit row (admin_reset_self), no free text.
--
-- Lock order (docs/features/shift-high-quests.md, "Locks"): the caller's
-- quests, then the current project's plot, then the member, then the
-- project's tree style. The quests are locked FOR UPDATE, not FOR NO KEY
-- UPDATE, because they are deleted; a foreign-key check on them waits.
--
-- No schema version bump: only the website calls this function, from an
-- admin-only control, and on a database without it the call fails like any
-- database error (a generic "try again"). The bot never calls it, so its
-- REQUIRED_SCHEMA and the website's schema check are untouched.
--
-- Grants: website-only (shift_quest_web) and service_role. Never the bot,
-- anon, authenticated or PUBLIC. Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges) and reset.ts.
--
-- Prod-first: production is the first Postgres to parse this file. Additive
-- and idempotent (CREATE OR REPLACE, REVOKE and GRANT), safe to run twice;
-- Postgres 15. Keep it after 20261115090000_shift_quests_pitfall_map.

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

-- ---------------------------------------------------------------------------
-- Privileges: the website's and service_role's only
-- ---------------------------------------------------------------------------

-- Supabase's default privileges grant every new function to anon,
-- authenticated and service_role, and Postgres to PUBLIC: take that back.
REVOKE ALL ON FUNCTION public.shift_quest_admin_reset_self(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_admin_reset_self(text) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_bot') THEN
    REVOKE ALL ON FUNCTION public.shift_quest_admin_reset_self(text) FROM shift_quest_bot;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    GRANT EXECUTE ON FUNCTION public.shift_quest_admin_reset_self(text) TO shift_quest_web;
  END IF;
END;
$$;
