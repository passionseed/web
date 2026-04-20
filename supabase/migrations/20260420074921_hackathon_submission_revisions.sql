-- Hackathon submission revision history
-- Stores prior attempts inline as a jsonb array on each submission row.
-- The row itself always reflects the latest/current attempt.
--
-- Each element of `revisions` has the shape:
-- {
--   "n": int,                            -- revision number, 1-based
--   "text_answer": text | null,
--   "image_url": text | null,
--   "file_urls": text[] | null,
--   "submitted_at": iso timestamp,
--   "review": {
--     "status": "pending_review" | "passed" | "revision_required",
--     "score_awarded": int | null,
--     "points_possible": int | null,
--     "feedback": text,
--     "reasoning": text | null,
--     "reviewed_by": uuid | null,
--     "reviewed_at": iso timestamp | null
--   } | null
-- }

ALTER TABLE public.hackathon_phase_activity_submissions
  ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.hackathon_phase_activity_team_submissions
  ADD COLUMN IF NOT EXISTS revisions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.hackathon_phase_activity_submissions.revisions IS
  'Ordered array of prior attempts. Current attempt lives on the row itself.';

COMMENT ON COLUMN public.hackathon_phase_activity_team_submissions.revisions IS
  'Ordered array of prior attempts. Current attempt lives on the row itself.';
