-- Add display_name and avatar_url fields to hackathon_participants for comments feature

ALTER TABLE public.hackathon_participants
ADD COLUMN IF NOT EXISTS display_name TEXT;

ALTER TABLE public.hackathon_participants
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Set display_name to name by default if not set
UPDATE public.hackathon_participants
SET display_name = name
WHERE display_name IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hackathon_participants_display_name
ON public.hackathon_participants(display_name);

COMMENT ON COLUMN public.hackathon_participants.display_name IS 'Display name shown in comments and UI (defaults to name)';
COMMENT ON COLUMN public.hackathon_participants.avatar_url IS 'URL to participant avatar image in storage bucket';