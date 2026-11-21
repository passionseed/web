-- Elemental hackathon (Dec 2026): saving lesson answers from the web lesson player.
--
-- One function, elemental_web_lesson_answer, for the server action in
-- lib/elemental/web/learn-actions.ts (service_role only). The table it writes,
-- elemental_lesson_progress, is in 20261123100000_elemental_core.sql, and so
-- is everything that reads it: elemental_bot_totals counts a final row with
-- finished_at on a Bangkok day as that team checking in, and the 'lesson'
-- badge this function awards shows in elemental_island_public.
--
-- The caller passes the edition and the viewer's Discord id (from their
-- Supabase session's Discord identity). The team always comes from
-- elemental_members, never from the caller. Errors are 'el:<code>' (SQLSTATE
-- P0001) like the core file's; DETAIL names a field, never the typed answer.
--
-- No whiteboard_* or shift_quest_* object is created, altered or granted here.
-- The canvas link table (elemental_canvas_links, 20261123100100) is read
-- through dynamic SQL, so this file also applies, and answers still save,
-- where that file has not run.
--
-- Prod-first apply (AGENTS.md): additive and idempotent, safe to run twice.

/**
 * Saves one part of a lesson for a claimed member on a live team.
 *
 *   p_edition          edition key ('elemental-2026', 'elemental-dryrun')
 *   p_discord_user_id  the viewer's Discord id
 *   p_lesson_id        ^[a-z0-9][a-z0-9_-]{0,63}$ (trimmed, lowercased)
 *   p_part             0..50
 *   p_answer           NULL or up to 1000 characters after trimming; '' is NULL
 *   p_final            true on the lesson's last part: the lesson is finished
 *
 * Saving the same part again replaces the answer (one row per member, lesson
 * and part). The first final save stamps finished_at, which later saves keep,
 * and gives the team one 'lesson' badge per lesson (ref = lesson id), however
 * many times or members finish it. A finished row also keeps the team it was
 * finished on, so a staff /el move never shifts a past check-in or badge to
 * the member's new team.
 *
 * Returns {progress_id, lesson_id, part, final, finished_at, first_finish,
 * badge_awarded, team: {team_id, slot, element}, canvas}. canvas is the
 * team's linked project canvas {board_id, frame_id, owner_id} or NULL: the
 * caller writes a do-it-now answer there as a 'reference' note, with
 * progress_id as the note's entry id so a re-save rewrites the same note.
 * No Discord ids and no answer text are returned.
 *
 * Errors: unknown_edition, bad_user, bad_lesson, bad_part, bad_answer,
 * pii (DETAIL 'answer', HINT the kind), not_claimed (no member row for this
 * Discord id in the edition), no_team (no live team: watch only).
 */
