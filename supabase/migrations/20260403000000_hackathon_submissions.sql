CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.hackathon_phase_activity_assessments(id) ON DELETE CASCADE,
  text_answer TEXT,
  image_url TEXT,
  file_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_participant
  ON public.hackathon_phase_activity_submissions(participant_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_activity
  ON public.hackathon_phase_activity_submissions(activity_id);

ALTER TABLE public.hackathon_phase_activity_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_phase_activity_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_phase_activity_submissions TO authenticated;

-- Access control enforced at API layer (hackathon token auth)
CREATE POLICY "allow_all_hackathon_submissions"
  ON public.hackathon_phase_activity_submissions FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS hackathon_submissions_handle_updated_at
  ON public.hackathon_phase_activity_submissions;
CREATE TRIGGER hackathon_submissions_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activity_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
