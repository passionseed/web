-- Fix hackathon_team_score_events to support team submissions
-- The original submission_id FK only references hackathon_phase_activity_submissions (individual),
-- causing awardScore() to silently fail when scoring team-scoped submissions.
-- Solution: make submission_id nullable, add team_submission_id for team-scope events.

ALTER TABLE public.hackathon_team_score_events
  ALTER COLUMN submission_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS team_submission_id UUID REFERENCES public.hackathon_phase_activity_team_submissions(id) ON DELETE CASCADE;

-- At least one of submission_id or team_submission_id must be set
ALTER TABLE public.hackathon_team_score_events
  ADD CONSTRAINT chk_score_event_has_submission
    CHECK (submission_id IS NOT NULL OR team_submission_id IS NOT NULL);

-- Index for team_submission_id lookups
CREATE INDEX IF NOT EXISTS idx_hackathon_score_events_team_sub
  ON public.hackathon_team_score_events(team_submission_id)
  WHERE team_submission_id IS NOT NULL;
