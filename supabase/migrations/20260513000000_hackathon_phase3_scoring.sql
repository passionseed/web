-- Phase 3 Scoring Integration
-- Links cycle-based grading to the existing hackathon_team_scores table.
--
-- Scoring model:
--   - Teams iterate cycles to improve their score (max 100 per category).
--   - Only the BEST score per category counts toward the team total.
--   - Phase 3 scores are ADDED to existing linear-activity scores.
--
-- Score categories:
--   'cycle'            — total from hackathon_phase3_cycles (ai_score or mentor_score)
--   'midphase'         — from hackathon_phase3_midphase_synthesis
--   'video'            — from hackathon_phase3_video_submissions
--   'module_quiz'      — from hackathon_phase3_module_progress quiz scores
--   'daily_checkin'    — from hackathon_phase3_daily_checkins streak/quality

-- ============================================================
-- 1. PHASE 3 SCORE EVENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_score_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,

  -- Source entity that generated this score
  source_table    TEXT NOT NULL CHECK (source_table IN (
    'hackathon_phase3_cycles',
    'hackathon_phase3_midphase_synthesis',
    'hackathon_phase3_video_submissions',
    'hackathon_phase3_module_progress',
    'hackathon_phase3_daily_checkins'
  )),
  source_id       UUID NOT NULL,

  -- Scoring category for "best of" aggregation
  score_category  TEXT NOT NULL CHECK (score_category IN (
    'cycle',
    'midphase',
    'video',
    'module_quiz',
    'daily_checkin'
  )),

  -- Score details
  points_awarded  INTEGER NOT NULL CHECK (points_awarded >= 0),
  points_possible INTEGER NOT NULL DEFAULT 100 CHECK (points_possible > 0),

  -- Who/what generated the score
  scored_by       TEXT NOT NULL CHECK (scored_by IN ('ai', 'mentor', 'judge', 'system')),
  scored_by_id    UUID,        -- nullable user id for mentor/judge
  scored_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Raw score JSON for audit trail
  raw_score       JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One event per source row (upsert semantics handled by trigger)
  UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_phase3_score_events_team
  ON public.hackathon_phase3_score_events(team_id);
CREATE INDEX IF NOT EXISTS idx_phase3_score_events_category
  ON public.hackathon_phase3_score_events(team_id, score_category, points_awarded DESC);

COMMENT ON TABLE public.hackathon_phase3_score_events IS
  'Audit log of every Phase 3 scoring event. The recalculation function picks the best score per category per team.';

-- ============================================================
-- 2. RLS & PERMISSIONS
-- ============================================================

ALTER TABLE public.hackathon_phase3_score_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hackathon_phase3_score_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hackathon_phase3_score_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hackathon_phase3_score_events TO service_role;

CREATE POLICY "allow_all_phase3_score_events"
  ON public.hackathon_phase3_score_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. TRIGGER: Upsert score event when cycle.ai_score is set
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_phase3_cycle_score_event()
RETURNS TRIGGER AS $$
DECLARE
  v_total int;
  v_possible int;
BEGIN
  -- Extract total from ai_score JSONB or mentor_score JSONB
  IF NEW.ai_score IS NOT NULL THEN
    v_total := COALESCE((NEW.ai_score->>'total')::int, 0);
  ELSIF NEW.mentor_score IS NOT NULL THEN
    v_total := COALESCE((NEW.mentor_score->>'total')::int, 0);
  ELSE
    RETURN NEW;
  END IF;

  v_possible := 100; -- cycles scored out of 100

  INSERT INTO public.hackathon_phase3_score_events (
    team_id, source_table, source_id, score_category,
    points_awarded, points_possible, scored_by, raw_score
  ) VALUES (
    NEW.team_id,
    'hackathon_phase3_cycles',
    NEW.id,
    'cycle',
    v_total,
    v_possible,
    CASE WHEN NEW.mentor_score IS NOT NULL THEN 'mentor' ELSE 'ai' END,
    COALESCE(NEW.mentor_score, NEW.ai_score)
  )
  ON CONFLICT (source_table, source_id)
  DO UPDATE SET
    points_awarded = EXCLUDED.points_awarded,
    points_possible = EXCLUDED.points_possible,
    scored_by = EXCLUDED.scored_by,
    scored_at = now(),
    raw_score = EXCLUDED.raw_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phase3_cycle_score_event ON public.hackathon_phase3_cycles;
