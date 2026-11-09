-- SHIFT project canvases: only a canvas's owner, the teammates they list, and
-- the board's owner may change anything inside it. A canvas is a frame tagged
-- customData.project; its owner is customData.owner (or, for canvases from
-- before owners, customData.createdBy) and its team is customData.editors.
--
-- Enforced here, where every save is merged under a row lock, so no client can
-- get around it: changes the saver may not make are left out of the merge. The
-- same rule runs in the browser (lib/whiteboard/canvas-access.ts) so people see
-- why. Everything outside project canvases merges exactly as before.
--
-- Same signature as before (CREATE OR REPLACE), so callers are unchanged.
-- Idempotent: safe to run twice.

-- A clean team list: user ids, no repeats, not the owner, at most 30.
CREATE OR REPLACE FUNCTION public.whiteboard_canvas_editors(p_value JSONB, p_owner TEXT)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(t.e ORDER BY t.e), '[]'::jsonb)
  FROM (
    SELECT DISTINCT e
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_value) = 'array' THEN p_value ELSE '[]'::jsonb END) AS e
    WHERE e ~ '^[0-9a-f-]{36}$' AND e IS DISTINCT FROM p_owner
    ORDER BY e
    LIMIT 30
  ) t;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_canvas_editors(JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_canvas_editors(JSONB, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.whiteboard_merge_elements(p_board UUID, p_elements JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_elements JSONB;
  board_owner UUID;
  change_items JSONB;
  saver UUID;
  saver_id TEXT;
  is_manager BOOLEAN;
BEGIN
  SELECT elements, owner_id INTO current_elements, board_owner FROM public.whiteboards WHERE id = p_board FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'whiteboard % not found', p_board;
  END IF;

  -- Who is saving: the API stamps customData.updatedBy with the signed-in user on every element.
  SELECT el->'customData'->>'updatedBy' INTO saver_id
  FROM jsonb_array_elements(p_elements) el
  WHERE el->'customData'->>'updatedBy' ~ '^[0-9a-f-]{36}$'
  LIMIT 1;
  is_manager := saver_id IS NOT NULL AND saver_id = board_owner::TEXT;

  -- Canvas access: drop what the saver may not change, and fix canvas owners and teams.
  -- Deleted canvases count too, so no one but the owner can bring one back, and then as theirs.
  WITH canvases AS (
    SELECT el->>'id' AS id,
           COALESCE(el->'customData'->>'owner', el->'customData'->>'createdBy') AS owner,
           el->'customData'->'editors' AS editors,
           el->'customData'->>'project' AS project,
           COALESCE((el->>'isDeleted')::BOOLEAN, false) AS deleted
    FROM jsonb_array_elements(current_elements) el
    WHERE el->>'type' = 'frame'
      AND jsonb_typeof(el->'customData'->'project') = 'string'
      AND COALESCE(el->'customData'->>'owner', el->'customData'->>'createdBy') <> ''
  ),
  saved AS (
    SELECT el->>'id' AS id, el FROM jsonb_array_elements(current_elements) el
  ),
  incoming AS (
    SELECT t.el->>'id' AS id, t.el, t.ord
    FROM jsonb_array_elements(p_elements) WITH ORDINALITY AS t(el, ord)
    WHERE t.el ? 'id'
  ),
  -- Every canvas each incoming element was in or is going into: its saved and new frame,
  -- itself if it is (or was saved as) a canvas, so a change claiming another type cannot
  -- overwrite or delete a canvas, and the frame of the note its text belongs to.
  touched AS (
    SELECT i.ord, f.canvas_id
    FROM incoming i
    LEFT JOIN saved s ON s.id = i.id
    CROSS JOIN LATERAL (VALUES
      (s.el->>'frameId'),
      (i.el->>'frameId'),
      (CASE WHEN i.el->>'type' = 'frame' THEN i.id END),
      (CASE WHEN s.el->>'type' = 'frame' THEN s.id END),
      ((SELECT COALESCE(ic.el->>'frameId', sc.el->>'frameId')
        FROM (SELECT COALESCE(i.el->>'containerId', s.el->>'containerId') AS cid) c
        LEFT JOIN incoming ic ON ic.id = c.cid
        LEFT JOIN saved sc ON sc.id = c.cid
        WHERE c.cid IS NOT NULL
        LIMIT 1))
    ) AS f(canvas_id)
    WHERE f.canvas_id IS NOT NULL
  ),
  denied AS (
    SELECT t.ord
    FROM touched t
    JOIN canvases c ON c.id = t.canvas_id
    -- COALESCE: an unknown (no team list, no saver) must deny, never let through.
    WHERE NOT COALESCE(
      is_manager
      OR saver_id = c.owner
      OR (jsonb_typeof(c.editors) = 'array' AND c.editors ? saver_id),
      false
    )
    UNION
    -- Teammates may rename, move and resize a canvas's frame, but only its owner (or the
    -- board's owner) may delete it, bring it back, change its type, or change its project
    -- tag; otherwise a teammate could remove the canvas and make it again as their own.
    SELECT i.ord
    FROM incoming i
    JOIN canvases c ON c.id = i.id
    WHERE NOT COALESCE(is_manager OR saver_id = c.owner, false)
      AND (
        i.el->>'type' IS DISTINCT FROM 'frame'
        OR i.el->'customData'->>'project' IS DISTINCT FROM c.project
        OR COALESCE((i.el->>'isDeleted')::BOOLEAN, false) IS DISTINCT FROM c.deleted
      )
  )
  SELECT COALESCE(jsonb_agg(
           CASE
             WHEN i.el->>'type' = 'frame'
              AND jsonb_typeof(i.el->'customData'->'project') = 'string'
              AND COALESCE(c.owner, saver_id) IS NOT NULL
             THEN jsonb_set(
                    jsonb_set(i.el, '{customData,owner}', to_jsonb(COALESCE(c.owner, saver_id))),
                    '{customData,editors}',
                    CASE
                      WHEN c.id IS NULL OR is_manager OR saver_id = c.owner
                        THEN public.whiteboard_canvas_editors(i.el->'customData'->'editors', COALESCE(c.owner, saver_id))
                      ELSE public.whiteboard_canvas_editors(c.editors, c.owner)
                    END)
             ELSE i.el
           END ORDER BY i.ord), '[]'::jsonb)
  INTO p_elements
  FROM incoming i
  LEFT JOIN canvases c ON c.id = i.id
  WHERE i.ord NOT IN (SELECT ord FROM denied);

  IF jsonb_array_length(current_elements) > 0 AND NOT EXISTS (
    SELECT 1 FROM public.whiteboard_versions
    WHERE whiteboard_id = p_board AND created_at > now() - INTERVAL '30 minutes'
  ) THEN
    INSERT INTO public.whiteboard_versions (whiteboard_id, elements, thumbnail)
    SELECT p_board,
           COALESCE((SELECT jsonb_agg(el) FROM jsonb_array_elements(current_elements) el
                     WHERE COALESCE((el->>'isDeleted')::BOOLEAN, false) = false), '[]'::jsonb),
           w.thumbnail
    FROM public.whiteboards w WHERE w.id = p_board;
    -- Keep the newest 100 automatic versions; named ones stay.
    DELETE FROM public.whiteboard_versions
    WHERE whiteboard_id = p_board AND label IS NULL AND id NOT IN (
      SELECT id FROM public.whiteboard_versions
      WHERE whiteboard_id = p_board AND label IS NULL
      ORDER BY created_at DESC LIMIT 100
    );
  END IF;

  -- What this save changes: incoming elements newer than the saved copy.
  WITH incoming AS (
    SELECT DISTINCT ON (el->>'id') el->>'id' AS id, el
    FROM jsonb_array_elements(p_elements) el
    WHERE el ? 'id'
    ORDER BY el->>'id', COALESCE((el->>'version')::INT, 0) DESC
  ),
  saved AS (
    SELECT el->>'id' AS id, el FROM jsonb_array_elements(current_elements) el
  ),
  diff AS (
    SELECT i.id, i.el, s.el AS old,
      CASE
        WHEN COALESCE((i.el->>'isDeleted')::BOOLEAN, false) THEN
          CASE WHEN s.el IS NOT NULL AND NOT COALESCE((s.el->>'isDeleted')::BOOLEAN, false) THEN 'deleted' END
        WHEN s.el IS NULL OR COALESCE((s.el->>'isDeleted')::BOOLEAN, false) THEN 'added'
        WHEN COALESCE(i.el->>'text', '') IS DISTINCT FROM COALESCE(s.el->>'text', '') THEN 'edited'
        ELSE 'changed'
      END AS action
    FROM incoming i LEFT JOIN saved s USING (id)
    WHERE s.el IS NULL OR COALESCE((i.el->>'version')::INT, 0) > COALESCE((s.el->>'version')::INT, 0)
  )
  SELECT
    jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', id,
      'action', action,
      'type', el->>'type',
      'container', el->>'containerId',
      'text', left(COALESCE(el->>'text', old->>'text'), 200),
      'before', CASE WHEN action = 'edited' THEN left(old->>'text', 200) END
    ))),
    (array_agg(el->'customData'->>'updatedBy') FILTER (WHERE el->'customData'->>'updatedBy' ~ '^[0-9a-f-]{36}$'))[1]::UUID
  INTO change_items, saver
  FROM diff WHERE action IS NOT NULL;

  IF change_items IS NOT NULL THEN
    INSERT INTO public.whiteboard_changes (whiteboard_id, user_id, items)
    VALUES (p_board, saver, change_items);
  END IF;

  UPDATE public.whiteboards
  SET elements = (
        SELECT COALESCE(jsonb_agg(m.el ORDER BY m.el->>'index' COLLATE "C", m.el->>'id'), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (s.el->>'id') s.el
          FROM (
            SELECT el, 1 AS incoming FROM jsonb_array_elements(p_elements) AS el
            UNION ALL
            SELECT el, 0 AS incoming FROM jsonb_array_elements(current_elements) AS el
          ) s
          WHERE s.el ? 'id'
          ORDER BY s.el->>'id', COALESCE((s.el->>'version')::INT, 0) DESC, s.incoming DESC
        ) m
      ),
      updated_at = now()
  WHERE id = p_board;
END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_merge_elements(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_merge_elements(UUID, JSONB) TO service_role;
