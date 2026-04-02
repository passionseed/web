-- Also grant authenticated role read access (PostgREST uses authenticated when a JWT is present,
-- even for custom-auth participants using the anon publishable key with a bearer token).

GRANT SELECT ON TABLE public.hackathon_programs TO authenticated;
DROP POLICY IF EXISTS "authenticated_read_hackathon_programs" ON public.hackathon_programs;
CREATE POLICY "authenticated_read_hackathon_programs"
  ON public.hackathon_programs FOR SELECT TO authenticated USING (true);

GRANT SELECT ON TABLE public.hackathon_program_phases TO authenticated;
DROP POLICY IF EXISTS "authenticated_read_hackathon_program_phases" ON public.hackathon_program_phases;
CREATE POLICY "authenticated_read_hackathon_program_phases"
  ON public.hackathon_program_phases FOR SELECT TO authenticated USING (true);

GRANT SELECT ON TABLE public.hackathon_phase_activities TO authenticated;
DROP POLICY IF EXISTS "authenticated_read_hackathon_phase_activities" ON public.hackathon_phase_activities;
CREATE POLICY "authenticated_read_hackathon_phase_activities"
  ON public.hackathon_phase_activities FOR SELECT TO authenticated USING (true);

GRANT SELECT ON TABLE public.hackathon_phase_activity_content TO authenticated;
DROP POLICY IF EXISTS "authenticated_read_hackathon_phase_activity_content" ON public.hackathon_phase_activity_content;
CREATE POLICY "authenticated_read_hackathon_phase_activity_content"
  ON public.hackathon_phase_activity_content FOR SELECT TO authenticated USING (true);

GRANT SELECT ON TABLE public.hackathon_phase_activity_assessments TO authenticated;
DROP POLICY IF EXISTS "authenticated_read_hackathon_phase_activity_assessments" ON public.hackathon_phase_activity_assessments;
CREATE POLICY "authenticated_read_hackathon_phase_activity_assessments"
  ON public.hackathon_phase_activity_assessments FOR SELECT TO authenticated USING (true);
