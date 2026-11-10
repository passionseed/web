-- SHIFT canvases, part 2: the database decides who did what (follows
-- 20261109120000_whiteboard_canvas_access.sql).
--
-- 1. Authorship. customData.createdBy is kept from the saved copy. A new
--    element is created by whoever saves it; if it claims someone else (a
--    paste from another board, or a sticky someone nudged before its maker's
--    save arrived), that name is kept as customData.originalBy, and that
--    person's own next save takes the element back.
-- 2. Note versions (customData.versions) only grow. Saved entries never
--    change; a new entry is stamped with the saver and a checked time.
--    Entries on a new element that the saver did not just write are marked
--    copied.
-- 3. Moderators: the board's owner and site admins may change any canvas on
--    the board. Project ids reach across boards, and anyone can own a board
--    (by making or duplicating one), so only site admins moderate those.
-- 4. A canvas's owner or a moderator may hand the canvas to someone on the
--    board. Teammates must be people on the board.
-- 5. Project ids are registered (whiteboard_projects) to the person who
--    started them. A copy saved by anyone but them (or a site admin) becomes
--    a new project, so a project id always means one student's project,
--    across boards. Only they or a site admin can hand a project over.
-- 6. An existing plain frame becomes a canvas only when a moderator, or its
--    creator with nothing of anyone else's inside, saves it so (a canvas
--    locks everyone else out of what is inside it).
-- 7. Element versions are compared as BIGINT, and one save may raise an
--    element's version by at most 1,000,000, so no one can push an element
--    out of reach of later edits.
-- 8. whiteboard_merge_elements now returns what it rewrote or left out,
--    { corrected: [elements as saved], dropped: [ids] }, so the saver's
--    browser can put its copy right.
-- 9. whiteboard_elements_by_id returns the saved copy of some elements, so
--    browsers can check live edits to canvases against the database before
--    showing them.
--
-- Idempotent: safe to run twice. App code from before this migration keeps
-- working (it ignores the merge's return value).

-- A clean team list: user ids, no repeats, not the owner, at most 30, in byte order.
CREATE OR REPLACE FUNCTION public.whiteboard_canvas_editors(p_value JSONB, p_owner TEXT)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(t.e ORDER BY t.e COLLATE "C"), '[]'::jsonb)
  FROM (
    SELECT DISTINCT e COLLATE "C" AS e
    FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_value) = 'array' THEN p_value ELSE '[]'::jsonb END) AS e
    WHERE e ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND e IS DISTINCT FROM p_owner
    ORDER BY 1
    LIMIT 30
  ) t;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_canvas_editors(JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_canvas_editors(JSONB, TEXT) TO service_role;

-- An ISO 8601 time as written by browsers (Date.toISOString), or NULL. Never raises.
CREATE OR REPLACE FUNCTION public.whiteboard_try_timestamptz(p_value TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  IF p_value IS NULL OR p_value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$' THEN
    RETURN NULL;
  END IF;
  RETURN p_value::TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_try_timestamptz(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_try_timestamptz(TEXT) TO service_role;

-- Whether a value is a well-formed note version (lib/whiteboard/shift-cards.ts, isVersion).
CREATE OR REPLACE FUNCTION public.whiteboard_is_card_version(p_entry JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_entry) IS DISTINCT FROM 'object' THEN false
    WHEN jsonb_typeof(p_entry->'v') IS DISTINCT FROM 'number' THEN false
    WHEN (p_entry->>'v')::NUMERIC <> trunc((p_entry->>'v')::NUMERIC) THEN false
    WHEN (p_entry->>'v')::NUMERIC NOT BETWEEN 1 AND 1000000 THEN false
    ELSE jsonb_typeof(p_entry->'text') = 'string'
     AND jsonb_typeof(p_entry->'at') = 'string'
     AND jsonb_typeof(p_entry->'by') = 'string'
     AND (NOT p_entry ? 'why' OR jsonb_typeof(p_entry->'why') = 'string')
  END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_is_card_version(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_is_card_version(JSONB) TO service_role;

-- A note's versions after a save, or NULL when neither copy has any
-- (lib/whiteboard/shift-cards.ts, settleVersions). Saved entries stay as they
-- are; incoming entries numbered above the newest saved one are added. On an
-- existing note a new entry is by the saver, at its own time when that is
-- within 10 minutes of now and at now otherwise. On a new note (a paste) the
-- entries keep their author and time, and are marked copied unless the saver
-- wrote them in the last 10 minutes. The newest 20 are kept.
CREATE OR REPLACE FUNCTION public.whiteboard_card_versions(p_saved JSONB, p_incoming JSONB, p_is_new BOOLEAN, p_saver TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH
  kept AS (
    SELECT t.e, t.n
    FROM jsonb_array_elements(
      CASE WHEN NOT p_is_new AND jsonb_typeof(p_saved->'versions') = 'array' THEN p_saved->'versions' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS t(e, n)
    WHERE public.whiteboard_is_card_version(t.e)
  ),
  newest AS (SELECT COALESCE(max((e->>'v')::NUMERIC), 0) AS v FROM kept),
  -- The CASE keeps the cast behind the shape check (WHERE clauses may run in any order).
  candidates AS (
    SELECT t.e, t.n, CASE WHEN public.whiteboard_is_card_version(t.e) THEN (t.e->>'v')::NUMERIC END AS v
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p_incoming->'versions') = 'array' THEN p_incoming->'versions' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS t(e, n)
  ),
  added AS (
    SELECT DISTINCT ON (c.v)
      c.v,
      c.e,
      COALESCE(
        public.whiteboard_try_timestamptz(c.e->>'at') BETWEEN now() - INTERVAL '10 minutes' AND now() + INTERVAL '10 minutes',
        false
      ) AS fresh
    FROM candidates c
    WHERE c.v > (SELECT v FROM newest)
    ORDER BY c.v, c.n
  ),
  stamped AS (
    SELECT a.v, jsonb_strip_nulls(jsonb_build_object(
      'v', a.v::BIGINT,
      'text', left(a.e->>'text', 5000),
      'at', CASE
              WHEN p_is_new OR a.fresh THEN a.e->>'at'
              ELSE to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            END,
      'by', CASE WHEN p_is_new THEN a.e->>'by' ELSE COALESCE(p_saver, a.e->>'by') END,
      'why', left(a.e->>'why', 280),
      'copied', CASE WHEN p_is_new AND NOT (a.fresh AND a.e->>'by' = p_saver) THEN true END
    )) AS e
    FROM added a
  ),
  all_versions AS (
    SELECT u.e, row_number() OVER (ORDER BY u.grp, u.pos) AS rn
    FROM (
      SELECT e, 0 AS grp, n::NUMERIC AS pos FROM kept
      UNION ALL
      SELECT e, 1 AS grp, v AS pos FROM stamped
    ) u
  )
  SELECT CASE
    WHEN jsonb_typeof(p_saved->'versions') IS DISTINCT FROM 'array'
     AND jsonb_typeof(p_incoming->'versions') IS DISTINCT FROM 'array'
      THEN NULL
    ELSE COALESCE(
      (SELECT jsonb_agg(e ORDER BY rn) FROM all_versions WHERE rn > (SELECT count(*) FROM all_versions) - 20),
      '[]'::jsonb
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_card_versions(JSONB, JSONB, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_card_versions(JSONB, JSONB, BOOLEAN, TEXT) TO service_role;

-- Who started each SHIFT project (customData.project on a canvas frame). A
-- project id belongs to one person, so the same id on two boards is the same
-- project. No foreign key on owner_id: canvas owners come from board data,
-- and a save must never fail because an old account is gone.
CREATE TABLE IF NOT EXISTS public.whiteboard_projects (
  id TEXT PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 100),
  owner_id UUID NOT NULL,
  -- The board it was first seen on.
  whiteboard_id UUID NULL REFERENCES public.whiteboards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_projects_owner ON public.whiteboard_projects (owner_id);

ALTER TABLE public.whiteboard_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage whiteboard_projects" ON public.whiteboard_projects;
CREATE POLICY "Admins manage whiteboard_projects" ON public.whiteboard_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboard_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboard_projects TO service_role;

-- Every project already on a board belongs to the owner of its oldest canvas.
INSERT INTO public.whiteboard_projects (id, owner_id, whiteboard_id, created_at)
SELECT DISTINCT ON (p.project) p.project, p.owner::UUID, p.board, p.created_at
FROM (
  SELECT el->'customData'->>'project' AS project,
         COALESCE(el->'customData'->>'owner', el->'customData'->>'createdBy') AS owner,
         w.id AS board,
         w.created_at
  FROM public.whiteboards w, jsonb_array_elements(w.elements) el
  WHERE el->>'type' = 'frame'
    AND jsonb_typeof(el->'customData'->'project') = 'string'
) p
WHERE p.owner ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND char_length(p.project) BETWEEN 1 AND 100
ORDER BY p.project, p.created_at
ON CONFLICT (id) DO NOTHING;

-- The return type changes (VOID to JSONB), which CREATE OR REPLACE cannot do.
-- Both statements run in this migration's transaction, so no save sees it missing.
DROP FUNCTION IF EXISTS public.whiteboard_merge_elements(UUID, JSONB);
CREATE FUNCTION public.whiteboard_merge_elements(p_board UUID, p_elements JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uuid_re CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  -- lib/whiteboard/core.ts, MAX_VERSION_JUMP.
  max_jump CONSTANT NUMERIC := 1000000;
  current_elements JSONB;
  board_owner UUID;
  saver_id TEXT;
  is_admin BOOLEAN;
  is_manager BOOLEAN;
  people TEXT[];
  corrected JSONB;
  dropped JSONB;
  change_items JSONB;
  saver UUID;
BEGIN
  SELECT elements, owner_id INTO current_elements, board_owner FROM public.whiteboards WHERE id = p_board FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'whiteboard % not found', p_board;
  END IF;

  -- Who is saving: the API stamps customData.updatedBy with the signed-in user on every element.
  SELECT el->'customData'->>'updatedBy' INTO saver_id
  FROM jsonb_array_elements(p_elements) el
  WHERE el->'customData'->>'updatedBy' ~ uuid_re
  LIMIT 1;
  -- Moderators of this board: its owner and site admins. Project ids reach across boards and
  -- anyone can own a board, so only site admins may act on other people's projects.
  is_admin := saver_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = saver_id::UUID AND role = 'admin');
  is_manager := is_admin OR (saver_id IS NOT NULL AND saver_id = board_owner::TEXT);
  -- Everyone on the board, who may own a canvas or be on its team.
  people := ARRAY(
    SELECT board_owner::TEXT
    UNION
    SELECT user_id::TEXT FROM public.whiteboard_members WHERE whiteboard_id = p_board
  );

  WITH
  -- Every saved canvas, deleted ones too, so no one but the owner can bring one back.
  canvases AS (
    SELECT el->>'id' AS id,
           COALESCE(el->'customData'->>'owner', el->'customData'->>'createdBy') AS owner,
           el->'customData'->'editors' AS editors,
           el->'customData'->'project' AS project,
           COALESCE((el->>'isDeleted')::BOOLEAN, false) AS deleted
    FROM jsonb_array_elements(current_elements) el
    WHERE el->>'type' = 'frame'
      AND jsonb_typeof(el->'customData'->'project') = 'string'
      AND COALESCE(el->'customData'->>'owner', el->'customData'->>'createdBy') <> ''
  ),
  saved AS (
    SELECT el->>'id' AS id, el FROM jsonb_array_elements(current_elements) el
  ),
  -- Only well-typed elements (the API checks this too): a string "false" for isDeleted reads as
  -- false here but as true in browsers, which would let a teammate hide a canvas from everyone.
  incoming AS (
    SELECT t.el->>'id' AS id, t.el, t.ord
    FROM jsonb_array_elements(p_elements) WITH ORDINALITY AS t(el, ord)
    WHERE jsonb_typeof(t.el) = 'object'
      AND jsonb_typeof(t.el->'id') = 'string'
      AND jsonb_typeof(t.el->'version') = 'number'
      AND COALESCE(jsonb_typeof(t.el->'type'), 'string') = 'string'
      AND COALESCE(jsonb_typeof(t.el->'isDeleted'), 'null') IN ('boolean', 'null')
      AND COALESCE(jsonb_typeof(t.el->'frameId'), 'null') IN ('string', 'null')
      AND COALESCE(jsonb_typeof(t.el->'containerId'), 'null') IN ('string', 'null')
      AND COALESCE(jsonb_typeof(t.el->'customData'), 'null') IN ('object', 'null')
      AND COALESCE(jsonb_typeof(t.el->'customData'->'project'), 'null') IN ('string', 'null')
  ),
  frame_of AS (
    SELECT id, el->>'frameId' AS frame_id FROM incoming WHERE el->>'frameId' IS NOT NULL
    UNION ALL
    SELECT id, el->>'frameId' FROM saved WHERE el->>'frameId' IS NOT NULL
  ),
  -- Every canvas each incoming element was in or is going into: its saved and new frame, itself
  -- (so a change claiming another type cannot overwrite or delete a canvas), and the saved and
  -- new frame of the note its text belongs to, before and after.
  touched AS (
    SELECT i.ord, f.canvas_id
    FROM incoming i
    LEFT JOIN saved s ON s.id = i.id
    CROSS JOIN LATERAL (VALUES (s.el->>'frameId'), (i.el->>'frameId'), (i.id)) AS f(canvas_id)
    WHERE f.canvas_id IS NOT NULL
    UNION ALL
    SELECT i.ord, fo.frame_id
    FROM incoming i
    LEFT JOIN saved s ON s.id = i.id
    CROSS JOIN LATERAL (VALUES (i.el->>'containerId'), (s.el->>'containerId')) AS c(cid)
    JOIN frame_of fo ON fo.id = c.cid
  ),
  denied AS (
    -- Anything in a canvas the saver is not on. COALESCE: an unknown must deny.
    SELECT t.ord
    FROM touched t
    JOIN canvases c ON c.id = t.canvas_id
    WHERE NOT COALESCE(
      is_manager
      OR saver_id = c.owner
      OR (jsonb_typeof(c.editors) = 'array' AND c.editors ? saver_id),
      false
    )
    UNION
    -- Teammates may rename, move and resize a canvas's frame, but only its owner (or a moderator)
    -- may delete it, bring it back, change its type, or change its project tag.
    SELECT i.ord
    FROM incoming i
    JOIN canvases c ON c.id = i.id
    WHERE NOT COALESCE(is_manager OR saver_id = c.owner, false)
      AND (
        i.el->>'type' IS DISTINCT FROM 'frame'
        OR i.el->'customData'->'project' IS DISTINCT FROM c.project
        OR COALESCE((i.el->>'isDeleted')::BOOLEAN, false) IS DISTINCT FROM c.deleted
      )
    UNION
    -- An existing plain frame becomes a canvas only by a moderator, or by its creator when
    -- nothing of anyone else's is inside (a canvas locks others out of what is in it).
    SELECT i.ord
    FROM incoming i
    JOIN saved s ON s.id = i.id
    WHERE s.el->>'type' = 'frame'
      AND jsonb_typeof(s.el->'customData'->'project') IS DISTINCT FROM 'string'
      AND i.el->>'type' = 'frame'
      AND jsonb_typeof(i.el->'customData'->'project') = 'string'
      AND NOT COALESCE(
        is_manager
        OR (s.el->'customData'->>'createdBy' = saver_id
            AND NOT EXISTS (
              SELECT 1 FROM saved child
              WHERE child.el->>'frameId' = s.id
                AND NOT COALESCE((child.el->>'isDeleted')::BOOLEAN, false)
                AND child.el->'customData'->>'createdBy' IS DISTINCT FROM saver_id)),
        false)
    UNION
    -- One save may not push an element's version far past the saved copy.
    SELECT i.ord
    FROM incoming i
    LEFT JOIN saved s ON s.id = i.id
    WHERE (i.el->>'version')::NUMERIC > COALESCE((s.el->>'version')::NUMERIC, 0) + max_jump
  ),
  allowed AS (
    SELECT i.ord, i.id, i.el, s.el AS saved_el,
           c.id AS canvas_id, c.owner, c.editors, c.project,
           CASE WHEN jsonb_typeof(i.el->'customData') = 'object' THEN i.el->'customData' ELSE '{}'::jsonb END AS data,
           CASE WHEN jsonb_typeof(s.el->'customData') = 'object' THEN s.el->'customData' ELSE '{}'::jsonb END AS saved_data
    FROM incoming i
    LEFT JOIN saved s ON s.id = i.id
    LEFT JOIN canvases c ON c.id = i.id
    WHERE i.ord NOT IN (SELECT ord FROM denied)
  ),
  -- Authorship: createdBy from the saved copy, or the saver for something new. A new element
  -- claiming another author keeps that name as originalBy, never verified: a paste, or a sticky
  -- someone else nudged before its maker's save arrived. That person's own save takes it back.
  authored AS (
    SELECT a.*,
      CASE WHEN saver_id IS NULL THEN a.data
      ELSE (a.data - 'originalBy')
        || jsonb_build_object('createdBy', CASE
             WHEN a.saved_el IS NULL THEN saver_id
             WHEN a.saved_data->>'originalBy' = saver_id THEN saver_id
             WHEN jsonb_typeof(a.saved_data->'createdBy') = 'string' THEN a.saved_data->>'createdBy'
             ELSE saver_id
           END)
        || CASE
             WHEN a.saved_el IS NOT NULL THEN
               CASE WHEN jsonb_typeof(a.saved_data->'originalBy') = 'string'
                     AND a.saved_data->>'originalBy' IS DISTINCT FROM saver_id
                    THEN jsonb_build_object('originalBy', a.saved_data->'originalBy') ELSE '{}'::jsonb END
             WHEN jsonb_typeof(a.data->'originalBy') = 'string'
               THEN jsonb_build_object('originalBy', a.data->'originalBy')
             WHEN jsonb_typeof(a.data->'createdBy') = 'string' AND a.data->>'createdBy' <> saver_id
               THEN jsonb_build_object('originalBy', a.data->'createdBy')
             ELSE '{}'::jsonb
           END
      END AS data2
    FROM allowed a
  ),
  versioned AS (
    SELECT au.*,
      CASE WHEN jsonb_typeof(au.saved_data->'versions') = 'array' OR jsonb_typeof(au.data->'versions') = 'array'
           THEN public.whiteboard_card_versions(au.saved_data, au.data, au.saved_el IS NULL, saver_id)
      END AS versions
    FROM authored au
  ),
  framed AS (
    SELECT v.*,
      (v.el->>'type' = 'frame'
        AND jsonb_typeof(v.data->'project') = 'string'
        AND COALESCE(v.owner, saver_id) IS NOT NULL) AS is_canvas,
      (v.canvas_id IS NOT NULL AND COALESCE(is_manager OR saver_id = v.owner, false)) AS may_manage,
      reg.owner_id::TEXT AS reg_owner
    FROM versioned v
    LEFT JOIN public.whiteboard_projects reg ON reg.id = v.data->>'project'
  ),
  -- Canvas owners. An existing canvas keeps its owner unless its owner or a moderator hands it to
  -- someone on the board. A new one belongs to the saver, or, when a site admin saves a copy of a
  -- registered project, to the person who started that project.
  owned AS (
    SELECT f.*,
      CASE
        WHEN NOT f.is_canvas THEN NULL
        WHEN f.canvas_id IS NOT NULL THEN
          CASE WHEN f.may_manage
                AND f.data->>'owner' ~ uuid_re
                AND f.data->>'owner' IS DISTINCT FROM f.owner
                AND f.data->>'owner' = ANY (people)
               THEN f.data->>'owner'
               ELSE f.owner
          END
        WHEN f.reg_owner IS NULL OR f.reg_owner = saver_id THEN saver_id
        WHEN is_admin THEN f.reg_owner
        ELSE saver_id
      END AS new_owner
    FROM framed f
  ),
  -- Project ids. A new canvas keeps its id when the id is new, the saver started it, or a site
  -- admin saves it; anyone else's copy becomes a new project. An existing canvas may move to a
  -- project id only if it is new or already its owner's.
  projected AS MATERIALIZED (
    SELECT o.*,
      CASE
        WHEN NOT o.is_canvas THEN NULL
        WHEN o.canvas_id IS NOT NULL THEN
          CASE WHEN o.data->'project' = o.project THEN o.project
               WHEN o.reg_owner IS NOT NULL AND o.reg_owner IS DISTINCT FROM o.new_owner AND NOT is_admin THEN o.project
               ELSE o.data->'project'
          END
        WHEN o.reg_owner IS NULL OR o.reg_owner = saver_id OR is_admin THEN o.data->'project'
        ELSE to_jsonb(gen_random_uuid()::TEXT)
      END AS new_project,
      CASE
        WHEN NOT o.is_canvas THEN NULL
        WHEN o.canvas_id IS NOT NULL AND NOT o.may_manage THEN public.whiteboard_canvas_editors(o.editors, o.owner)
        ELSE public.whiteboard_canvas_editors(
          (SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
           FROM jsonb_array_elements_text(
             CASE WHEN jsonb_typeof(o.data->'editors') = 'array' THEN o.data->'editors' ELSE '[]'::jsonb END
           ) AS e
           WHERE e = ANY (people)),
          o.new_owner)
      END AS new_editors
    FROM owned o
  ),
  final AS (
    SELECT p.ord, p.id, p.el AS sent,
      CASE
        WHEN NOT (p.el ? 'customData') AND p.data2 = '{}'::jsonb AND p.versions IS NULL AND NOT p.is_canvas THEN p.el
        ELSE jsonb_set(p.el, '{customData}',
          p.data2
          || CASE WHEN p.versions IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('versions', p.versions) END
          || CASE WHEN p.is_canvas
                  THEN jsonb_build_object('owner', p.new_owner, 'editors', p.new_editors, 'project', p.new_project)
                  ELSE '{}'::jsonb END)
      END AS el
    FROM projected p
  )
  SELECT
    COALESCE((SELECT jsonb_agg(f.el ORDER BY f.ord) FROM final f), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(f.el ORDER BY f.ord) FROM final f WHERE f.el IS DISTINCT FROM f.sent), '[]'::jsonb)
      || COALESCE((SELECT jsonb_agg(s.el ORDER BY i.ord)
                   FROM incoming i JOIN saved s ON s.id = i.id
                   WHERE i.ord IN (SELECT ord FROM denied)), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(DISTINCT i.id) FROM incoming i WHERE i.ord IN (SELECT ord FROM denied)), '[]'::jsonb)
  INTO p_elements, corrected, dropped;

  -- Register projects seen for the first time, to their canvas's owner.
  INSERT INTO public.whiteboard_projects (id, owner_id, whiteboard_id)
  SELECT DISTINCT ON (el->'customData'->>'project') el->'customData'->>'project', (el->'customData'->>'owner')::UUID, p_board
  FROM jsonb_array_elements(p_elements) el
  WHERE el->>'type' = 'frame'
    AND jsonb_typeof(el->'customData'->'project') = 'string'
    AND char_length(el->'customData'->>'project') BETWEEN 1 AND 100
    AND el->'customData'->>'owner' ~ uuid_re
  ORDER BY el->'customData'->>'project'
  ON CONFLICT (id) DO NOTHING;

  -- A canvas handed to someone else takes its project with it, when the person who started the
  -- project (or a site admin) hands it over. A board's owner cannot move other people's projects.
  UPDATE public.whiteboard_projects p
  SET owner_id = (h.new_owner)::UUID
  FROM (
    SELECT el->'customData'->>'project' AS project,
           COALESCE(s->'customData'->>'owner', s->'customData'->>'createdBy') AS old_owner,
           el->'customData'->>'owner' AS new_owner
    FROM jsonb_array_elements(p_elements) el
    JOIN jsonb_array_elements(current_elements) s ON s->>'id' = el->>'id'
    WHERE el->>'type' = 'frame'
      AND s->>'type' = 'frame'
      AND jsonb_typeof(el->'customData'->'project') = 'string'
      AND el->'customData'->>'owner' ~ uuid_re
      AND (el->>'version')::NUMERIC >= COALESCE((s->>'version')::NUMERIC, 0)
  ) h
  WHERE p.id = h.project
    AND p.owner_id::TEXT = h.old_owner
    AND h.new_owner IS DISTINCT FROM h.old_owner
    AND (is_admin OR p.owner_id::TEXT = saver_id);

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
    ORDER BY el->>'id', COALESCE((el->>'version')::BIGINT, 0) DESC
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
    WHERE s.el IS NULL OR COALESCE((i.el->>'version')::BIGINT, 0) > COALESCE((s.el->>'version')::BIGINT, 0)
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
    (array_agg(el->'customData'->>'updatedBy') FILTER (WHERE el->'customData'->>'updatedBy' ~ uuid_re))[1]::UUID
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
          ORDER BY s.el->>'id', COALESCE((s.el->>'version')::BIGINT, 0) DESC, s.incoming DESC
        ) m
      ),
      updated_at = now()
  WHERE id = p_board;

  RETURN jsonb_build_object('corrected', corrected, 'dropped', dropped);
END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_merge_elements(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_merge_elements(UUID, JSONB) TO service_role;

-- The saved copy of the given elements (ids that are not on the board are left out).
CREATE OR REPLACE FUNCTION public.whiteboard_elements_by_id(p_board UUID, p_ids TEXT[])
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(el), '[]'::jsonb)
  FROM public.whiteboards w, jsonb_array_elements(w.elements) el
  WHERE w.id = p_board AND el->>'id' = ANY (p_ids);
$$;
REVOKE ALL ON FUNCTION public.whiteboard_elements_by_id(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whiteboard_elements_by_id(UUID, TEXT[]) TO service_role;
