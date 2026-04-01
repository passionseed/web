CREATE TABLE IF NOT EXISTS hackathon_activity_individual_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES hackathon_phase_modules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  payload JSONB,
  file_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, team_id, user_id),
  CHECK (status IN ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required'))
);

CREATE TABLE IF NOT EXISTS hackathon_activity_team_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES hackathon_phase_modules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  payload JSONB,
  file_urls TEXT[],
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, team_id),
  CHECK (status IN ('not_started', 'draft', 'submitted', 'pending_review', 'passed', 'revision_required'))
);

CREATE TABLE IF NOT EXISTS hackathon_activity_ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_submission_id UUID NOT NULL REFERENCES hackathon_activity_team_submissions(id) ON DELETE CASCADE,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  feedback JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('queued', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS hackathon_activity_mentor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES hackathon_phase_modules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  individual_submission_id UUID REFERENCES hackathon_activity_individual_submissions(id) ON DELETE CASCADE,
  team_submission_id UUID REFERENCES hackathon_activity_team_submissions(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL DEFAULT 'pending_review',
  comments TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (review_status IN ('pending_review', 'passed', 'revision_required'))
);

CREATE INDEX IF NOT EXISTS idx_hackathon_individual_submissions_module
  ON hackathon_activity_individual_submissions(module_id, team_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_submissions_module
  ON hackathon_activity_team_submissions(module_id, team_id);

ALTER TABLE hackathon_activity_individual_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_activity_team_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_activity_ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_activity_mentor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hackathon_individual_submissions_readable"
  ON hackathon_activity_individual_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members htm
      WHERE htm.team_id = hackathon_activity_individual_submissions.team_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_team_submissions_readable"
  ON hackathon_activity_team_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members htm
      WHERE htm.team_id = hackathon_activity_team_submissions.team_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_ai_reviews_readable"
  ON hackathon_activity_ai_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_activity_team_submissions hts
      JOIN hackathon_team_members htm ON htm.team_id = hts.team_id
      WHERE hts.id = hackathon_activity_ai_reviews.team_submission_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_mentor_reviews_readable"
  ON hackathon_activity_mentor_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members htm
      WHERE htm.team_id = hackathon_activity_mentor_reviews.team_id
        AND htm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.hackathon_update_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hackathon_individual_submissions_updated_at
  BEFORE UPDATE ON hackathon_activity_individual_submissions
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_submission_updated_at();

CREATE TRIGGER hackathon_team_submissions_updated_at
  BEFORE UPDATE ON hackathon_activity_team_submissions
  FOR EACH ROW EXECUTE FUNCTION public.hackathon_update_submission_updated_at();
