-- Persist AI grading drafts so admins don't lose them when navigating away,
-- and so bulk / auto-grading can write drafts that wait for human approval.
--
-- ai_draft shape:
-- {
--   "status": "passed" | "revision_required",
--   "score_awarded": number | null,
--   "points_possible": number | null,
--   "feedback": string,
--   "reasoning": string | null,
--   "raw_output": string,
--   "error": string | null
-- }
--
-- A draft is cleared (set to null) when an admin Approves or Discards it.
-- The live review columns (review_status, score_awarded, feedback) are only
-- written when a draft is promoted — either by admin Approve, or by the
-- auto-approve rule for graded items at full score.

ALTER TABLE public.hackathon_submission_reviews
  ADD COLUMN IF NOT EXISTS ai_draft jsonb,
  ADD COLUMN IF NOT EXISTS ai_draft_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_draft_model text,
  ADD COLUMN IF NOT EXISTS ai_draft_source text;

COMMENT ON COLUMN public.hackathon_submission_reviews.ai_draft IS
  'AI-generated grade proposal awaiting admin approval. Null when no draft pending.';
COMMENT ON COLUMN public.hackathon_submission_reviews.ai_draft_source IS
  'How the draft was generated: manual | bulk | auto_on_submit';

CREATE INDEX IF NOT EXISTS hackathon_submission_reviews_ai_draft_pending_idx
  ON public.hackathon_submission_reviews (ai_draft_generated_at)
  WHERE ai_draft IS NOT NULL;
