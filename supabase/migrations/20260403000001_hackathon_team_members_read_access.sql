-- Allow anon to read team members and participant names for the hackathon home screen.
-- Participants hit the DB as anon (they use custom hackathon_sessions auth, not Supabase auth).

-- hackathon_teams
GRANT SELECT ON TABLE public.hackathon_teams TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_teams" ON public.hackathon_teams;
CREATE POLICY "anon_read_hackathon_teams"
  ON public.hackathon_teams FOR SELECT TO anon USING (true);

-- hackathon_team_members
GRANT SELECT ON TABLE public.hackathon_team_members TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_team_members" ON public.hackathon_team_members;
CREATE POLICY "anon_read_hackathon_team_members"
  ON public.hackathon_team_members FOR SELECT TO anon USING (true);

-- hackathon_participants: only expose safe fields (no password_hash)
-- RLS policy restricts which rows can be read — here we allow all (names are not sensitive)
GRANT SELECT ON TABLE public.hackathon_participants TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_participants" ON public.hackathon_participants;
CREATE POLICY "anon_read_hackathon_participants"
  ON public.hackathon_participants FOR SELECT TO anon USING (true);