CREATE OR REPLACE FUNCTION public.elemental_web_lesson_answer(
  p_edition text,
  p_discord_user_id text,
  p_lesson_id text,
  p_part integer,
  p_answer text,
  p_final boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_edition public.elemental_editions := public.elemental__edition(p_edition);
  v_user text := public.elemental__user(p_discord_user_id);
  v_lesson text := lower(btrim(coalesce(p_lesson_id, '')));
  v_answer text := nullif(btrim(p_answer), '');
  v_final boolean := coalesce(p_final, false);
  v_member public.elemental_members;
  v_team public.elemental_teams;
  v_row public.elemental_lesson_progress;
  v_was_finished boolean;
  v_badge uuid;
  v_first boolean;
  v_link jsonb;
  v_canvas jsonb;
BEGIN
  IF v_lesson !~ '^[a-z0-9][a-z0-9_-]{0,63}$' THEN
    PERFORM public.elemental__fail('bad_lesson', 'lesson_id');
  END IF;
  IF p_part IS NULL OR p_part < 0 OR p_part > 50 THEN
    PERFORM public.elemental__fail('bad_part', 'part');
  END IF;
  IF char_length(v_answer) > 1000 THEN
    PERFORM public.elemental__fail('bad_answer', 'answer');
  END IF;
  PERFORM public.elemental__refuse_pii('answer', v_answer);

  v_member := public.elemental__member(v_edition.key, v_user);
  IF v_member.id IS NULL THEN
    PERFORM public.elemental__fail('not_claimed');
  END IF;
  SELECT * INTO v_team FROM public.elemental_teams
  WHERE id = v_member.team_id AND edition = v_edition.key AND public.elemental__is_live(status);
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('no_team');
  END IF;

  SELECT p.final AND p.finished_at IS NOT NULL INTO v_was_finished
  FROM public.elemental_lesson_progress p
  WHERE p.edition = v_edition.key AND p.member_id = v_member.id AND p.lesson_id = v_lesson AND p.part = p_part;
  v_was_finished := coalesce(v_was_finished, false);

  INSERT INTO public.elemental_lesson_progress AS p
    (edition, member_id, team_id, lesson_id, part, answer, final, finished_at)
  VALUES (v_edition.key, v_member.id, v_team.id, v_lesson, p_part, v_answer, v_final,
          CASE WHEN v_final THEN now() END)
  ON CONFLICT ON CONSTRAINT elemental_lesson_progress_member_part_key DO UPDATE SET
    -- Once finished, a lesson stays finished, for the team and on the day it
    -- was first finished.
    team_id = CASE WHEN p.finished_at IS NOT NULL THEN p.team_id ELSE EXCLUDED.team_id END,
    answer = EXCLUDED.answer,
    final = p.final OR EXCLUDED.final,
    finished_at = coalesce(p.finished_at, EXCLUDED.finished_at),
    updated_at = now()
  RETURNING * INTO v_row;

  -- This call finished it: it was not finished before, and the stamp is this
  -- transaction's (a concurrent save that finished first keeps its own stamp,
  -- so two racing finishes give one first_finish and one audit row).
  v_first := v_row.final AND NOT v_was_finished AND v_row.finished_at = now();

  IF v_row.final AND v_row.team_id IS NOT NULL THEN
    INSERT INTO public.elemental_badges (edition, team_id, kind, ref)
    VALUES (v_edition.key, v_row.team_id, 'lesson', v_lesson)
    ON CONFLICT (team_id, kind, ref) DO NOTHING
    RETURNING id INTO v_badge;
  END IF;

  IF v_first THEN
    PERFORM public.elemental__audit(v_edition.key, v_user, 'lesson_finish', v_lesson,
      jsonb_build_object('team_id', v_row.team_id, 'part', p_part, 'badge', v_badge IS NOT NULL));
  END IF;

  -- The team's linked project canvas (E11). Dynamic, so a missing table, a
  -- renamed column or an odd board id means "no canvas", never a failed save.
  IF to_regclass('public.elemental_canvas_links') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT to_jsonb(l) FROM public.elemental_canvas_links l WHERE l.team_id = $1 LIMIT 1'
        INTO v_link USING v_team.id;
      IF v_link ->> 'board_id' IS NOT NULL AND v_link ->> 'frame_id' IS NOT NULL THEN
        SELECT jsonb_build_object('board_id', w.id, 'frame_id', v_link ->> 'frame_id', 'owner_id', w.owner_id)
        INTO v_canvas
        FROM public.whiteboards w
        WHERE w.id = (v_link ->> 'board_id')::uuid;
      END IF;
    EXCEPTION WHEN undefined_column OR undefined_table OR invalid_text_representation THEN
      v_canvas := NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'progress_id', v_row.id,
    'lesson_id', v_lesson,
    'part', p_part,
    'final', v_row.final,
    'finished_at', v_row.finished_at,
    'first_finish', v_first,
    'badge_awarded', v_badge IS NOT NULL,
    'team', jsonb_build_object('team_id', v_team.id, 'slot', v_team.slot, 'element', v_team.element),
    'canvas', v_canvas);
END;
$$;

-- Access: service_role only. Only this file's function is touched, so a
-- grant another elemental file made (E11 runs before this one) is never undone.
REVOKE ALL ON FUNCTION public.elemental_web_lesson_answer(text, text, text, integer, text, boolean)
  FROM PUBLIC, anon, authenticated, elemental_bot;
GRANT EXECUTE ON FUNCTION public.elemental_web_lesson_answer(text, text, text, integer, text, boolean) TO service_role;
