ALTER TABLE public.hackathon_program_phases
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'locked'
  CHECK (status IN ('locked', 'released'));

COMMENT ON COLUMN public.hackathon_program_phases.status IS
  'Release state for hackathon phases. locked hides entry, released makes the phase accessible.';

ALTER TABLE public.hackathon_phase_activities
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'locked'
  CHECK (status IN ('locked', 'released'));

COMMENT ON COLUMN public.hackathon_phase_activities.status IS
  'Release state for hackathon activities. locked blocks access, released allows access when prior activity is complete.';
