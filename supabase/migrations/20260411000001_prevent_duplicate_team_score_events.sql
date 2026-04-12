-- Prevent team-scoped hackathon activities from awarding score more than once
-- per team/activity pair, even if multiple teammates submit the same work.

CREATE UNIQUE INDEX IF NOT EXISTS idx_hackathon_team_score_events_team_activity_once
  ON public.hackathon_team_score_events(team_id, activity_id)
  WHERE scope = 'team';
