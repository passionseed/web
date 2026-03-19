-- Add impact updates opt-in field to expert_profiles
ALTER TABLE public.expert_profiles
  ADD COLUMN IF NOT EXISTS impact_updates_opt_in BOOLEAN NOT NULL DEFAULT false;