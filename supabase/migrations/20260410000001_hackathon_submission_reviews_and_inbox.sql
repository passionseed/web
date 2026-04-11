-- Hackathon submission reviews and participant inbox
-- Adds admin grading records without mutating submitted content, plus the
-- participant-facing inbox used by review notifications.

ALTER TABLE public.hackathon_phase_activity_submissions
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_submissions_status_check;

ALTER TABLE public.hackathon_phase_activity_submissions
  ADD CONSTRAINT hackathon_phase_activity_submissions_status_check
  CHECK (status IN ('draft', 'submitted', 'pending_review', 'passed', 'revision_required'));

ALTER TABLE public.hackathon_phase_activity_team_submissions
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_team_submissions_status_check;

ALTER TABLE public.hackathon_phase_activity_team_submissions
  ADD CONSTRAINT hackathon_phase_activity_team_submissions_status_check
  CHECK (status IN ('draft', 'submitted', 'pending_review', 'passed', 'revision_required'));

CREATE TABLE IF NOT EXISTS public.hackathon_submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_scope TEXT NOT NULL CHECK (submission_scope IN ('individual', 'team')),
  individual_submission_id UUID REFERENCES public.hackathon_phase_activity_submissions(id) ON DELETE CASCADE,
  team_submission_id UUID REFERENCES public.hackathon_phase_activity_team_submissions(id) ON DELETE CASCADE,
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'passed', 'revision_required')),
  score_awarded INTEGER,
  points_possible INTEGER,
  feedback TEXT NOT NULL DEFAULT '',
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hackathon_submission_reviews_one_target CHECK (
    (submission_scope = 'individual' AND individual_submission_id IS NOT NULL AND team_submission_id IS NULL)
    OR
    (submission_scope = 'team' AND team_submission_id IS NOT NULL AND individual_submission_id IS NULL)
  ),
  CONSTRAINT hackathon_submission_reviews_score_bounds CHECK (
    score_awarded IS NULL
    OR (
      score_awarded >= 0
      AND (points_possible IS NULL OR score_awarded <= points_possible)
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_submission_reviews_individual_unique
  ON public.hackathon_submission_reviews(individual_submission_id)
  WHERE individual_submission_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hackathon_submission_reviews_team_unique
  ON public.hackathon_submission_reviews(team_submission_id)
  WHERE team_submission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hackathon_submission_reviews_status
  ON public.hackathon_submission_reviews(review_status, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS public.hackathon_participant_inbox_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'assessment_review',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hackathon_inbox_participant_created
  ON public.hackathon_participant_inbox_items(participant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hackathon_inbox_participant_unread
  ON public.hackathon_participant_inbox_items(participant_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.hackathon_submission_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_participant_inbox_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_submission_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_submission_reviews TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_participant_inbox_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_participant_inbox_items TO service_role;

DROP POLICY IF EXISTS "Admins can manage hackathon submission reviews" ON public.hackathon_submission_reviews;
CREATE POLICY "Admins can manage hackathon submission reviews"
  ON public.hackathon_submission_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage hackathon inbox items" ON public.hackathon_participant_inbox_items;
CREATE POLICY "Admins can manage hackathon inbox items"
  ON public.hackathon_participant_inbox_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Participants can read own hackathon inbox items" ON public.hackathon_participant_inbox_items;
CREATE POLICY "Participants can read own hackathon inbox items"
  ON public.hackathon_participant_inbox_items
  FOR SELECT
  USING (participant_id = auth.uid());

DROP TRIGGER IF EXISTS hackathon_submission_reviews_handle_updated_at
  ON public.hackathon_submission_reviews;
CREATE TRIGGER hackathon_submission_reviews_handle_updated_at
  BEFORE UPDATE ON public.hackathon_submission_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS hackathon_participant_inbox_items_handle_updated_at
  ON public.hackathon_participant_inbox_items;
CREATE TRIGGER hackathon_participant_inbox_items_handle_updated_at
  BEFORE UPDATE ON public.hackathon_participant_inbox_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
