-- Create mentor_auth_sessions (renamed from mentor_sessions to avoid conflict
-- with the existing mentor_sessions table used for seed room scheduling)

CREATE TABLE IF NOT EXISTS public.mentor_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_auth_sessions_token_idx ON public.mentor_auth_sessions(token);
CREATE INDEX IF NOT EXISTS mentor_auth_sessions_mentor_idx ON public.mentor_auth_sessions(mentor_id);

ALTER TABLE public.mentor_auth_sessions ENABLE ROW LEVEL SECURITY;
-- service-role only, no public RLS policies needed
