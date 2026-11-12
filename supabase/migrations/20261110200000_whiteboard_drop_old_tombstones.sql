-- Deleted whiteboard elements are kept as tombstones so that an older copy of
-- an element (version wins) cannot bring it back. After a day nobody still
-- holds such a copy, so the tombstone is only weight: on the Shift[3] board
-- (2026-11-10) they were half of its 5.8 MB, and every save rewrites the whole
-- row. Excalidraw's own collaboration drops them after the same 24 hours.
--
-- A trigger, so every write of a board's elements (saves through
-- whiteboard_merge_elements, restoring a version) drops them, with no change
-- to the merge function itself. Elements without a numeric "updated" (ms since
-- epoch, set by Excalidraw on every change) are kept.

CREATE OR REPLACE FUNCTION public.whiteboard_drop_old_tombstones()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF jsonb_typeof(NEW.elements) = 'array' THEN
    NEW.elements := COALESCE((
      SELECT jsonb_agg(t.el ORDER BY t.ord)
      FROM jsonb_array_elements(NEW.elements) WITH ORDINALITY AS t(el, ord)
      -- COALESCE: a missing field makes the test NULL, and NOT NULL would drop the element too.
      WHERE NOT COALESCE(
        jsonb_typeof(t.el->'isDeleted') = 'boolean'
        AND jsonb_typeof(t.el->'updated') = 'number'
        AND (t.el->>'isDeleted')::BOOLEAN
        AND (t.el->>'updated')::NUMERIC < (EXTRACT(EPOCH FROM now()) * 1000 - 86400000),
        FALSE
      )
    ), '[]'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.whiteboard_drop_old_tombstones() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS whiteboard_drop_old_tombstones ON public.whiteboards;
CREATE TRIGGER whiteboard_drop_old_tombstones
  BEFORE INSERT OR UPDATE OF elements ON public.whiteboards
  FOR EACH ROW EXECUTE FUNCTION public.whiteboard_drop_old_tombstones();
