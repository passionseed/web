ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS line_user_id TEXT;

NOTIFY pgrst, 'reload schema';
