ALTER TABLE public.hackathon_participants
  ADD COLUMN IF NOT EXISTS special_invite BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
