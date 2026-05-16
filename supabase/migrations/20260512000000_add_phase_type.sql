-- Add phase_type to distinguish linear vs loop vs checkpoint phases
ALTER TABLE public.hackathon_program_phases
  ADD COLUMN IF NOT EXISTS phase_type text NOT NULL DEFAULT 'linear'
  CHECK (phase_type IN ('linear', 'loop', 'checkpoint'));

COMMENT ON COLUMN public.hackathon_program_phases.phase_type IS 'Phase interaction mode: linear (step-by-step activities), loop (sprint cycle workspace), checkpoint (single submission)';

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_hackathon_program_phases_type
  ON public.hackathon_program_phases(phase_type);
