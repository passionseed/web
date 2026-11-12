-- Mentor groups on a whiteboard: staff split a board's students into groups,
-- each with its mentors, so a mentor's dashboard shows their own group first
-- (components/whiteboard/quest/). A group is only a filter for staff views; it
-- opens no channel between anyone. Students never see groups.
--
-- Additive and safe to run twice. Admin-only under RLS like the other
-- whiteboard tables; routes check the caller is the board's owner, a site
-- admin or staff, and use the service role.

CREATE TABLE IF NOT EXISTS public.whiteboard_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whiteboard_id UUID NOT NULL REFERENCES public.whiteboards(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  mentor_ids UUID[] NOT NULL DEFAULT '{}',
  student_ids UUID[] NOT NULL DEFAULT '{}',
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whiteboard_groups_board ON public.whiteboard_groups (whiteboard_id, created_at);

ALTER TABLE public.whiteboard_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage whiteboard_groups" ON public.whiteboard_groups;
CREATE POLICY "Admins manage whiteboard_groups" ON public.whiteboard_groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboard_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.whiteboard_groups TO service_role;
