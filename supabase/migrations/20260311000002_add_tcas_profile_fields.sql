ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gpax numeric NULL
    CONSTRAINT gpax_range CHECK (gpax >= 0 AND gpax <= 4),
  ADD COLUMN IF NOT EXISTS budget_per_year integer NULL
    CONSTRAINT budget_positive CHECK (budget_per_year > 0),
  ADD COLUMN IF NOT EXISTS preferred_location text NULL,
  ADD COLUMN IF NOT EXISTS subject_interests text[] NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interest_embedding vector(1024) NULL,
  ADD COLUMN IF NOT EXISTS tcas_profile_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.gpax IS 'Student cumulative GPAX (0-4 scale)';
COMMENT ON COLUMN public.profiles.budget_per_year IS 'Maximum tuition budget in THB per year';
COMMENT ON COLUMN public.profiles.preferred_location IS 'Preferred province/region for university';
COMMENT ON COLUMN public.profiles.subject_interests IS 'Array of subject interest tags';
COMMENT ON COLUMN public.profiles.interest_embedding IS '1024-dim bge-m3 embedding computed from activity + interests';
COMMENT ON COLUMN public.profiles.tcas_profile_completed IS 'Whether student completed the TCAS profile quiz';
