-- Add column to track when progress was last reset for a seed room member
-- This ensures we only reset progress once per session

ALTER TABLE public.seed_room_members
ADD COLUMN IF NOT EXISTS last_progress_reset TIMESTAMPTZ;

COMMENT ON COLUMN public.seed_room_members.last_progress_reset IS
'Timestamp of when this user''s progress was last reset for this seed room. Used to ensure fresh progress for each session.';
