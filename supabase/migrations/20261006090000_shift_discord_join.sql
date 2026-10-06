-- SHIFT post-payment join link: a paid applicant opens /shift/join/{token},
-- signs in with Discord, and is bound to a PassionSeed account, the admin
-- tracker, and the SHIFT Discord server (bot adds them with roles).
-- Additive and idempotent: safe to apply straight to production.

ALTER TABLE public.shift_applications
  ADD COLUMN IF NOT EXISTS join_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS discord_username TEXT NULL,
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS discord_joined_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS discord_error TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shift_applications_join_token
  ON public.shift_applications(join_token) WHERE join_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS shift_applications_user
  ON public.shift_applications(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.shift_applications.join_token IS
  'Secret for the /shift/join link sent after payment. Admin-only read.';
COMMENT ON COLUMN public.shift_applications.discord_user_id IS
  'Verified Discord snowflake from OAuth, unlike the self-typed discord_handle.';

ALTER TABLE public.shift_students
  ADD COLUMN IF NOT EXISTS application_id UUID NULL REFERENCES public.shift_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shift_students_application
  ON public.shift_students(application_id) WHERE application_id IS NOT NULL;
