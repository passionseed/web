-- Hackathon team scores table
-- Tracks cumulative score per team across all activity submissions.
--
-- Score rules (applied immediately on submit, no grading step):
--   individual activity: points_possible / team_member_count  (rounded down)
--   team activity:       points_possible  (flat)
--
-- This means a group of 2 and a group of 3 that both fully complete an
-- individual activity earn the same team score — the per-submission share
-- scales with team size so full completion always yields the full points.

CREATE TABLE IF NOT EXISTS public.hackathon_team_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  total_score   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_scores_team
  ON public.hackathon_team_scores(team_id);

ALTER TABLE public.hackathon_team_scores ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_team_scores TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.hackathon_team_scores TO authenticated;

CREATE POLICY "allow_all_hackathon_team_scores"
  ON public.hackathon_team_scores FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS hackathon_team_scores_handle_updated_at
  ON public.hackathon_team_scores;
CREATE TRIGGER hackathon_team_scores_handle_updated_at
  BEFORE UPDATE ON public.hackathon_team_scores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Score log — one row per submission event so scores can be audited / reversed
CREATE TABLE IF NOT EXISTS public.hackathon_team_score_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  submission_id   UUID NOT NULL REFERENCES public.hackathon_phase_activity_submissions(id) ON DELETE CASCADE,
  activity_id     UUID NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  participant_id  UUID REFERENCES public.hackathon_participants(id) ON DELETE SET NULL,
  scope           TEXT NOT NULL CHECK (scope IN ('individual', 'team')),
  points_possible INTEGER NOT NULL,
  member_count    INTEGER NOT NULL DEFAULT 1,  -- team size at time of submission
  points_awarded  INTEGER NOT NULL,            -- floor(points_possible / member_count) for individual, points_possible for team
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id)  -- one score event per submission
);

CREATE INDEX IF NOT EXISTS idx_hackathon_score_events_team
  ON public.hackathon_team_score_events(team_id);

ALTER TABLE public.hackathon_team_score_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.hackathon_team_score_events TO anon;
GRANT SELECT, INSERT ON TABLE public.hackathon_team_score_events TO authenticated;

CREATE POLICY "allow_all_hackathon_score_events"
  ON public.hackathon_team_score_events FOR ALL USING (true) WITH CHECK (true);
