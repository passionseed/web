-- SHIFT High Island on the web: quest 5 (ถือกุญแจเอง) reads the ownership checklist.
--
-- Plan: docs/designs/shift-high-island-web.md ("Quest 5 and the ownership
-- checklist"). Students tick the practical-ownership checklist in Discord
-- (/project ownership, shift_quest_ownership_set). Quest 5 asks for it, so the
-- website shows the same items, read-only, on the quest page and snapshots
-- their states into the quest's evidence when it is sent. This file adds:
--
--   * shift_quest_ownership_get(actor): the caller's current project's items
--     as [{item, state, mentor_held, updated_at}], in the bot's order; null
--     without a current project. Behind the same student gate as
--     shift_quest_canvas_get. No notes, no continuation paths, no help ids:
--     the quest page needs the states only. Website-only, like the canvas
--     functions (the bot reads shift_quest_project_view).
--   * shift_quest_schema_version() = 6. The website needs 6, the bot 2.
--
-- Prod-first apply: additive and idempotent (CREATE OR REPLACE). Keep this
-- file after 20261111091100_shift_quest_canvas_links: it repeats both grant
-- loops with the website-only exclusions.

/**
 * The ownership checklist of the caller's current project, for the quest
 * page: null without a current project, else an array (possibly empty) of
 * {item, state, mentor_held, updated_at} ordered access, export, team, costs,
 * portability. Teammates read the same list.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_ownership_get(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
BEGIN
  IF v_project IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'item', o.item, 'state', o.state, 'mentor_held', o.mentor_held, 'updated_at', o.updated_at
    ) ORDER BY array_position(ARRAY['access', 'export', 'team', 'costs', 'portability'], o.item))
    FROM public.shift_quest_ownership_checks o
    WHERE o.project_id = v_project
  ), '[]'::jsonb);
END;
$$;

/** Island schema 6: the ownership checklist on the web. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the loop of 20261111090600_shift_quest_bot_role minus the
-- website-only functions, then the web allowlist of
-- 20261111091100_shift_quest_canvas_links plus shift_quest_ownership_get.
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
    IF fn.proname NOT LIKE 'shift\_quest\_\_%' AND fn.proname <> 'shift_quest_bootstrap_admin'
       AND fn.proname NOT LIKE 'shift\_quest\_canvas\_%' AND fn.proname <> 'shift_quest_ownership_get' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO shift_quest_bot', fn.sig);
    END IF;
  END LOOP;
END;
$$;

-- A second pass of the earlier loops grants these to the bot again: take them back.
REVOKE EXECUTE ON FUNCTION
  public.shift_quest_canvas_get(text),
  public.shift_quest_canvas_link(text, uuid, text, text),
  public.shift_quest_canvas_unlink(text),
  public.shift_quest_ownership_get(text)
FROM shift_quest_bot;

-- The website executes exactly this allowlist among the shift_quest_*
-- functions. Mirrored in supabase/tests/shift_quests/run-local.sh
-- (check_privileges), web_board.ts and web_canvas.ts. Skipped where the web
-- role does not exist (it is made by 20261111090900_shift_quests_board).
DO $$
DECLARE
  fn record;
  v_sig text;
  v_proc regprocedure;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    RETURN;
  END IF;

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
    'public.shift_quest_project_respond(text, uuid, boolean)',
    'public.shift_quest_canvas_get(text)',
    'public.shift_quest_canvas_link(text, uuid, text, text)',
    'public.shift_quest_canvas_unlink(text)',
    'public.shift_quest_ownership_get(text)'
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