CREATE TRIGGER phase3_cycle_score_event
  AFTER UPDATE OF ai_score, mentor_score ON public.hackathon_phase3_cycles
  FOR EACH ROW
  WHEN (OLD.ai_score IS DISTINCT FROM NEW.ai_score OR OLD.mentor_score IS DISTINCT FROM NEW.mentor_score)
  EXECUTE FUNCTION public.handle_phase3_cycle_score_event();

-- ============================================================
-- 4. TRIGGER: Upsert score event when midphase_synthesis.ai_score is set
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_phase3_midphase_score_event()
RETURNS TRIGGER AS $$
DECLARE
  v_total int;
BEGIN
  IF NEW.ai_score IS NOT NULL THEN
    v_total := COALESCE((NEW.ai_score->>'total')::int, 0);
  ELSE
    v_total := COALESCE(NEW.confidence_score, 0) * 10; -- 1-10 -> 10-100
  END IF;

  IF v_total = 0 AND NEW.confidence_score IS NULL AND NEW.ai_score IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.hackathon_phase3_score_events (
    team_id, source_table, source_id, score_category,
    points_awarded, points_possible, scored_by, raw_score
  ) VALUES (
    NEW.team_id,
    'hackathon_phase3_midphase_synthesis',
    NEW.id,
    'midphase',
    v_total,
    100,
    CASE WHEN NEW.ai_score IS NOT NULL THEN 'ai' ELSE 'mentor' END,
    COALESCE(NEW.ai_score, jsonb_build_object('confidence_score', NEW.confidence_score))
  )
  ON CONFLICT (source_table, source_id)
  DO UPDATE SET
    points_awarded = EXCLUDED.points_awarded,
    points_possible = EXCLUDED.points_possible,
    scored_by = EXCLUDED.scored_by,
    scored_at = now(),
    raw_score = EXCLUDED.raw_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phase3_midphase_score_event ON public.hackathon_phase3_midphase_synthesis;
CREATE TRIGGER phase3_midphase_score_event
  AFTER UPDATE OF ai_score, confidence_score ON public.hackathon_phase3_midphase_synthesis
  FOR EACH ROW
  WHEN (OLD.ai_score IS DISTINCT FROM NEW.ai_score OR OLD.confidence_score IS DISTINCT FROM NEW.confidence_score)
  EXECUTE FUNCTION public.handle_phase3_midphase_score_event();

-- ============================================================
-- 5. TRIGGER: Upsert score event when video_submissions.judge_scores is set
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_phase3_video_score_event()
RETURNS TRIGGER AS $$
DECLARE
  v_total int;
  v_scores jsonb;
BEGIN
  IF NEW.judge_scores IS NOT NULL THEN
    v_scores := NEW.judge_scores;
    v_total := COALESCE((v_scores->>'total')::int, 0);
  ELSIF NEW.ai_scrutinizer_output IS NOT NULL THEN
    v_scores := NEW.ai_scrutinizer_output;
    v_total := COALESCE((v_scores->>'total')::int, 0);
  ELSE
    RETURN NEW;
  END IF;

  IF v_total = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.hackathon_phase3_score_events (
    team_id, source_table, source_id, score_category,
    points_awarded, points_possible, scored_by, raw_score
  ) VALUES (
    NEW.team_id,
    'hackathon_phase3_video_submissions',
    NEW.id,
    'video',
    v_total,
    100,
    CASE WHEN NEW.judge_scores IS NOT NULL THEN 'judge' ELSE 'ai' END,
    v_scores
  )
  ON CONFLICT (source_table, source_id)
  DO UPDATE SET
    points_awarded = EXCLUDED.points_awarded,
    points_possible = EXCLUDED.points_possible,
    scored_by = EXCLUDED.scored_by,
    scored_at = now(),
    raw_score = EXCLUDED.raw_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phase3_video_score_event ON public.hackathon_phase3_video_submissions;
