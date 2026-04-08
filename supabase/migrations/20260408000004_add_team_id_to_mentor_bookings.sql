-- Add team_id to mentor_bookings so we can enforce one booking per team
ALTER TABLE public.mentor_bookings
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.hackathon_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mentor_bookings_team_idx ON public.mentor_bookings(team_id);

COMMENT ON COLUMN public.mentor_bookings.team_id IS
  'The hackathon team that made this booking. Used to enforce one active booking per team.';
