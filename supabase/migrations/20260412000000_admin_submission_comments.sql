-- Admin comments on hackathon submissions - persistent comment history

CREATE TABLE IF NOT EXISTS public.hackathon_submission_admin_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_scope TEXT NOT NULL CHECK (submission_scope IN ('individual', 'team')),
  individual_submission_id UUID REFERENCES public.hackathon_phase_activity_submissions(id) ON DELETE CASCADE,
  team_submission_id UUID REFERENCES public.hackathon_phase_activity_team_submissions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  commented_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hackathon_submission_admin_comments_one_target CHECK (
    (submission_scope = 'individual' AND individual_submission_id IS NOT NULL AND team_submission_id IS NULL)
    OR
    (submission_scope = 'team' AND team_submission_id IS NOT NULL AND individual_submission_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_comments_individual_submission
  ON public.hackathon_submission_admin_comments(individual_submission_id)
  WHERE individual_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_comments_team_submission
  ON public.hackathon_submission_admin_comments(team_submission_id)
  WHERE team_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_comments_created_at
  ON public.hackathon_submission_admin_comments(created_at DESC);

COMMENT ON TABLE public.hackathon_submission_admin_comments IS 'Persistent admin comments on hackathon submissions, separate from review feedback';

-- Enable RLS
ALTER TABLE public.hackathon_submission_admin_comments ENABLE ROW LEVEL SECURITY;

-- Admin can manage all comments
DROP POLICY IF EXISTS "Admins can manage submission comments" ON public.hackathon_submission_admin_comments;
CREATE POLICY "Admins can manage submission comments"
  ON public.hackathon_submission_admin_comments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Grant service role access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hackathon_submission_admin_comments TO service_role;

-- Updated at trigger
DROP TRIGGER IF EXISTS hackathon_submission_admin_comments_handle_updated_at
  ON public.hackathon_submission_admin_comments;
CREATE TRIGGER hackathon_submission_admin_comments_handle_updated_at
  BEFORE UPDATE ON public.hackathon_submission_admin_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
