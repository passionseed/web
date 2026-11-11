-- SHIFT High Island on the web: link a quest project to one SHIFT canvas.
--
-- Plan: docs/designs/shift-high-island-web.md ("Immersive island, story,
-- quest page, canvas submission"). Students already log their project on a
-- SHIFT canvas on the whiteboard (docs/features/whiteboard.md). A quest
-- project links to one canvas, once, shared by its teammates; the website
-- reads that canvas's notes for each quest and snapshots the chosen notes
-- into the existing submit functions (evidence, reflection, artifact_url), so
-- review, export, erase and the bot do not change. This file adds:
--
--   * shift_quest_canvas_links: one row per quest project with the whiteboard
--     board id, the canvas frame id and its project tag. Opaque pointers only:
--     no canvas title, note text or Supabase user id is stored. The website
--     never trusts the row: every read and submit re-verifies it against the
--     whiteboard (board member, canvas owner or teammate, same project tag).
--   * shift_quest_canvas_get(actor), shift_quest_canvas_link(actor, board,
--     frame, canvas_project) and shift_quest_canvas_unlink(actor), for the
--     caller's current project, behind the same student gate as
--     shift_quest_board. On the web allowlist.
--   * shift_quest_schema_version() = 5. The website needs 5, the bot 2.
--
-- This file never references the whiteboard tables or auth.users: the quest
-- sandbox (bot/quests-sandbox.sh, run-local.sh) has neither.
--
-- Prod-first apply: additive and idempotent (CREATE TABLE IF NOT EXISTS,
-- CREATE OR REPLACE). Keep this file after 20261111091000_shift_quests_board_fixes:
-- it repeats both grant loops.

-- ---------------------------------------------------------------------------
-- The link
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_canvas_links (
  project_id uuid PRIMARY KEY REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  -- public.whiteboards.id in the website's database; no foreign key (another schema's lifecycle).
  board_id uuid NOT NULL,
  -- The Excalidraw element id of the canvas frame.
  frame_id text NOT NULL CHECK (char_length(frame_id) BETWEEN 1 AND 100),
  -- The frame's customData.project when it was linked: a re-tagged canvas no longer matches.
  canvas_project text NOT NULL CHECK (char_length(canvas_project) BETWEEN 1 AND 100),
  linked_by uuid NULL REFERENCES public.shift_quest_members(id) ON DELETE SET NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_quest_canvas_links IS
  'SHIFT High: the SHIFT whiteboard canvas a quest project reads its notes from. Pointers only, re-verified on every use.';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_canvas_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_canvas_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_canvas_links TO service_role;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

/**
 * The canvas link of the caller's current project: null without a current
 * project or without a link, else {board_id, frame_id, canvas_project,
 * linked_at}. Teammates read the same link.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_canvas_get(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_link public.shift_quest_canvas_links;
BEGIN
  IF v_project IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_link FROM public.shift_quest_canvas_links WHERE project_id = v_project;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'board_id', v_link.board_id,
    'frame_id', v_link.frame_id,
    'canvas_project', v_link.canvas_project,
    'linked_at', v_link.linked_at
  );
END;
$$;

/**
 * Links the caller's current project to one canvas, replacing any earlier
 * link (linked_at and linked_by are the newest link's). The website verifies
 * the canvas against the whiteboard first: this database cannot see it.
 * 'sq:no_project' without a current project (an active membership),
 * 'sq:bad_input' for a missing board or an id out of range. Returns
 * {board_id, frame_id, canvas_project, linked_at}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_canvas_link(
  p_actor text, p_board uuid, p_frame text, p_canvas_project text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_link public.shift_quest_canvas_links;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  IF p_board IS NULL
     OR p_frame IS NULL OR char_length(p_frame) NOT BETWEEN 1 AND 100
     OR p_canvas_project IS NULL OR char_length(p_canvas_project) NOT BETWEEN 1 AND 100 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  INSERT INTO public.shift_quest_canvas_links
    (project_id, board_id, frame_id, canvas_project, linked_by, linked_at, updated_at)
  VALUES (v_project, p_board, p_frame, p_canvas_project, v_member.id, now(), now())
  ON CONFLICT (project_id) DO UPDATE
  SET board_id = EXCLUDED.board_id,
      frame_id = EXCLUDED.frame_id,
      canvas_project = EXCLUDED.canvas_project,
      linked_by = EXCLUDED.linked_by,
      linked_at = EXCLUDED.linked_at,
      updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_link;

  PERFORM public.shift_quest__audit(v_member.id, 'canvas_link', 'project', v_project);
  RETURN jsonb_build_object(
    'board_id', v_link.board_id,
    'frame_id', v_link.frame_id,
    'canvas_project', v_link.canvas_project,
    'linked_at', v_link.linked_at
  );
END;
$$;

/**
 * Removes the canvas link of the caller's current project. True when there
 * was one; false without a link or without a current project.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_canvas_unlink(p_actor text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
BEGIN
  IF v_project IS NULL THEN
    RETURN false;
  END IF;
  DELETE FROM public.shift_quest_canvas_links WHERE project_id = v_project;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM public.shift_quest__audit(v_member.id, 'canvas_unlink', 'project', v_project);
  RETURN true;
END;
$$;

/** Island schema 5: the SHIFT canvas link. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 5;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the loop of 20261111090600_shift_quest_bot_role, then the web
-- allowlist of 20261111091000_shift_quests_board_fixes plus the three new
-- functions.
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
-- functions. Mirrored in supabase/tests/shift_quests/run-local.sh
-- (check_privileges) and web_board.ts. Skipped where the web role does not
-- exist (it is made by 20261111090900_shift_quests_board).
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
    'public.shift_quest_canvas_unlink(text)'
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
