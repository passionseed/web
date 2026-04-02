-- Add submission_scope to hackathon_phase_activities
ALTER TABLE public.hackathon_phase_activities
  ADD COLUMN IF NOT EXISTS submission_scope TEXT NOT NULL DEFAULT 'individual'
    CHECK (submission_scope IN ('individual', 'team'));

-- Team submissions table (one submission per team per activity)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_team_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.hackathon_phase_activity_assessments(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  text_answer TEXT,
  image_url TEXT,
  file_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_submissions_team
  ON public.hackathon_phase_activity_team_submissions(team_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_submissions_activity
  ON public.hackathon_phase_activity_team_submissions(activity_id);

ALTER TABLE public.hackathon_phase_activity_team_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_phase_activity_team_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_phase_activity_team_submissions TO authenticated;

CREATE POLICY "allow_all_hackathon_team_submissions"
  ON public.hackathon_phase_activity_team_submissions FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS hackathon_team_submissions_handle_updated_at
  ON public.hackathon_phase_activity_team_submissions;
CREATE TRIGGER hackathon_team_submissions_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activity_team_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
