-- SHIFT cohort tracker: kids and their weekly notes (admin-only)

CREATE TABLE IF NOT EXISTS public.shift_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  ig_handle TEXT,
  discord_handle TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_students IS 'SHIFT cohort kids tracked by admins (name, IG, Discord)';

CREATE TABLE IF NOT EXISTS public.shift_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.shift_students(id) ON DELETE CASCADE,
  week_label TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_student_notes_student_created
  ON public.shift_student_notes(student_id, created_at DESC);

COMMENT ON TABLE public.shift_student_notes IS 'Freeform dated weekly notes per SHIFT student, written by admins';

ALTER TABLE public.shift_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_student_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift students" ON public.shift_students;
CREATE POLICY "Admins can manage shift students"
  ON public.shift_students
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can manage shift student notes" ON public.shift_student_notes;
CREATE POLICY "Admins can manage shift student notes"
  ON public.shift_student_notes
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_students TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_student_notes TO service_role;

DROP TRIGGER IF EXISTS shift_students_handle_updated_at ON public.shift_students;
CREATE TRIGGER shift_students_handle_updated_at
  BEFORE UPDATE ON public.shift_students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS shift_student_notes_handle_updated_at ON public.shift_student_notes;
CREATE TRIGGER shift_student_notes_handle_updated_at
  BEFORE UPDATE ON public.shift_student_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
