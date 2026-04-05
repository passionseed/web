ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS max_hours_per_week FLOAT DEFAULT 4;

NOTIFY pgrst, 'reload schema';
