-- Add missing updated_at column to hackathon_participant_push_tokens
-- The table was created without it but triggers expect it

ALTER TABLE public.hackathon_participant_push_tokens
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows
UPDATE public.hackathon_participant_push_tokens
  SET updated_at = last_used_at
  WHERE updated_at IS NULL;

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the updated_at trigger
DROP TRIGGER IF EXISTS trg_push_tokens_updated_at ON public.hackathon_participant_push_tokens;

CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON public.hackathon_participant_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
