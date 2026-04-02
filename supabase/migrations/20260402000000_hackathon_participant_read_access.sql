-- Grant hackathon participants (anon key) read access to program/phase/activity tables.
-- Participants use their own auth (hackathon_sessions), not Supabase auth, so they
-- hit the DB as the anon role. These tables were previously locked down to all roles.

-- hackathon_programs: allow anon to read active programs
GRANT SELECT ON TABLE public.hackathon_programs TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_programs" ON public.hackathon_programs;
CREATE POLICY "anon_read_hackathon_programs"
  ON public.hackathon_programs FOR SELECT TO anon USING (true);

-- hackathon_program_phases: allow anon to read phases
GRANT SELECT ON TABLE public.hackathon_program_phases TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_program_phases" ON public.hackathon_program_phases;
CREATE POLICY "anon_read_hackathon_program_phases"
  ON public.hackathon_program_phases FOR SELECT TO anon USING (true);

-- hackathon_phase_activities and related tables (no RLS yet — enable + grant)
ALTER TABLE public.hackathon_phase_activities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.hackathon_phase_activities TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_phase_activities" ON public.hackathon_phase_activities;
CREATE POLICY "anon_read_hackathon_phase_activities"
  ON public.hackathon_phase_activities FOR SELECT TO anon USING (true);

ALTER TABLE public.hackathon_phase_activity_content ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.hackathon_phase_activity_content TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_phase_activity_content" ON public.hackathon_phase_activity_content;
CREATE POLICY "anon_read_hackathon_phase_activity_content"
  ON public.hackathon_phase_activity_content FOR SELECT TO anon USING (true);

ALTER TABLE public.hackathon_phase_activity_assessments ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.hackathon_phase_activity_assessments TO anon;
DROP POLICY IF EXISTS "anon_read_hackathon_phase_activity_assessments" ON public.hackathon_phase_activity_assessments;
CREATE POLICY "anon_read_hackathon_phase_activity_assessments"
  ON public.hackathon_phase_activity_assessments FOR SELECT TO anon USING (true);
