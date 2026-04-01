CREATE TABLE IF NOT EXISTS public.hackathon_activity_individual_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.hackathon_phase_modules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required')),
  response_text TEXT,
  artifact_urls TEXT[] DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, team_id, participant_id)
);

CREATE TABLE IF NOT EXISTS public.hackathon_activity_team_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.hackathon_phase_modules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required')),
  response_text TEXT,
  artifact_urls TEXT[] DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.hackathon_activity_ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.hackathon_phase_modules(id) ON DELETE CASCADE,
  team_submission_id UUID REFERENCES public.hackathon_activity_team_submissions(id) ON DELETE CASCADE,
  individual_submission_id UUID REFERENCES public.hackathon_activity_individual_submissions(id) ON DELETE CASCADE,
  model_name TEXT,
  summary TEXT,
  rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation TEXT NOT NULL DEFAULT 'revise'
    CHECK (recommendation IN ('pass', 'revise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    team_submission_id IS NOT NULL OR individual_submission_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.hackathon_activity_mentor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.hackathon_phase_modules(id) ON DELETE CASCADE,
  team_submission_id UUID REFERENCES public.hackathon_activity_team_submissions(id) ON DELETE CASCADE,
  individual_submission_id UUID REFERENCES public.hackathon_activity_individual_submissions(id) ON DELETE CASCADE,
  reviewer_participant_id UUID REFERENCES public.hackathon_participants(id) ON DELETE SET NULL,
  decision TEXT NOT NULL DEFAULT 'revision_required'
    CHECK (decision IN ('passed', 'revision_required')),
  comment TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    team_submission_id IS NOT NULL OR individual_submission_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_hackathon_individual_submissions_team
  ON public.hackathon_activity_individual_submissions(team_id, module_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_submissions_team
  ON public.hackathon_activity_team_submissions(team_id, module_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_ai_reviews_module
  ON public.hackathon_activity_ai_reviews(module_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_mentor_reviews_module
  ON public.hackathon_activity_mentor_reviews(module_id);

DROP TRIGGER IF EXISTS hackathon_activity_individual_submissions_updated_at ON public.hackathon_activity_individual_submissions;
CREATE TRIGGER hackathon_activity_individual_submissions_updated_at
  BEFORE UPDATE ON public.hackathon_activity_individual_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();

DROP TRIGGER IF EXISTS hackathon_activity_team_submissions_updated_at ON public.hackathon_activity_team_submissions;
CREATE TRIGGER hackathon_activity_team_submissions_updated_at
  BEFORE UPDATE ON public.hackathon_activity_team_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hackathon_program_updated_at();
