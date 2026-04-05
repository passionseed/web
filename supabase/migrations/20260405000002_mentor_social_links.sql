ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

NOTIFY pgrst, 'reload schema';
