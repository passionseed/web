-- Editable SHIFT curriculum for mentors (/shift/curriculum). One row per round,
-- the whole curriculum as JSON. The page reads with the service role; only
-- admins can write. Contains no student data.

CREATE TABLE IF NOT EXISTS public.shift_curriculum (
  round TEXT PRIMARY KEY,
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.shift_curriculum IS 'SHIFT curriculum per round, edited by admins on /shift/curriculum';

ALTER TABLE public.shift_curriculum ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift curriculum" ON public.shift_curriculum;
CREATE POLICY "Admins can manage shift curriculum"
  ON public.shift_curriculum
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_curriculum TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_curriculum TO service_role;