CREATE TRIGGER phase3_video_score_event
  AFTER UPDATE OF judge_scores, ai_scrutinizer_output ON public.hackathon_phase3_video_submissions
  FOR EACH ROW
  WHEN (OLD.judge_scores IS DISTINCT FROM NEW.judge_scores OR OLD.ai_scrutinizer_output IS DISTINCT FROM NEW.ai_scrutinizer_output)
  EXECUTE FUNCTION public.handle_phase3_video_score_event();

-- ============================================================
-- 6. TRIGGER: Upsert score event when module_progress.quiz_score is set
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_phase3_module_score_event()
RETURNS TRIGGER AS $$
DECLARE
  v_total int;
BEGIN
  IF NEW.quiz_score IS NULL THEN
    RETURN NEW;
  END IF;

  v_total := NEW.quiz_score;

  INSERT INTO public.hackathon_phase3_score_events (
    team_id, source_table, source_id, score_category,
    points_awarded, points_possible, scored_by, raw_score
  ) VALUES (
    NEW.team_id,
    'hackathon_phase3_module_progress',
    NEW.id,
    'module_quiz',
    v_total,
    100,
    'system',
    jsonb_build_object('module_number', NEW.module_number, 'quiz_passed', NEW.quiz_passed)
  )
  ON CONFLICT (source_table, source_id)
  DO UPDATE SET
    points_awarded = EXCLUDED.points_awarded,
    points_possible = EXCLUDED.points_possible,
    scored_by = EXCLUDED.scored_by,
    scored_at = now(),
    raw_score = EXCLUDED.raw_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS phase3_module_score_event ON public.hackathon_phase3_module_progress;
CREATE TRIGGER phase3_module_score_event
  AFTER UPDATE OF quiz_score ON public.hackathon_phase3_module_progress
  FOR EACH ROW
  WHEN (OLD.quiz_score IS DISTINCT FROM NEW.quiz_score)
  EXECUTE FUNCTION public.handle_phase3_module_score_event();

-- ============================================================
-- 7. RECALCULATION FUNCTION: Best score per category per team
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_phase3_team_score(p_team_id uuid)
RETURNS integer AS $$
DECLARE
  v_total integer := 0;
BEGIN
  SELECT COALESCE(SUM(best_score), 0)
  INTO v_total
  FROM (
    SELECT score_category, MAX(points_awarded) AS best_score
    FROM public.hackathon_phase3_score_events
    WHERE team_id = p_team_id
    GROUP BY score_category
  ) per_category;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 8. VIEW: Phase 3 score breakdown per team
-- ============================================================

CREATE OR REPLACE VIEW public.phase3_team_score_breakdown AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  COALESCE((
    SELECT MAX(points_awarded)
    FROM public.hackathon_phase3_score_events
    WHERE team_id = t.id AND score_category = 'cycle'
  ), 0) AS best_cycle_score,
  COALESCE((
    SELECT MAX(points_awarded)
    FROM public.hackathon_phase3_score_events
    WHERE team_id = t.id AND score_category = 'midphase'
  ), 0) AS best_midphase_score,
  COALESCE((
    SELECT MAX(points_awarded)
    FROM public.hackathon_phase3_score_events
    WHERE team_id = t.id AND score_category = 'video'
  ), 0) AS best_video_score,
  COALESCE((
    SELECT MAX(points_awarded)
    FROM public.hackathon_phase3_score_events
    WHERE team_id = t.id AND score_category = 'module_quiz'
  ), 0) AS best_module_score,
  COALESCE((
    SELECT MAX(points_awarded)
    FROM public.hackathon_phase3_score_events
    WHERE team_id = t.id AND score_category = 'daily_checkin'
  ), 0) AS best_checkin_score,
  COALESCE((
    SELECT SUM(best_score)
    FROM (
      SELECT MAX(points_awarded) AS best_score
      FROM public.hackathon_phase3_score_events
      WHERE team_id = t.id
      GROUP BY score_category
    ) sq
  ), 0) AS phase3_total
FROM public.hackathon_teams t;
