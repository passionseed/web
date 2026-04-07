-- Grant read access to hackathon_team_program_enrollments for app clients
GRANT SELECT ON TABLE public.hackathon_team_program_enrollments TO anon;
GRANT SELECT ON TABLE public.hackathon_team_program_enrollments TO authenticated;

-- Ensure RLS allows reads (policy may already exist but be safe)
ALTER TABLE public.hackathon_team_program_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_hackathon_team_enrollments" ON public.hackathon_team_program_enrollments;
CREATE POLICY "allow_read_hackathon_team_enrollments"
  ON public.hackathon_team_program_enrollments FOR SELECT USING (true);
