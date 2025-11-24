-- Add TOS acceptance tracking to profiles
-- This migration adds fields to track Terms of Service acceptance

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tos_version TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN public.profiles.tos_accepted_at IS 'Timestamp when user last accepted Terms of Service';
COMMENT ON COLUMN public.profiles.tos_version IS 'Version of TOS that was accepted (e.g., "2025-01-24")';

-- Create an index for quick lookups of users who haven't accepted TOS
CREATE INDEX IF NOT EXISTS profiles_tos_accepted_at_idx ON public.profiles (tos_accepted_at) WHERE tos_accepted_at IS NULL;
