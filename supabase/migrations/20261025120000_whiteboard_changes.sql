-- Whiteboard change history: one row per save, listing which elements the
-- saver added, edited (text), changed (moved, resized, restyled) or deleted.
-- Admins read it from the board's Activity panel to see who wrote what and
-- when. Written by whiteboard_merge_elements; the saver is the
-- customData.updatedBy the API stamps on every incoming element.
-- Admin-only under RLS like the other whiteboard tables. Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.whiteboard_changes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- [{ id, action, type, text, before }]; text and before are cut to 200 characters.
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_changes_board ON public.whiteboard_changes (whiteboard_id, created_at DESC);

ALTER TABLE public.whiteboard_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage whiteboard_changes" ON public.whiteboard_changes;
CREATE POLICY "Admins manage whiteboard_changes" ON public.whiteboard_changes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboard_changes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboard_changes TO service_role;

-- Same merge as 20261023120000_whiteboards.sql, now also logging the change.
CREATE OR REPLACE FUNCTION public.whiteboard_merge_elements(p_board UUID, p_elements JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_elements JSONB;
  change_items JSONB;
  saver UUID;
BEGIN
  SELECT elements INTO current_elements FROM public.whiteboards WHERE id = p_board FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'whiteboard % not found', p_board;
  END IF;

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
