-- Elemental hackathon (Dec 2026), part 2: /tester entries, team canvases and
-- the hand-in link. Follows 20261123100000_elemental_core.sql, whose tables,
-- helpers and conventions this file uses:
--   * elemental_bot_* functions take the guild id first; the edition always
--     comes from that guild's elemental_settings row. They are SECURITY
--     DEFINER with a fixed search_path; Discord roles are checked by the bot.
--   * Errors raised on purpose are 'el:<code>' (SQLSTATE P0001); DETAIL is a
--     field name or a Discord id, never text a student typed. el:pii carries
--     DETAIL = field and HINT = kind.
--   * elemental__* helpers are granted to no one (the loop at the end).
--
-- What is here:
--   * elemental_canvas_links: a team's project canvas (one frame on one of its
--     element's boards). No Discord ids: who linked it is in the audit log.
--   * elemental_editions.handin_due_at: when a hand-in starts counting as late.
--   * /tester: add (team channel or staff by slot), edit (the logger, 10 min),
--     remove, review, sample. Up to settings.tester_cap entries per team count;
--     the first counted entry lights the team's lantern (lit_at, set once).
--   * Canvas: link (the bot's /canvas link), override (staff), target (what the
--     bot needs to build a note with lib/elemental/canvas), write, tombstone,
--     pending (what /el resync should retry).
--   * elemental_bot_handin: the team's video link (unused unless E30 ships).
--
-- The canvas write goes through whiteboard_merge_elements, saved as the board
-- owner (the merge's moderator), so a note may land inside a team's canvas.
-- A write that cannot land never raises: it sets the entry's canvas_status to
-- 'failed' and says why, and the entry still counts. No whiteboard_* or
-- shift_quest_* object is created, altered or granted here.
--
-- Prod-first apply (AGENTS.md): additive and idempotent, safe to run twice.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

/** When a hand-in turns late (Mon 7 Dec 23:00 Bangkok for the real edition). NULL: never late. */
ALTER TABLE public.elemental_editions ADD COLUMN IF NOT EXISTS handin_due_at timestamptz NULL;
UPDATE public.elemental_editions SET handin_due_at = '2026-12-07 23:00:00+07'
WHERE key = 'elemental-2026' AND handin_due_at IS NULL;

/**
 * A team's project canvas: a frame tagged customData.project on one of its
 * element's boards. One canvas per team, one team per frame.
 * elemental_bot_team_set_element (core file) deletes the row when the team
 * changes element.
 */
CREATE TABLE IF NOT EXISTS public.elemental_canvas_links (
  team_id uuid PRIMARY KEY REFERENCES public.elemental_teams (id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.whiteboards (id) ON DELETE CASCADE,
  frame_id text NOT NULL CHECK (char_length(frame_id) BETWEEN 1 AND 200),
  -- 'member' (/canvas link) or 'staff' (/el canvas-link).
  via text NOT NULL DEFAULT 'member' CHECK (via IN ('member', 'staff')),
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elemental_canvas_links_frame_key UNIQUE (frame_id)
);

CREATE INDEX IF NOT EXISTS elemental_canvas_links_board_idx ON public.elemental_canvas_links (board_id);
CREATE INDEX IF NOT EXISTS elemental_tester_entries_canvas_idx ON public.elemental_tester_entries (edition, canvas_status);

-- ---------------------------------------------------------------------------
-- Internal helpers (double underscore: granted to no one)
-- ---------------------------------------------------------------------------

/**
 * Whether a text is a fractional index Excalidraw could have made: a copy of
 * isValidIndex in lib/elemental/canvas/fracIndex.ts (base 62, the head letter
 * gives the integer part's length, no trailing zero after it, not the
 * smallest integer). supabase/tests/elemental/canvas/canvas.int.test.ts holds
 * the two equal.
 */
CREATE OR REPLACE FUNCTION public.elemental__valid_index(p_key text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_head integer;
  v_len integer;
  v_frac text;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_key !~ '^[0-9A-Za-z]+$' THEN
    RETURN false;
  END IF;
  v_head := ascii(p_key);
  IF v_head BETWEEN 97 AND 122 THEN
    v_len := v_head - 97 + 2;
  ELSIF v_head BETWEEN 65 AND 90 THEN
    v_len := 90 - v_head + 2;
  ELSE
    RETURN false;
  END IF;
  IF v_len > char_length(p_key) OR p_key = 'A' || repeat('0', 26) THEN
    RETURN false;
  END IF;
  v_frac := substr(p_key, v_len + 1);
  RETURN v_frac = '' OR right(v_frac, 1) <> '0';
END;
$$;

/** An element's box {x, y, width, height}, or NULL when any of them is not a number. */
CREATE OR REPLACE FUNCTION public.elemental__box(p_el jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_el -> 'x') = 'number' AND jsonb_typeof(p_el -> 'y') = 'number'
     AND jsonb_typeof(p_el -> 'width') = 'number' AND jsonb_typeof(p_el -> 'height') = 'number'
    THEN jsonb_build_object('x', p_el -> 'x', 'y', p_el -> 'y', 'width', p_el -> 'width', 'height', p_el -> 'height')
  END;
$$;

/** Whether two boxes overlap (lib/elemental/canvas/geometry.ts overlaps). NULL boxes never do. */
CREATE OR REPLACE FUNCTION public.elemental__overlaps(a jsonb, b jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    (a ->> 'x')::float8 < (b ->> 'x')::float8 + (b ->> 'width')::float8
    AND (b ->> 'x')::float8 < (a ->> 'x')::float8 + (a ->> 'width')::float8
    AND (a ->> 'y')::float8 < (b ->> 'y')::float8 + (b ->> 'height')::float8
    AND (b ->> 'y')::float8 < (a ->> 'y')::float8 + (a ->> 'height')::float8,
    false);
$$;

/** A deleted element: only a JSON true counts, as in browsers and the merge. */
CREATE OR REPLACE FUNCTION public.elemental__el_deleted(p_el jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(p_el -> 'isDeleted' = 'true'::jsonb, false);
$$;

/** A board element by id (the first copy), or NULL. */
CREATE OR REPLACE FUNCTION public.elemental__board_el(p_elements jsonb, p_id text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT el FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_elements) = 'array' THEN p_elements ELSE '[]'::jsonb END) AS el
  WHERE el ->> 'id' = p_id
  LIMIT 1;
$$;

/** Element ids of an entry's note (lib/elemental/canvas/note.ts noteIds). */
CREATE OR REPLACE FUNCTION public.elemental__note_ids(p_id uuid)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY['el-' || p_id::text || '-r', 'el-' || p_id::text || '-t'];
$$;

/**
 * One /tester field: spaces collapsed, NULL when empty, at most p_max
 * characters, no contacts. Errors: missing_field, too_long (DETAIL the
 * field), pii (DETAIL the field, HINT the kind).
 */
CREATE OR REPLACE FUNCTION public.elemental__tester_text(p_field text, p_text text, p_max integer, p_required boolean)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v text := nullif(btrim(regexp_replace(coalesce(p_text, ''), '[[:space:]]+', ' ', 'g')), '');
BEGIN
  IF v IS NULL THEN
    IF p_required THEN
      PERFORM public.elemental__fail('missing_field', p_field);
    END IF;
    RETURN NULL;
  END IF;
  IF char_length(v) > p_max THEN
    PERFORM public.elemental__fail('too_long', p_field);
  END IF;
  PERFORM public.elemental__refuse_pii(p_field, v);
  RETURN v;
END;
$$;

/** Counted, not removed entries of a team. */
CREATE OR REPLACE FUNCTION public.elemental__team_counted(p_team_id uuid)
RETURNS integer
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer FROM public.elemental_tester_entries
  WHERE team_id = p_team_id AND counted AND removed_at IS NULL;
$$;

/** Counted, not removed entries of live teams in an edition (totals' 'helped'). */
CREATE OR REPLACE FUNCTION public.elemental__edition_counted(p_edition text)
RETURNS integer
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer FROM public.elemental_tester_entries e
  JOIN public.elemental_teams t ON t.id = e.team_id
  WHERE e.edition = p_edition AND e.counted AND e.removed_at IS NULL AND public.elemental__is_live(t.status);
$$;

/** An entry as the bot sees it: its text, team and canvas state. Never the logger's Discord id. */
CREATE OR REPLACE FUNCTION public.elemental__entry_json(p_entry_id uuid)
RETURNS jsonb
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', e.id,
    'entry_id', e.id,
    'team_id', t.id,
    'slot', t.slot,
    'element', t.element,
    'project_name', t.project_name,
    'source', e.source,
    'who', e.who,
    'tried', e.tried,
    'quote', e.quote,
    'changed', e.changed,
    'counted', e.counted,
    'created_at', e.created_at,
    'edited_at', e.edited_at,
    'removed', e.removed_at IS NOT NULL,
    'reviewed', e.reviewed_at IS NOT NULL,
    'canvas_status', e.canvas_status,
    'canvas_ids', to_jsonb(e.canvas_ids))
  FROM public.elemental_tester_entries e
  JOIN public.elemental_teams t ON t.id = e.team_id
  WHERE e.id = p_entry_id;
$$;

/** The live team whose channel this is; el:not_team_channel otherwise. */
CREATE OR REPLACE FUNCTION public.elemental__team_by_channel(p_edition text, p_channel_id text)
RETURNS public.elemental_teams
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_teams;
BEGIN
  SELECT * INTO v FROM public.elemental_teams
  WHERE edition = p_edition AND discord_channel_id = p_channel_id AND public.elemental__is_live(status);
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('not_team_channel');
  END IF;
  RETURN v;
END;
$$;

/** The entry in this edition (locked); el:entry_not_found otherwise. */
CREATE OR REPLACE FUNCTION public.elemental__entry(p_edition text, p_entry_id uuid)
RETURNS public.elemental_tester_entries
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v public.elemental_tester_entries;
BEGIN
  SELECT * INTO v FROM public.elemental_tester_entries WHERE id = p_entry_id AND edition = p_edition FOR UPDATE;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('entry_not_found');
  END IF;
  RETURN v;
END;
$$;

/**
 * Adds an entry to a live team: counted while the team has fewer than
 * tester_cap counted entries; the first counted one lights the lantern
 * (compare-and-set on lit_at, under the team's row lock). The same entry from
 * the same person within 2 minutes returns the first one (repeated=true), so
 * a retried call never logs twice.
 */
CREATE OR REPLACE FUNCTION public.elemental__tester_insert(
  p_settings public.elemental_settings, p_team_id uuid, p_logger text, p_source text,
  p_who text, p_tried text, p_quote text, p_changed text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_who text := public.elemental__tester_text('who', p_who, 80, true);
  v_tried text := public.elemental__tester_text('tried', p_tried, 200, true);
  v_quote text := public.elemental__tester_text('quote', p_quote, 200, false);
  v_changed text := public.elemental__tester_text('changed', p_changed, 200, false);
  v_team public.elemental_teams;
  v_entry public.elemental_tester_entries;
  v_counted boolean;
  v_first boolean := false;
  v_linked boolean;
  v_repeated boolean := false;
BEGIN
  -- One add at a time per team: the count, the cap and the lantern stay exact.
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND OR NOT public.elemental__is_live(v_team.status) THEN
    PERFORM public.elemental__fail('team_not_found');
  END IF;
  v_linked := EXISTS (SELECT 1 FROM public.elemental_canvas_links WHERE team_id = v_team.id);

  SELECT * INTO v_entry FROM public.elemental_tester_entries
  WHERE team_id = v_team.id AND logger_discord_id = p_logger AND removed_at IS NULL
    AND created_at > now() - interval '2 minutes'
    AND who IS NOT DISTINCT FROM v_who AND tried IS NOT DISTINCT FROM v_tried
    AND quote IS NOT DISTINCT FROM v_quote AND changed IS NOT DISTINCT FROM v_changed
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    v_repeated := true;
  ELSE
    v_counted := public.elemental__team_counted(v_team.id) < p_settings.tester_cap;
    INSERT INTO public.elemental_tester_entries
      (edition, team_id, logger_discord_id, source, who, tried, quote, changed, counted, canvas_status)
    VALUES (p_settings.edition, v_team.id, p_logger, p_source, v_who, v_tried, v_quote, v_changed, v_counted,
            CASE WHEN v_linked THEN 'pending' ELSE 'none' END)
    RETURNING * INTO v_entry;
    IF v_counted THEN
      UPDATE public.elemental_teams SET lit_at = now(), updated_at = now()
      WHERE id = v_team.id AND lit_at IS NULL;
      v_first := FOUND;
    END IF;
    PERFORM public.elemental__audit(p_settings.edition, p_logger, 'tester_add', v_entry.id::text,
      jsonb_build_object('team_id', v_team.id, 'source', p_source, 'counted', v_counted));
  END IF;
  RETURN public.elemental__entry_json(v_entry.id) || jsonb_build_object(
    'first_counted', v_first,
    'team_total', public.elemental__team_counted(v_team.id),
    'edition_total', public.elemental__edition_counted(p_settings.edition),
    'cap', p_settings.tester_cap,
    'canvas_linked', v_linked,
    'repeated', v_repeated);
END;
$$;

/** A frame on a board, if it is there and not deleted. */
CREATE OR REPLACE FUNCTION public.elemental__live_frame(p_elements jsonb, p_frame_id text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT el FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_elements) = 'array' THEN p_elements ELSE '[]'::jsonb END) AS el
  WHERE el ->> 'id' = p_frame_id AND el ->> 'type' = 'frame' AND NOT public.elemental__el_deleted(el)
  LIMIT 1;
$$;

/**
 * Links (or relinks) a team to a project frame on an Elemental board of its
 * edition. Shared by /canvas link and the staff override; the caller holds
 * the edition lock. Checks, in this order (each its own error):
 *   board_not_found      the board is not one of the edition's boards
 *   wrong_element_board  it is another element's board (DETAIL that element); members only
 *   frame_not_found      no live frame with that id on the board
 *   not_project_frame    the frame is not a project canvas (customData.project)
 *   not_team_canvas      neither its owner nor its editors is a team member signed
 *                        in with Discord (auth.identities, provider 'discord'); members only
 *   frame_linked         another live team holds the frame (an archived team's hold lapses)
 * A relink marks the team's entries for a rewrite onto the new canvas.
 */
CREATE OR REPLACE FUNCTION public.elemental__canvas_link(
  p_team public.elemental_teams, p_board_id uuid, p_frame_id text, p_via text, p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff boolean := p_via = 'staff';
  v_board_element text;
  v_frame jsonb;
  v_owner text;
  v_editors jsonb;
  v_other public.elemental_teams;
  v_old public.elemental_canvas_links;
  v_frame_id text := btrim(coalesce(p_frame_id, ''));
BEGIN
  SELECT b.element INTO v_board_element FROM public.elemental_boards b
  WHERE b.edition = p_team.edition AND b.board_id = p_board_id
  ORDER BY (b.element = p_team.element) DESC
  LIMIT 1;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('board_not_found');
  END IF;
  IF NOT v_staff AND v_board_element <> p_team.element THEN
    PERFORM public.elemental__fail('wrong_element_board', v_board_element);
  END IF;

  IF char_length(v_frame_id) BETWEEN 1 AND 200 THEN
    v_frame := public.elemental__live_frame((SELECT elements FROM public.whiteboards WHERE id = p_board_id), v_frame_id);
  END IF;
  IF v_frame IS NULL THEN
    PERFORM public.elemental__fail('frame_not_found');
  END IF;
  IF jsonb_typeof(v_frame -> 'customData' -> 'project') IS DISTINCT FROM 'string'
     OR v_frame -> 'customData' ->> 'project' = '' THEN
    PERFORM public.elemental__fail('not_project_frame');
  END IF;

  IF NOT v_staff THEN
    -- The canvas's owner, as whiteboard_merge_elements reads it, and its team list.
    v_owner := coalesce(v_frame -> 'customData' ->> 'owner', v_frame -> 'customData' ->> 'createdBy');
    v_editors := CASE WHEN jsonb_typeof(v_frame -> 'customData' -> 'editors') = 'array'
                      THEN v_frame -> 'customData' -> 'editors' ELSE '[]'::jsonb END;
    IF NOT EXISTS (
      SELECT 1
      FROM public.elemental_members m
      JOIN auth.identities i ON i.provider = 'discord' AND i.provider_id = m.discord_user_id
      WHERE m.edition = p_team.edition AND m.team_id = p_team.id AND m.discord_user_id IS NOT NULL
        AND (i.user_id::text = v_owner OR v_editors ? i.user_id::text)) THEN
      PERFORM public.elemental__fail('not_team_canvas');
    END IF;
  END IF;

  SELECT t.* INTO v_other FROM public.elemental_canvas_links l
  JOIN public.elemental_teams t ON t.id = l.team_id
  WHERE l.frame_id = v_frame_id AND l.team_id <> p_team.id;
  IF FOUND THEN
    IF public.elemental__is_live(v_other.status) THEN
      PERFORM public.elemental__fail('frame_linked');
    END IF;
    DELETE FROM public.elemental_canvas_links WHERE team_id = v_other.id;
  END IF;

  SELECT * INTO v_old FROM public.elemental_canvas_links WHERE team_id = p_team.id FOR UPDATE;
  IF FOUND AND v_old.board_id = p_board_id AND v_old.frame_id = v_frame_id THEN
    RETURN jsonb_build_object('team_id', p_team.id, 'slot', p_team.slot, 'board_id', p_board_id, 'frame_id', v_frame_id,
      'already', true, 'replaced', NULL, 'via', v_old.via);
  END IF;

  INSERT INTO public.elemental_canvas_links (team_id, board_id, frame_id, via, linked_at)
  VALUES (p_team.id, p_board_id, v_frame_id, p_via, now())
  ON CONFLICT (team_id) DO UPDATE SET board_id = EXCLUDED.board_id, frame_id = EXCLUDED.frame_id,
    via = EXCLUDED.via, linked_at = EXCLUDED.linked_at;
  -- Notes go onto the new canvas: everything not yet removed is written again.
  UPDATE public.elemental_tester_entries SET canvas_status = 'pending'
  WHERE team_id = p_team.id AND removed_at IS NULL;
  PERFORM public.elemental__audit(p_team.edition, p_actor, 'canvas_link', p_team.id::text,
    jsonb_build_object('board_id', p_board_id, 'frame_id', v_frame_id, 'via', p_via,
                       'replaced', CASE WHEN v_old.team_id IS NOT NULL THEN v_old.frame_id END));
  RETURN jsonb_build_object('team_id', p_team.id, 'slot', p_team.slot, 'board_id', p_board_id, 'frame_id', v_frame_id,
    'already', false,
    'replaced', CASE WHEN v_old.team_id IS NOT NULL
                     THEN jsonb_build_object('board_id', v_old.board_id, 'frame_id', v_old.frame_id) END,
    'via', p_via);
END;
$$;

/**
 * What a canvas note shows, by the id the bot holds: a tester entry ('test'
 * note from /tester), a lesson answer ('reference' with source 'lesson', for
 * E21), or a team id ('ship' note: the team's hand-in link). Raises
 * el:entry_not_found when the id is none of them in this edition.
 */
CREATE OR REPLACE FUNCTION public.elemental__note_ref(
  p_edition text, p_id uuid,
  OUT kind text, OUT source text, OUT team_id uuid, OUT is_entry boolean,
  OUT removed boolean, OUT canvas_status text, OUT fields jsonb)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry public.elemental_tester_entries;
  v_lesson public.elemental_lesson_progress;
  v_team public.elemental_teams;
  v_due timestamptz;
BEGIN
  SELECT * INTO v_entry FROM public.elemental_tester_entries e WHERE e.id = p_id AND e.edition = p_edition;
  IF FOUND THEN
    kind := 'test'; source := 'tester'; team_id := v_entry.team_id; is_entry := true;
    removed := v_entry.removed_at IS NOT NULL; canvas_status := v_entry.canvas_status;
    fields := jsonb_build_object('who', v_entry.who, 'tried', v_entry.tried, 'quote', v_entry.quote, 'changed', v_entry.changed);
    RETURN;
  END IF;
  SELECT * INTO v_lesson FROM public.elemental_lesson_progress p
  WHERE p.id = p_id AND p.edition = p_edition AND p.team_id IS NOT NULL;
  IF FOUND THEN
    kind := 'reference'; source := 'lesson'; team_id := v_lesson.team_id; is_entry := false;
    removed := false; canvas_status := NULL;
    fields := jsonb_build_object('lesson_id', v_lesson.lesson_id, 'part', v_lesson.part, 'answer', v_lesson.answer);
    RETURN;
  END IF;
  SELECT * INTO v_team FROM public.elemental_teams t WHERE t.id = p_id AND t.edition = p_edition AND t.handin_url IS NOT NULL;
  IF FOUND THEN
    SELECT handin_due_at INTO v_due FROM public.elemental_editions WHERE key = p_edition;
    kind := 'ship'; source := 'handin'; team_id := v_team.id; is_entry := false;
    removed := false; canvas_status := NULL;
    fields := jsonb_build_object('url', v_team.handin_url, 'at', v_team.handin_at,
                                 'late', coalesce(v_team.handin_at > v_due, false));
    RETURN;
  END IF;
  PERFORM public.elemental__fail('entry_not_found');
END;
$$;

/** Sets an entry's canvas state (tester entries only; other notes keep none). */
CREATE OR REPLACE FUNCTION public.elemental__set_canvas_status(p_id uuid, p_status text, p_ids text[] DEFAULT NULL)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  UPDATE public.elemental_tester_entries
  SET canvas_status = p_status, canvas_ids = coalesce(p_ids, canvas_ids)
  WHERE id = p_id;
$$;

/** The reply of a canvas write or tombstone. */
CREATE OR REPLACE FUNCTION public.elemental__canvas_result(
  p_ok boolean, p_status text, p_reason text, p_ids text[], p_dropped jsonb DEFAULT '[]'::jsonb, p_present boolean DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object('ok', p_ok, 'status', p_status, 'reason', p_reason, 'ids', to_jsonb(p_ids),
                            'dropped', coalesce(p_dropped, '[]'::jsonb), 'present', p_present);
$$;

/**
 * Why a note's elements may not be written, or NULL when they may. The shape
 * buildNote and rewriteNote make (lib/elemental/canvas/note.ts): at most two
 * elements, the note's own ids ('el-<id>-r' a rectangle, 'el-<id>-t' its text),
 * both in the linked frame, the rectangle tagged with the note's kind and
 * source, the text bound to the rectangle, not deleted, no image and no link,
 * a valid fractional index, and small.
 */
CREATE OR REPLACE FUNCTION public.elemental__note_problem(
  p_elements jsonb, p_ids text[], p_frame_id text, p_kind text, p_source text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  el jsonb;
  v_ids text[] := '{}';
  v_rect jsonb;
  v_text jsonb;
BEGIN
  IF jsonb_typeof(p_elements) IS DISTINCT FROM 'array' OR jsonb_array_length(p_elements) NOT BETWEEN 1 AND 2 THEN
    RETURN 'bad_elements';
  END IF;
  IF octet_length(p_elements::text) > 24000 THEN
    RETURN 'too_large';
  END IF;
  FOR el IN SELECT value FROM jsonb_array_elements(p_elements) LOOP
    IF jsonb_typeof(el) IS DISTINCT FROM 'object' OR jsonb_typeof(el -> 'id') IS DISTINCT FROM 'string'
       OR NOT (el ->> 'id') = ANY (p_ids) OR (el ->> 'id') = ANY (v_ids) THEN
      RETURN 'bad_id';
    END IF;
    v_ids := v_ids || (el ->> 'id');
    IF (el ->> 'type') IS DISTINCT FROM (CASE WHEN el ->> 'id' = p_ids[1] THEN 'rectangle' ELSE 'text' END) THEN
      RETURN 'bad_type';
    END IF;
    IF el ->> 'frameId' IS DISTINCT FROM p_frame_id THEN
      RETURN 'bad_frame';
    END IF;
    IF (el ? 'fileId' AND el -> 'fileId' <> 'null'::jsonb) OR (el ? 'link' AND el -> 'link' <> 'null'::jsonb) THEN
      RETURN 'bad_field';
    END IF;
    IF jsonb_typeof(el -> 'version') IS DISTINCT FROM 'number' OR (el ->> 'version')::numeric < 1
       OR (el ->> 'version')::numeric <> trunc((el ->> 'version')::numeric)
       OR public.elemental__box(el) IS NULL
       -- A fractional index browsers can sort by (buildNote's keyBetween); a bad one would
       -- reorder or break the board for everyone on it.
       OR jsonb_typeof(el -> 'index') IS DISTINCT FROM 'string'
       OR NOT public.elemental__valid_index(el ->> 'index')
       OR coalesce(jsonb_typeof(el -> 'isDeleted'), 'null') NOT IN ('boolean', 'null')
       OR public.elemental__el_deleted(el)
       OR coalesce(jsonb_typeof(el -> 'customData'), 'null') NOT IN ('object', 'null') THEN
      RETURN 'bad_field';
    END IF;
    IF el ->> 'type' = 'rectangle' THEN
      v_rect := el;
    ELSE
      v_text := el;
    END IF;
  END LOOP;
  IF v_rect IS NOT NULL AND (v_rect -> 'customData' ->> 'card' IS DISTINCT FROM p_kind
                             OR v_rect -> 'customData' ->> 'source' IS DISTINCT FROM p_source) THEN
    RETURN 'bad_card';
  END IF;
  IF v_text IS NOT NULL AND (v_text ->> 'containerId' IS DISTINCT FROM p_ids[1]
                             OR jsonb_typeof(v_text -> 'text') IS DISTINCT FROM 'string'
                             OR v_text -> 'customData' ? 'card') THEN
    RETURN 'bad_container';
  END IF;
  IF v_rect IS NOT NULL AND v_text IS NOT NULL AND NOT coalesce(
       v_rect -> 'boundElements' @> jsonb_build_array(jsonb_build_object('id', p_ids[2], 'type', 'text')), false) THEN
    RETURN 'bad_container';
  END IF;
  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: /tester
-- ---------------------------------------------------------------------------

/**
 * /tester in a team channel, by a member of that team. who and tried are
 * required (who: general words, at most 80 characters; the rest at most 200);
 * no contacts in any field. Returns the entry plus first_counted, team_total,
 * edition_total, cap, canvas_linked and repeated (the same entry again within
 * 2 minutes). Errors: not_team_channel, not_team_member, missing_field,
 * too_long, pii.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_tester_add(
  p_guild_id text, p_channel_id text, p_logger text,
  p_who text, p_tried text, p_quote text DEFAULT NULL, p_changed text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_logger text := public.elemental__user(p_logger);
  v_team public.elemental_teams := public.elemental__team_by_channel(v_settings.edition, p_channel_id);
BEGIN
  IF (public.elemental__member(v_settings.edition, v_logger)).team_id IS DISTINCT FROM v_team.id THEN
    PERFORM public.elemental__fail('not_team_member');
  END IF;
  RETURN public.elemental__tester_insert(v_settings, v_team.id, v_logger, 'bot', p_who, p_tried, p_quote, p_changed);
END;
$$;

/**
 * /el tester-add slot: (Host, Helper): an entry from the form fallback, logged
 * by staff for the live team at p_slot. Counts like any other entry.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_tester_add_staff(
  p_guild_id text, p_actor text, p_slot integer,
  p_who text, p_tried text, p_quote text DEFAULT NULL, p_changed text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_team_id uuid;
BEGIN
  SELECT id INTO v_team_id FROM public.elemental_teams
  WHERE edition = v_settings.edition AND slot = p_slot AND public.elemental__is_live(status);
  IF v_team_id IS NULL THEN
    PERFORM public.elemental__fail('team_not_found');
  END IF;
  RETURN public.elemental__tester_insert(v_settings, v_team_id, v_actor, 'staff', p_who, p_tried, p_quote, p_changed);
END;
$$;

/**
 * /tester-edit: the person who logged the entry, within 10 minutes of logging
 * it, replaces its four fields (same rules as /tester). The canvas note is
 * marked for a rewrite (canvas_status 'pending', rewrite=true) unless it was
 * never placed. Errors: entry_not_found, not_logger, entry_removed,
 * edit_closed, missing_field, too_long, pii.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_tester_edit(
  p_guild_id text, p_entry_id uuid, p_logger text,
  p_who text, p_tried text, p_quote text DEFAULT NULL, p_changed text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_logger text := public.elemental__user(p_logger);
  v_entry public.elemental_tester_entries := public.elemental__entry(v_settings.edition, p_entry_id);
  v_who text;
  v_tried text;
  v_quote text;
  v_changed text;
  v_rewrite boolean;
BEGIN
  IF v_entry.logger_discord_id IS DISTINCT FROM v_logger THEN
    PERFORM public.elemental__fail('not_logger');
  END IF;
  IF v_entry.removed_at IS NOT NULL THEN
    PERFORM public.elemental__fail('entry_removed');
  END IF;
  IF v_entry.created_at < now() - interval '10 minutes' THEN
    PERFORM public.elemental__fail('edit_closed');
  END IF;
  v_who := public.elemental__tester_text('who', p_who, 80, true);
  v_tried := public.elemental__tester_text('tried', p_tried, 200, true);
  v_quote := public.elemental__tester_text('quote', p_quote, 200, false);
  v_changed := public.elemental__tester_text('changed', p_changed, 200, false);
  v_rewrite := v_entry.canvas_status <> 'none';
  UPDATE public.elemental_tester_entries
  SET who = v_who, tried = v_tried, quote = v_quote, changed = v_changed, edited_at = now(),
      canvas_status = CASE WHEN v_rewrite THEN 'pending' ELSE canvas_status END
  WHERE id = v_entry.id;
  PERFORM public.elemental__audit(v_settings.edition, v_logger, 'tester_edit', v_entry.id::text, '{}'::jsonb);
  RETURN public.elemental__entry_json(v_entry.id) || jsonb_build_object('rewrite', v_rewrite);
END;
$$;

/**
 * Staff Remove button: the entry stops counting (the team's next entry can
 * count again) and is kept for the record with the reason (at most 200
 * characters, never in the audit log). A team left with no counted entry goes
 * dark. The bot then calls elemental_bot_canvas_tombstone. Repeating returns
 * already=true. Errors: entry_not_found, too_long.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_tester_remove(
  p_guild_id text, p_entry_id uuid, p_actor text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_team_id uuid;
  v_entry public.elemental_tester_entries;
  v_lit boolean;
BEGIN
  IF char_length(v_reason) > 200 THEN
    PERFORM public.elemental__fail('too_long', 'reason');
  END IF;
  SELECT team_id INTO v_team_id FROM public.elemental_tester_entries WHERE id = p_entry_id AND edition = v_settings.edition;
  IF NOT FOUND THEN
    PERFORM public.elemental__fail('entry_not_found');
  END IF;
  -- Team row first, as /tester takes it, so a removal and an add never cross.
  PERFORM 1 FROM public.elemental_teams WHERE id = v_team_id FOR UPDATE;
  v_entry := public.elemental__entry(v_settings.edition, p_entry_id);
  IF v_entry.removed_at IS NOT NULL THEN
    RETURN public.elemental__entry_json(v_entry.id) || jsonb_build_object(
      'already', true, 'was_counted', false, 'team_total', public.elemental__team_counted(v_team_id),
      'lit', (SELECT lit_at IS NOT NULL FROM public.elemental_teams WHERE id = v_team_id));
  END IF;
  UPDATE public.elemental_tester_entries
  SET removed_at = now(), removed_by = v_actor, removed_reason = v_reason, counted = false
  WHERE id = v_entry.id;
  UPDATE public.elemental_teams SET lit_at = NULL, updated_at = now()
  WHERE id = v_team_id AND lit_at IS NOT NULL AND public.elemental__team_counted(v_team_id) = 0;
  SELECT lit_at IS NOT NULL INTO v_lit FROM public.elemental_teams WHERE id = v_team_id;
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'tester_remove', v_entry.id::text,
    jsonb_build_object('team_id', v_team_id, 'was_counted', v_entry.counted));
  RETURN public.elemental__entry_json(v_entry.id) || jsonb_build_object(
    'already', false, 'was_counted', v_entry.counted, 'team_total', public.elemental__team_counted(v_team_id), 'lit', v_lit);
END;
$$;

/** Staff Reviewed button. Repeating returns already=true. Errors: entry_not_found. */
CREATE OR REPLACE FUNCTION public.elemental_bot_tester_review(p_guild_id text, p_entry_id uuid, p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_entry public.elemental_tester_entries := public.elemental__entry(v_settings.edition, p_entry_id);
BEGIN
  IF v_entry.reviewed_at IS NOT NULL THEN
    RETURN public.elemental__entry_json(v_entry.id) || jsonb_build_object('already', true);
  END IF;
  UPDATE public.elemental_tester_entries SET reviewed_at = now(), reviewed_by = v_actor WHERE id = v_entry.id;
  PERFORM public.elemental__audit(v_settings.edition, v_actor, 'tester_review', v_entry.id::text, '{}'::jsonb);
  RETURN public.elemental__entry_json(v_entry.id) || jsonb_build_object('already', false);
END;
$$;

/**
 * /el sample n: element: (Host, Helper): up to n (1..25) random entries nobody
 * has reviewed or removed, from live teams, optionally of one element. No
 * Discord ids. Errors: bad_n, bad_element.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_tester_sample(
  p_guild_id text, p_actor text, p_n integer, p_element text DEFAULT NULL)
RETURNS TABLE (
  entry_id uuid, team_id uuid, slot integer, element text, project_name text,
  who text, tried text, quote text, changed text, counted boolean, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_element text;
BEGIN
  IF p_n IS NULL OR p_n NOT BETWEEN 1 AND 25 THEN
    PERFORM public.elemental__fail('bad_n');
  END IF;
  IF p_element IS NOT NULL THEN
    v_element := public.elemental__element(p_element);
  END IF;
  RETURN QUERY
    SELECT e.id, t.id, t.slot, t.element, t.project_name, e.who, e.tried, e.quote, e.changed, e.counted, e.created_at
    FROM public.elemental_tester_entries e
    JOIN public.elemental_teams t ON t.id = e.team_id
    WHERE e.edition = v_settings.edition AND e.removed_at IS NULL AND e.reviewed_at IS NULL
      AND public.elemental__is_live(t.status) AND (v_element IS NULL OR t.element = v_element)
    ORDER BY random()
    LIMIT p_n;
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: team canvases
-- ---------------------------------------------------------------------------

/**
 * /canvas link url: in a team channel. p_board_id and p_frame_id come from
 * the canvas URL (passionseed.org/whiteboard/<board>?focus=<frame>). The
 * board must be one of the edition's boards for the team's element, the frame
 * a live project canvas (customData.project), not held by another live team,
 * and its owner or editors must include a team member signed in to
 * PassionSeed with Discord (auth.identities, provider 'discord'). p_user is
 * who ran the command (audit only). Returns {team_id, slot, board_id,
 * frame_id, already, replaced: {board_id, frame_id} | null, via}. Errors:
 * not_team_channel, board_not_found, wrong_element_board (DETAIL the board's
 * element), frame_not_found, not_project_frame, frame_linked, not_team_canvas.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_canvas_link(
  p_guild_id text, p_channel_id text, p_board_id uuid, p_frame_id text, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_user text := public.elemental__user(p_user);
  v_team public.elemental_teams := public.elemental__team_by_channel(v_settings.edition, p_channel_id);
BEGIN
  -- Serialises links in the edition, so two teams cannot take one frame at once.
  PERFORM public.elemental__lock(v_settings.edition);
  RETURN public.elemental__canvas_link(v_team, p_board_id, p_frame_id, 'member', v_user);
END;
$$;

/**
 * /el canvas-link slot: url: (Host): links the live team at p_slot to a
 * project frame on any of the edition's boards, without the element and
 * member checks (a team whose members cannot sign in, or a canvas on another
 * element's board). The frame must still be a live project canvas that no
 * other live team holds. Same reply and errors as elemental_bot_canvas_link,
 * plus team_not_found.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_canvas_override(
  p_guild_id text, p_actor text, p_slot integer, p_board_id uuid, p_frame_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_actor text := public.elemental__user(p_actor);
  v_team public.elemental_teams;
BEGIN
  PERFORM public.elemental__lock(v_settings.edition);
  v_team := public.elemental__team_by_slot(v_settings.edition, p_slot);
  RETURN public.elemental__canvas_link(v_team, p_board_id, p_frame_id, 'staff', v_actor);
END;
$$;

/**
 * Everything the bot needs to build a note for p_entry_id with
 * lib/elemental/canvas (buildNote, or rewriteNote when prev is set):
 *   entry_id, kind ('test' | 'reference' | 'ship'), source, team_id, slot,
 *   element, project_name, live, removed, canvas_status (tester entries),
 *   fields ({who, tried, quote, changed} | {lesson_id, part, answer} |
 *   {url, at, late}), note_ids {rect, text}, linked,
 * and when linked:
 *   board_id, frame_id, owner_id (the board owner: buildNote's ownerId),
 *   frame (its box, NULL when the frame is gone), zone (the box of the
 *   frame's zone for this kind, NULL when it has none: fall back to frame),
 *   after_index (the board's highest valid index, deleted elements included:
 *   lastIndex), nearby (live elements overlapping the zone, or the frame,
 *   other than this note, as {id, type, x, y, width, height, isDeleted,
 *   containerId, customData: {zone?, zoneLabel?, canvasHint?}}: filter them
 *   with isPlacementObstacle), prev ([rect, text] as saved, or NULL),
 *   prev_deleted and prev_on_frame.
 * Reads only. Errors: unknown_guild, entry_not_found.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_canvas_target(p_guild_id text, p_entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  r record;
  v_team public.elemental_teams;
  v_link public.elemental_canvas_links;
  v_ids text[] := public.elemental__note_ids(p_entry_id);
  v_base jsonb;
  v_owner uuid;
  v_elements jsonb;
  v_frame jsonb;
  v_zone jsonb;
  v_area jsonb;
  v_rect jsonb;
  v_text jsonb;
BEGIN
  SELECT * INTO r FROM public.elemental__note_ref(v_settings.edition, p_entry_id);
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = r.team_id;
  SELECT * INTO v_link FROM public.elemental_canvas_links WHERE team_id = v_team.id;
  v_base := jsonb_build_object(
    'entry_id', p_entry_id, 'kind', r.kind, 'source', r.source,
    'team_id', v_team.id, 'slot', v_team.slot, 'element', v_team.element, 'project_name', v_team.project_name,
    'live', public.elemental__is_live(v_team.status), 'removed', r.removed, 'canvas_status', r.canvas_status,
    'fields', r.fields, 'note_ids', jsonb_build_object('rect', v_ids[1], 'text', v_ids[2]),
    'linked', v_link.team_id IS NOT NULL);
  IF v_link.team_id IS NULL THEN
    RETURN v_base;
  END IF;

  SELECT owner_id, elements INTO v_owner, v_elements FROM public.whiteboards WHERE id = v_link.board_id;
  v_frame := public.elemental__live_frame(v_elements, v_link.frame_id);
  SELECT public.elemental__box(el) INTO v_zone
  FROM jsonb_array_elements(v_elements) AS el
  WHERE el ->> 'type' = 'rectangle' AND NOT public.elemental__el_deleted(el)
    AND el ->> 'frameId' = v_link.frame_id AND el -> 'customData' ->> 'zone' = r.kind
    AND public.elemental__box(el) IS NOT NULL
  ORDER BY el ->> 'index' COLLATE "C", el ->> 'id' COLLATE "C"
  LIMIT 1;
  v_area := coalesce(v_zone, public.elemental__box(v_frame));
  v_rect := public.elemental__board_el(v_elements, v_ids[1]);
  v_text := public.elemental__board_el(v_elements, v_ids[2]);

  RETURN v_base || jsonb_build_object(
    'board_id', v_link.board_id,
    'frame_id', v_link.frame_id,
    'owner_id', v_owner,
    'frame', public.elemental__box(v_frame),
    'zone', v_zone,
    'after_index', (
      SELECT max(el ->> 'index' COLLATE "C") FROM jsonb_array_elements(v_elements) AS el
      WHERE jsonb_typeof(el -> 'index') = 'string' AND public.elemental__valid_index(el ->> 'index')),
    'nearby', CASE WHEN v_area IS NULL THEN '[]'::jsonb ELSE coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'id', el -> 'id', 'type', el -> 'type', 'x', el -> 'x', 'y', el -> 'y', 'width', el -> 'width',
          'height', el -> 'height', 'isDeleted', false, 'containerId', el -> 'containerId',
          'customData', coalesce((
            SELECT jsonb_object_agg(c.k, c.v)
            FROM jsonb_each(CASE WHEN jsonb_typeof(el -> 'customData') = 'object' THEN el -> 'customData' END) AS c(k, v)
            WHERE c.k IN ('zone', 'zoneLabel', 'canvasHint')), '{}'::jsonb))
        ORDER BY el ->> 'index' COLLATE "C")
      FROM jsonb_array_elements(v_elements) AS el
      WHERE NOT public.elemental__el_deleted(el) AND NOT (el ->> 'id') = ANY (v_ids)
        AND public.elemental__overlaps(public.elemental__box(el), v_area)), '[]'::jsonb) END,
    'prev', CASE WHEN v_rect IS NOT NULL AND v_text IS NOT NULL THEN jsonb_build_array(v_rect, v_text) END,
    'prev_deleted', CASE WHEN v_rect IS NOT NULL THEN public.elemental__el_deleted(v_rect) END,
    'prev_on_frame', CASE WHEN v_rect IS NOT NULL THEN v_rect ->> 'frameId' IS NOT DISTINCT FROM v_link.frame_id END);
END;
$$;

/**
 * Writes a note the bot built (buildNote or rewriteNote) onto the team's
 * linked canvas through whiteboard_merge_elements, saved as the board owner
 * (customData.createdBy and updatedBy are stamped with them). The elements
 * must be the note's own (see elemental__note_problem). A saved copy left on
 * another frame (the team relinked on the same board) is overwritten: the
 * write's versions are raised above it.
 *
 * Never raises for a write that cannot land: it returns {ok: false, status,
 * reason, ids, dropped, present} and, for a tester entry, sets canvas_status
 * 'failed' (or 'none' when the team has no canvas). Reasons: not_linked,
 * frame_gone, removed, team_not_live, bad_elements, too_large, bad_id,
 * bad_type, bad_frame, bad_field, bad_card, bad_container, dropped (the merge
 * left something out), merge_error. On success: ok true, status 'written',
 * ids [rect, text], present (the note is live on the board). Raises only
 * unknown_guild and entry_not_found.
 *
 * node-postgres: pass the elements as JSON.stringify(note), never a JS array.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_canvas_write(p_guild_id text, p_entry_id uuid, p_elements jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  r record;
  v_team public.elemental_teams;
  v_link public.elemental_canvas_links;
  v_ids text[] := public.elemental__note_ids(p_entry_id);
  v_owner uuid;
  v_elements jsonb;
  v_problem text;
  v_stamped jsonb;
  v_result jsonb;
  v_dropped jsonb;
  v_present boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM public.elemental_tester_entries WHERE id = p_entry_id AND edition = v_settings.edition) THEN
    PERFORM public.elemental__entry(v_settings.edition, p_entry_id);
  END IF;
  SELECT * INTO r FROM public.elemental__note_ref(v_settings.edition, p_entry_id);
  IF r.removed THEN
    RETURN public.elemental__canvas_result(false, r.canvas_status, 'removed', v_ids);
  END IF;
  SELECT * INTO v_team FROM public.elemental_teams WHERE id = r.team_id;
  IF NOT public.elemental__is_live(v_team.status) THEN
    RETURN public.elemental__canvas_result(false, r.canvas_status, 'team_not_live', v_ids);
  END IF;
  SELECT * INTO v_link FROM public.elemental_canvas_links WHERE team_id = v_team.id;
  IF NOT FOUND THEN
    IF r.is_entry THEN
      PERFORM public.elemental__set_canvas_status(p_entry_id, 'none');
    END IF;
    RETURN public.elemental__canvas_result(false, CASE WHEN r.is_entry THEN 'none' END, 'not_linked', v_ids);
  END IF;

  -- The board's row lock is taken here and again by the merge in this transaction.
  SELECT owner_id, elements INTO v_owner, v_elements FROM public.whiteboards WHERE id = v_link.board_id FOR UPDATE;
  IF public.elemental__live_frame(v_elements, v_link.frame_id) IS NULL THEN
    v_problem := 'frame_gone';
  ELSE
    v_problem := public.elemental__note_problem(p_elements, v_ids, v_link.frame_id, r.kind, r.source);
  END IF;
  IF v_problem IS NOT NULL THEN
    IF r.is_entry THEN
      PERFORM public.elemental__set_canvas_status(p_entry_id, 'failed');
    END IF;
    RETURN public.elemental__canvas_result(false, CASE WHEN r.is_entry THEN 'failed' END, v_problem, v_ids);
  END IF;

  SELECT jsonb_agg(
      t.el
      || jsonb_build_object('customData',
           CASE WHEN jsonb_typeof(t.el -> 'customData') = 'object' THEN t.el -> 'customData' ELSE '{}'::jsonb END
           || jsonb_build_object('createdBy', v_owner::text, 'updatedBy', v_owner::text))
      || CASE WHEN s.el IS NOT NULL AND s.el ->> 'frameId' IS DISTINCT FROM v_link.frame_id
                   AND jsonb_typeof(s.el -> 'version') = 'number'
              THEN jsonb_build_object('version', (s.el ->> 'version')::bigint + (t.el ->> 'version')::bigint)
              ELSE '{}'::jsonb END
      ORDER BY t.ord)
  INTO v_stamped
  FROM jsonb_array_elements(p_elements) WITH ORDINALITY AS t(el, ord)
  LEFT JOIN LATERAL (SELECT public.elemental__board_el(v_elements, t.el ->> 'id') AS el) s ON true;

  BEGIN
    v_result := public.whiteboard_merge_elements(v_link.board_id, v_stamped);
  EXCEPTION WHEN others THEN
    IF r.is_entry THEN
      PERFORM public.elemental__set_canvas_status(p_entry_id, 'failed');
    END IF;
    RETURN public.elemental__canvas_result(false, CASE WHEN r.is_entry THEN 'failed' END, 'merge_error', v_ids);
  END;
  v_dropped := coalesce(v_result -> 'dropped', '[]'::jsonb);
  IF jsonb_array_length(v_dropped) > 0 THEN
    IF r.is_entry THEN
      PERFORM public.elemental__set_canvas_status(p_entry_id, 'failed');
    END IF;
    RETURN public.elemental__canvas_result(false, CASE WHEN r.is_entry THEN 'failed' END, 'dropped', v_ids, v_dropped);
  END IF;

  SELECT NOT public.elemental__el_deleted(public.elemental__board_el(w.elements, v_ids[1]))
  INTO v_present FROM public.whiteboards w WHERE w.id = v_link.board_id;
  IF r.is_entry THEN
    PERFORM public.elemental__set_canvas_status(p_entry_id, 'written', v_ids);
  END IF;
  RETURN public.elemental__canvas_result(true, CASE WHEN r.is_entry THEN 'written' END, NULL, v_ids, '[]'::jsonb,
                                         coalesce(v_present, false));
END;
$$;

/**
 * Takes a note off the canvas: each of its live elements, wherever it is on
 * the team's board or the edition's boards, is saved again as deleted, one
 * version higher, as the board owner. Called after elemental_bot_tester_remove
 * (and by /el resync for removed entries). Sets canvas_status 'tombstoned'
 * (also when nothing was on a board). Never raises for the board write: a
 * failed merge sets 'failed' and returns ok=false, reason 'merge_error' or
 * 'dropped'. Reply: {ok, status, reason, ids, dropped, present: false}.
 * Raises unknown_guild and entry_not_found.
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_canvas_tombstone(p_guild_id text, p_entry_id uuid, p_actor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  r record;
  v_ids text[] := public.elemental__note_ids(p_entry_id);
  v_board record;
  v_els jsonb;
  v_tomb jsonb;
  v_result jsonb;
  v_dropped jsonb := '[]'::jsonb;
  v_now_ms bigint := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
BEGIN
  IF p_actor IS NOT NULL THEN
    PERFORM public.elemental__user(p_actor);
  END IF;
  IF EXISTS (SELECT 1 FROM public.elemental_tester_entries WHERE id = p_entry_id AND edition = v_settings.edition) THEN
    PERFORM public.elemental__entry(v_settings.edition, p_entry_id);
  END IF;
  SELECT * INTO r FROM public.elemental__note_ref(v_settings.edition, p_entry_id);

  -- Every board that still shows the note, in board-id order (two tombstones never cross locks).
  FOR v_board IN
    SELECT w.id, w.owner_id
    FROM public.whiteboards w
    WHERE (w.id IN (SELECT board_id FROM public.elemental_canvas_links WHERE team_id = r.team_id)
           OR w.id IN (SELECT board_id FROM public.elemental_boards WHERE edition = v_settings.edition))
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(w.elements) AS el
                  WHERE el ->> 'id' = ANY (v_ids) AND NOT public.elemental__el_deleted(el))
    ORDER BY w.id
  LOOP
    BEGIN
      SELECT elements INTO v_els FROM public.whiteboards WHERE id = v_board.id FOR UPDATE;
      SELECT jsonb_agg(
          el || jsonb_build_object(
            'isDeleted', true,
            'version', CASE WHEN jsonb_typeof(el -> 'version') = 'number' THEN (el ->> 'version')::bigint ELSE 0 END + 1,
            'versionNonce', (floor(random() * 2147483646) + 1)::bigint,
            'updated', v_now_ms,
            'customData', CASE WHEN jsonb_typeof(el -> 'customData') = 'object' THEN el -> 'customData' ELSE '{}'::jsonb END
                          || jsonb_build_object('updatedBy', v_board.owner_id::text))
          ORDER BY el ->> 'id')
      INTO v_tomb
      FROM jsonb_array_elements(v_els) AS el
      WHERE el ->> 'id' = ANY (v_ids) AND NOT public.elemental__el_deleted(el);
      IF v_tomb IS NOT NULL THEN
        v_result := public.whiteboard_merge_elements(v_board.id, v_tomb);
        v_dropped := v_dropped || coalesce(v_result -> 'dropped', '[]'::jsonb);
      END IF;
    EXCEPTION WHEN others THEN
      IF r.is_entry THEN
        PERFORM public.elemental__set_canvas_status(p_entry_id, 'failed');
      END IF;
      RETURN public.elemental__canvas_result(false, CASE WHEN r.is_entry THEN 'failed' END, 'merge_error', v_ids);
    END;
  END LOOP;

  IF jsonb_array_length(v_dropped) > 0 THEN
    IF r.is_entry THEN
      PERFORM public.elemental__set_canvas_status(p_entry_id, 'failed');
    END IF;
    RETURN public.elemental__canvas_result(false, CASE WHEN r.is_entry THEN 'failed' END, 'dropped', v_ids, v_dropped, false);
  END IF;
  IF r.is_entry THEN
    PERFORM public.elemental__set_canvas_status(p_entry_id, 'tombstoned');
  END IF;
  PERFORM public.elemental__audit(v_settings.edition, p_actor, 'canvas_tombstone', p_entry_id::text, '{}'::jsonb);
  RETURN public.elemental__canvas_result(true, CASE WHEN r.is_entry THEN 'tombstoned' END, NULL, v_ids, '[]'::jsonb, false);
END;
$$;

/**
 * What /el resync (and the bot on start) should retry, oldest first, at most
 * p_limit (1..500): action 'write' for entries of live, linked teams whose
 * note is not written (none, pending or failed); action 'tombstone' for
 * removed entries whose note may still show (written, pending or failed).
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_canvas_pending(p_guild_id text, p_limit integer DEFAULT 100)
RETURNS TABLE (entry_id uuid, team_id uuid, slot integer, action text, canvas_status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN
    PERFORM public.elemental__fail('bad_n');
  END IF;
  RETURN QUERY
    SELECT e.id, t.id, t.slot,
      CASE WHEN e.removed_at IS NULL THEN 'write' ELSE 'tombstone' END,
      e.canvas_status
    FROM public.elemental_tester_entries e
    JOIN public.elemental_teams t ON t.id = e.team_id
    WHERE e.edition = v_settings.edition
      AND (
        (e.removed_at IS NULL AND e.canvas_status IN ('none', 'pending', 'failed')
         AND public.elemental__is_live(t.status)
         AND EXISTS (SELECT 1 FROM public.elemental_canvas_links l WHERE l.team_id = t.id))
        OR (e.removed_at IS NOT NULL AND e.canvas_status IN ('written', 'pending', 'failed')))
    ORDER BY e.created_at, e.id
    LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------------------
-- elemental_bot: hand-in (E30; harmless while unused)
-- ---------------------------------------------------------------------------

/**
 * /handin in a team channel by a member: the team's video link (https,
 * YouTube, Google Drive or TikTok, at most 500 characters). p_at is when the
 * student submitted (the interaction's time; NULL: now), so a queued retry is
 * judged by the press, not the retry. Late after the edition's handin_due_at
 * (Mon 7 Dec 23:00 Bangkok for the real edition); late hand-ins are kept and
 * flagged. A resubmission replaces the link; the 'ship' note's id is the team
 * id (elemental_bot_canvas_target with the team id). Returns {team_id, slot,
 * url, at, late, due_at, resubmitted, note_id, canvas_linked}. Errors:
 * not_team_channel, not_team_member, bad_url (DETAIL 'format' or 'host').
 */
CREATE OR REPLACE FUNCTION public.elemental_bot_handin(
  p_guild_id text, p_channel_id text, p_url text, p_at timestamptz, p_user text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_settings public.elemental_settings := public.elemental__settings(p_guild_id);
  v_user text := public.elemental__user(p_user);
  v_team public.elemental_teams := public.elemental__team_by_channel(v_settings.edition, p_channel_id);
  v_url text := btrim(coalesce(p_url, ''));
  v_host text;
  v_at timestamptz := coalesce(p_at, now());
  v_due timestamptz;
  v_late boolean;
BEGIN
  IF (public.elemental__member(v_settings.edition, v_user)).team_id IS DISTINCT FROM v_team.id THEN
    PERFORM public.elemental__fail('not_team_member');
  END IF;
  IF char_length(v_url) > 500 OR v_url !~ '^https://[^[:space:]/?#@]+([/?#][^[:space:]]*)?$' THEN
    PERFORM public.elemental__fail('bad_url', 'format');
  END IF;
  v_host := lower(substring(v_url FROM '^https://([^/?#:]+)(?::443)?(?:[/?#]|$)'));
  IF v_host IS NULL OR v_host NOT IN (
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
    'drive.google.com',
    'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com') THEN
    PERFORM public.elemental__fail('bad_url', 'host');
  END IF;
  SELECT handin_due_at INTO v_due FROM public.elemental_editions WHERE key = v_settings.edition;
  v_late := coalesce(v_at > v_due, false);
  UPDATE public.elemental_teams SET handin_url = v_url, handin_at = v_at, updated_at = now() WHERE id = v_team.id;
  PERFORM public.elemental__audit(v_settings.edition, v_user, 'handin', v_team.id::text,
    jsonb_build_object('late', v_late, 'resubmitted', v_team.handin_url IS NOT NULL));
  RETURN jsonb_build_object(
    'team_id', v_team.id, 'slot', v_team.slot, 'url', v_url, 'at', v_at, 'late', v_late, 'due_at', v_due,
    'resubmitted', v_team.handin_url IS NOT NULL, 'note_id', v_team.id,
    'canvas_linked', EXISTS (SELECT 1 FROM public.elemental_canvas_links WHERE team_id = v_team.id));
END;
$$;

-- ---------------------------------------------------------------------------
-- Access (as in the core file)
-- ---------------------------------------------------------------------------

ALTER TABLE public.elemental_canvas_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.elemental_canvas_links FROM PUBLIC, anon, authenticated, elemental_bot;
GRANT ALL ON TABLE public.elemental_canvas_links TO service_role;
DROP POLICY IF EXISTS "admins read elemental_canvas_links" ON public.elemental_canvas_links;
CREATE POLICY "admins read elemental_canvas_links" ON public.elemental_canvas_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Functions: nothing for PUBLIC, anon or authenticated. Helpers for no one;
-- every other elemental_* function for service_role; elemental_bot_* (not
-- elemental_bot__*) also for elemental_bot. The core file's loop, repeated.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'elemental\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, elemental_bot', fn.sig);
    IF fn.proname LIKE 'elemental\_\_%' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM service_role', fn.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    END IF;
    IF fn.proname LIKE 'elemental\_bot\_%' AND fn.proname NOT LIKE 'elemental\_bot\_\_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO elemental_bot', fn.sig);
    END IF;
  END LOOP;
END;
$$;

-- The pure CHECK-constraint helpers run as whoever writes the row (core file).
GRANT EXECUTE ON FUNCTION public.elemental__elements() TO service_role;
GRANT EXECUTE ON FUNCTION public.elemental__is_snowflake(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.elemental__valid_schedule(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.elemental__valid_card_override(jsonb) TO service_role;
