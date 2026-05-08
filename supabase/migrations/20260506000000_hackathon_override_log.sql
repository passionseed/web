-- Add override_log to hackathon_submission_reviews for calibration loop
-- Tracks when an admin overrides an AI draft, storing the diff for future prompt tuning.

ALTER TABLE public.hackathon_submission_reviews
  ADD COLUMN IF NOT EXISTS override_log JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.hackathon_submission_reviews.override_log IS
  'Append-only log of admin overrides. Each entry: { ai_draft: { status, score_awarded, feedback, reasoning }, final_review: { status, score_awarded, feedback }, captured_at, activity_id }';

-- Partial index: only rows that have an override_log entry (fast calibration lookup)
-- NOTE: activity_id is not a column on hackathon_submission_reviews (it lives on
-- the submission tables). The index uses reviewed_at DESC instead, which
-- getCalibrationExamples orders by to efficiently fetch recent overrides.
CREATE INDEX IF NOT EXISTS idx_hackathon_submission_reviews_override_log
  ON public.hackathon_submission_reviews (reviewed_at DESC)
  WHERE override_log IS NOT NULL;
