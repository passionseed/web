-- SHIFT applications from the public /shift/apply form.
-- Applicants are anonymous (no login wall). Inserts go through the
-- /api/shift/apply route with the service role; only admins can read.

CREATE TABLE IF NOT EXISTS public.shift_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  grade TEXT NOT NULL CHECK (grade IN ('m4', 'm5', 'm6', 'other')),
  target_track TEXT,
  problem TEXT NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('all_days', 'some_days')),
  ig_handle TEXT NOT NULL,
  discord_handle TEXT,
  parent_contact TEXT NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'waitlist', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_applications IS 'SHIFT cohort applications (minors: parent contact required, admin-only read)';

CREATE INDEX IF NOT EXISTS idx_shift_applications_cohort_created
  ON public.shift_applications(cohort, created_at DESC);

ALTER TABLE public.shift_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage shift applications" ON public.shift_applications;
CREATE POLICY "Admins can manage shift applications"
  ON public.shift_applications
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shift_applications TO service_role;

DROP TRIGGER IF EXISTS shift_applications_handle_updated_at ON public.shift_applications;
CREATE TRIGGER shift_applications_handle_updated_at
  BEFORE UPDATE ON public.shift_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
