-- Daily snapshots of SHIFT project canvases, so staff can see each student's
-- progress over the days (/shift/canvases). A job saves one row per canvas per
-- Bangkok day: the progress numbers, the canvas as Markdown, and a short note
-- from Claude Haiku on what changed since the day before.
-- Additive and idempotent: safe to apply straight to production.

CREATE TABLE IF NOT EXISTS public.shift_canvas_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  frame_id TEXT NOT NULL CHECK (char_length(frame_id) BETWEEN 1 AND 100),
  project TEXT NOT NULL CHECK (char_length(project) BETWEEN 1 AND 100),
  -- No foreign key, as in whiteboard_projects: owners come from board data.
  owner_id UUID NULL,
  -- The day in Asia/Bangkok the snapshot belongs to.
  day DATE NOT NULL,
  stats JSONB NOT NULL CHECK (jsonb_typeof(stats) = 'object'),
  markdown TEXT NOT NULL,
  change_note TEXT NULL CHECK (change_note IS NULL OR char_length(change_note) <= 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shift_canvas_snapshots_one_per_day UNIQUE (whiteboard_id, frame_id, day)
);
CREATE INDEX IF NOT EXISTS idx_shift_canvas_snapshots_canvas_day
  ON public.shift_canvas_snapshots (whiteboard_id, frame_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_shift_canvas_snapshots_day
  ON public.shift_canvas_snapshots (day DESC);

-- Students' words: admins only through the API. The staff pages read it with the
-- service role after checking the viewer is SHIFT staff, a mentor, or an admin.
ALTER TABLE public.shift_canvas_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read shift_canvas_snapshots" ON public.shift_canvas_snapshots;
CREATE POLICY "Admins read shift_canvas_snapshots" ON public.shift_canvas_snapshots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
REVOKE ALL ON TABLE public.shift_canvas_snapshots FROM anon;
GRANT SELECT ON TABLE public.shift_canvas_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_canvas_snapshots TO service_role;

COMMENT ON TABLE public.shift_canvas_snapshots IS
  'One row per SHIFT project canvas per Bangkok day: progress stats, the canvas as Markdown, and what changed (Claude Haiku).';
