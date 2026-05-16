-- Phase 3 — Interactive Sprint Loop (User Testing)
-- Adds cycle-based workspace tables, extends activity types
-- Run after: 20260401000000_hackathon_phase_activities.sql
-- Zero risk to Phase 2 data. All additive.

-- ============================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================

-- Extend content_type to include Phase 3 interactive content types
ALTER TABLE public.hackathon_phase_activity_content
  DROP CONSTRAINT IF EXISTS hackathon_phase_activity_content_content_type_check;

ALTER TABLE public.hackathon_phase_activity_content
  ADD CONSTRAINT hackathon_phase_activity_content_content_type_check
    CHECK (content_type IN (
      'video', 'short_video', 'canva_slide', 'text', 'image', 'pdf',
      'ai_chat', 'npc_chat', 'chat_comic', 'infographic_comic', 'webtoon',
      'template', 'auto_draft', 'interactive_form'
    ));

-- Add activity_type and cycle_aware to activities
ALTER TABLE public.hackathon_phase_activities
  ADD COLUMN IF NOT EXISTS activity_type text NOT NULL DEFAULT 'linear'
    CHECK (activity_type IN ('linear', 'loop_step', 'workspace', 'checkpoint'));

ALTER TABLE public.hackathon_phase_activities
  ADD COLUMN IF NOT EXISTS cycle_aware boolean NOT NULL DEFAULT false;

ALTER TABLE public.hackathon_phase_activities
  ADD COLUMN IF NOT EXISTS max_cycles int;

-- Add ai_rubric to assessments
ALTER TABLE public.hackathon_phase_activity_assessments
  ADD COLUMN IF NOT EXISTS ai_rubric jsonb;

-- ============================================================
-- 2. PHASE 3 CYCLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  program_phase_id uuid NOT NULL REFERENCES public.hackathon_program_phases(id),
  cycle_number int NOT NULL CHECK (cycle_number > 0),
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'testing', 'synthesizing', 'completed', 'abandoned')),
  gate_decision text CHECK (gate_decision IN ('refine', 'proceed', 'kill')),
  
  -- Hypothesis (decomposed for querying)
  hypothesis_who text,
  hypothesis_will_do text,
  hypothesis_because text,
  hypothesis_measured_by text,
  hypothesis_full text GENERATED ALWAYS AS (
    COALESCE(hypothesis_who, '') || ' will ' || 
    COALESCE(hypothesis_will_do, '') || ' because ' || 
    COALESCE(hypothesis_because, '') || ' measured by ' || 
    COALESCE(hypothesis_measured_by, '')
  ) STORED,
  
  -- Variable isolation
  variable_changed text,
  prior_variable text,
  
  -- Pretotype
  pretotype_method text,
  pretotype_artifact_url text,
  pretotype_description text,
  
  -- Synthesis
  synthesis_result text CHECK (synthesis_result IN ('confirmed', 'killed', 'unclear')),
  synthesis_what_changed text,
  synthesis_honest_wrongness text,
  
  -- Scoring
  ai_score jsonb,
  mentor_score jsonb,
  mentor_notes text,
  
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  
  UNIQUE (team_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_phase3_cycles_team ON public.hackathon_phase3_cycles(team_id);
CREATE INDEX IF NOT EXISTS idx_phase3_cycles_status ON public.hackathon_phase3_cycles(status);

-- ============================================================
-- 3. CYCLE STEPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_cycle_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.hackathon_phase3_cycles(id) ON DELETE CASCADE,
  step_type text NOT NULL CHECK (step_type IN ('hypothesis', 'pretotype', 'test_session', 'synthesis')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'ai_reviewed', 'mentor_reviewed', 'locked')),
  submission_data jsonb NOT NULL DEFAULT '{}',
  ai_feedback jsonb,
  ai_feedback_at timestamptz,
  mentor_override boolean DEFAULT false,
  mentor_override_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  locked_at timestamptz,
  
  UNIQUE (cycle_id, step_type)
);

CREATE INDEX IF NOT EXISTS idx_cycle_steps_cycle ON public.hackathon_phase3_cycle_steps(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_steps_type ON public.hackathon_phase3_cycle_steps(step_type);

-- ============================================================
-- 4. TEST SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_step_id uuid NOT NULL REFERENCES public.hackathon_phase3_cycle_steps(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  
  tester_name text NOT NULL,
  tester_role text,
  tester_contact text,
  tester_channel text CHECK (tester_channel IN ('in_person', 'zoom', 'phone', 'line', 'other')),
  
  fresh_tester boolean NOT NULL DEFAULT true,
  fresh_override_reason text,
  
  session_date date NOT NULL,
  session_duration_min int,
  
  behavior_log jsonb NOT NULL DEFAULT '[]',
  unprompted_quotes text[],
  painful_detail text,
  session_result text CHECK (session_result IN ('confirmed', 'killed', 'unclear')),
  clip_url text,
  screenshot_urls text[],
  ai_behavior_quality jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_team ON public.hackathon_phase3_test_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_cycle ON public.hackathon_phase3_test_sessions(cycle_number);
CREATE INDEX IF NOT EXISTS idx_test_sessions_fresh ON public.hackathon_phase3_test_sessions(fresh_tester) WHERE fresh_tester = true;

-- ============================================================
-- 5. DAILY CHECK-INS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  day_number int NOT NULL CHECK (day_number BETWEEN 1 AND 10),
  current_cycle_number int,
  current_cycle_state text,
  current_hypothesis text,
  variable_changed text,
  test_sessions_today int DEFAULT 0,
  ai_feedback jsonb,
  ai_feedback_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'late', 'excused')),
  due_at timestamptz NOT NULL,
  submitted_at timestamptz,
  late_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_team ON public.hackathon_phase3_daily_checkins(team_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_status ON public.hackathon_phase3_daily_checkins(status);

-- ============================================================
-- 6. MID-PHASE SYNTHESIS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_midphase_synthesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  auto_draft text,
  auto_draft_generated_at timestamptz,
  what_learned text,
  what_changed text,
  what_wrong text,
  next_hypothesis text,
  pretotype_state_url text,
  confidence_score int CHECK (confidence_score BETWEEN 1 AND 10),
  ai_score jsonb,
  ai_suggested_pattern text,
  mentor_scheduled boolean DEFAULT false,
  mentor_meeting_at timestamptz,
  mentor_notes text,
  discord_post_id text,
  posted_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'scored', 'mentor_reviewed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  
  UNIQUE (team_id)
);

-- ============================================================
-- 7. RITUAL POSTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_ritual_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  cycle_number int NOT NULL,
  discord_channel_id text,
  discord_message_id text,
  discord_thread_id text,
  posted_at timestamptz,
  hypothesis_full text NOT NULL,
  pre_test boolean NOT NULL DEFAULT true,
  test_sessions_after int DEFAULT 0,
  ai_quality_score jsonb,
  ai_reply_discord_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_ritual_posts_team ON public.hackathon_phase3_ritual_posts(team_id);

-- ============================================================
-- 8. MODULE PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.hackathon_participants(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  module_number int NOT NULL CHECK (module_number BETWEEN 1 AND 9),
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'in_progress', 'completed')),
  quiz_answers jsonb,
  quiz_score int,
  quiz_passed boolean,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (participant_id, module_number)
);

-- ============================================================
-- 9. VIDEO SUBMISSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_video_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.hackathon_teams(id) ON DELETE CASCADE,
  storyboard jsonb NOT NULL DEFAULT '[]',
  video_url text,
  video_duration_sec int,
  video_file_size_mb numeric,
  hard_gates jsonb,
  soft_gates jsonb,
  ai_extractor_output jsonb,
  ai_scrutinizer_output jsonb,
  ai_suspicion_score int,
  human_review_status text DEFAULT 'pending' CHECK (human_review_status IN ('pending', 'flagged', 'cleared', 'reviewed')),
  human_reviewer_notes text,
  judge_scores jsonb,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (team_id)
);

-- ============================================================
-- 10. MENTOR DIGESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hackathon_phase3_mentor_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_date date NOT NULL UNIQUE,
  teams_attention jsonb,
  teams_progressing jsonb,
  leaderboard_snapshot jsonb,
  new_suspicion_flags jsonb,
  action_queue jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- ============================================================
-- 11. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.phase3_leaderboard_cycles AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  COUNT(DISTINCT c.cycle_number) AS cycles_completed,
  COUNT(DISTINCT ts.tester_name) AS distinct_testers,
  COUNT(DISTINCT ts.id) FILTER (WHERE ts.fresh_tester) AS fresh_testers,
  COUNT(DISTINCT rp.id) AS hypotheses_preregistered,
  MAX(ms.submitted_at) AS synthesis_submitted_at,
  MAX(vs.submitted_at) AS video_submitted_at
FROM public.hackathon_teams t
LEFT JOIN public.hackathon_phase3_cycles c ON c.team_id = t.id AND c.status = 'completed'
LEFT JOIN public.hackathon_phase3_test_sessions ts ON ts.team_id = t.id
LEFT JOIN public.hackathon_phase3_ritual_posts rp ON rp.team_id = t.id
LEFT JOIN public.hackathon_phase3_midphase_synthesis ms ON ms.team_id = t.id
LEFT JOIN public.hackathon_phase3_video_submissions vs ON vs.team_id = t.id
GROUP BY t.id, t.name;

CREATE OR REPLACE VIEW public.phase3_funnel AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  MAX(c.cycle_number) AS current_cycle,
  MAX(c.status) AS current_status,
  MAX(c.gate_decision) AS last_gate_decision,
  COUNT(DISTINCT dc.id) FILTER (WHERE dc.status = 'submitted') AS checkins_submitted,
  COUNT(DISTINCT ts.id) AS total_test_sessions,
  COUNT(DISTINCT ts.id) FILTER (WHERE ts.fresh_tester) AS fresh_test_sessions,
  MAX(ms.confidence_score) AS confidence,
  CASE
    WHEN MAX(vs.submitted_at) IS NOT NULL THEN 'submitted'
    WHEN MAX(c.cycle_number) >= 2 THEN 'proceeding'
    WHEN MAX(c.cycle_number) = 1 THEN 'in_cycle_1'
    ELSE 'not_started'
  END AS funnel_stage
FROM public.hackathon_teams t
LEFT JOIN public.hackathon_phase3_cycles c ON c.team_id = t.id
LEFT JOIN public.hackathon_phase3_daily_checkins dc ON dc.team_id = t.id
LEFT JOIN public.hackathon_phase3_test_sessions ts ON ts.team_id = t.id
LEFT JOIN public.hackathon_phase3_midphase_synthesis ms ON ms.team_id = t.id
LEFT JOIN public.hackathon_phase3_video_submissions vs ON vs.team_id = t.id
GROUP BY t.id, t.name;

-- ============================================================
-- 12. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_fresh_tester(p_team_id uuid, p_tester_name text, p_cycle_number int)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.hackathon_phase3_test_sessions ts
    WHERE ts.team_id = p_team_id
      AND ts.tester_name = p_tester_name
      AND ts.cycle_number < p_cycle_number
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_team_current_cycle(p_team_id uuid)
RETURNS TABLE (cycle_number int, status text, step_type text, step_status text) AS $$
BEGIN
  RETURN QUERY
  WITH latest_cycle AS (
    SELECT * FROM public.hackathon_phase3_cycles
    WHERE team_id = p_team_id
    ORDER BY cycle_number DESC
    LIMIT 1
  )
  SELECT
    lc.cycle_number,
    lc.status,
    COALESCE(
      (SELECT cs.step_type FROM public.hackathon_phase3_cycle_steps cs
       WHERE cs.cycle_id = lc.id AND cs.status != 'locked'
       ORDER BY CASE cs.step_type
         WHEN 'hypothesis' THEN 1 WHEN 'pretotype' THEN 2
         WHEN 'test_session' THEN 3 WHEN 'synthesis' THEN 4
       END
       LIMIT 1),
      'hypothesis'
    ),
    COALESCE(
      (SELECT cs.status FROM public.hackathon_phase3_cycle_steps cs
       WHERE cs.cycle_id = lc.id AND cs.status != 'locked'
       ORDER BY CASE cs.step_type
         WHEN 'hypothesis' THEN 1 WHEN 'pretotype' THEN 2
         WHEN 'test_session' THEN 3 WHEN 'synthesis' THEN 4
       END
       LIMIT 1),
      'draft'
    );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.start_phase3_cycle(p_team_id uuid, p_program_phase_id uuid)
RETURNS uuid AS $$
DECLARE
  v_next_cycle int;
  v_new_cycle_id uuid;
BEGIN
  SELECT COALESCE(MAX(cycle_number), 0) + 1
  INTO v_next_cycle
  FROM public.hackathon_phase3_cycles
  WHERE team_id = p_team_id;
  
  INSERT INTO public.hackathon_phase3_cycles (team_id, program_phase_id, cycle_number)
  VALUES (p_team_id, p_program_phase_id, v_next_cycle)
  RETURNING id INTO v_new_cycle_id;
  
  RETURN v_new_cycle_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_cycle_scorecard(p_cycle_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'hypothesis_quality', COALESCE((ai_score->>'hypothesis_quality')::int, 0),
    'variable_isolation', COALESCE((ai_score->>'variable_isolation')::int, 0),
    'behavioral_evidence', COALESCE((ai_score->>'behavioral_evidence')::int, 0),
    'tester_freshness', COALESCE((ai_score->>'tester_freshness')::int, 0),
    'synthesis_honesty', COALESCE((ai_score->>'synthesis_honesty')::int, 0),
    'total', COALESCE((ai_score->>'hypothesis_quality')::int, 0) +
             COALESCE((ai_score->>'variable_isolation')::int, 0) +
             COALESCE((ai_score->>'behavioral_evidence')::int, 0) +
             COALESCE((ai_score->>'tester_freshness')::int, 0) +
             COALESCE((ai_score->>'synthesis_honesty')::int, 0)
  )
  INTO v_result
  FROM public.hackathon_phase3_cycles
  WHERE id = p_cycle_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 13. RLS (Enable + permissive policies)
-- ============================================================

ALTER TABLE public.hackathon_phase3_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_cycle_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_midphase_synthesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_ritual_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_video_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase3_mentor_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY hackathon_phase3_cycles_select
  ON public.hackathon_phase3_cycles FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_cycles_insert
  ON public.hackathon_phase3_cycles FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_cycles_update
  ON public.hackathon_phase3_cycles FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_cycle_steps_select
  ON public.hackathon_phase3_cycle_steps FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_cycle_steps_insert
  ON public.hackathon_phase3_cycle_steps FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_cycle_steps_update
  ON public.hackathon_phase3_cycle_steps FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_test_sessions_select
  ON public.hackathon_phase3_test_sessions FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_test_sessions_insert
  ON public.hackathon_phase3_test_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_test_sessions_update
  ON public.hackathon_phase3_test_sessions FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_daily_checkins_select
  ON public.hackathon_phase3_daily_checkins FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_daily_checkins_insert
  ON public.hackathon_phase3_daily_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_daily_checkins_update
  ON public.hackathon_phase3_daily_checkins FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_midphase_synthesis_select
  ON public.hackathon_phase3_midphase_synthesis FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_midphase_synthesis_insert
  ON public.hackathon_phase3_midphase_synthesis FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_midphase_synthesis_update
  ON public.hackathon_phase3_midphase_synthesis FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_ritual_posts_select
  ON public.hackathon_phase3_ritual_posts FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_ritual_posts_insert
  ON public.hackathon_phase3_ritual_posts FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_ritual_posts_update
  ON public.hackathon_phase3_ritual_posts FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_module_progress_select
  ON public.hackathon_phase3_module_progress FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_module_progress_insert
  ON public.hackathon_phase3_module_progress FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_module_progress_update
  ON public.hackathon_phase3_module_progress FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_video_submissions_select
  ON public.hackathon_phase3_video_submissions FOR SELECT USING (true);
CREATE POLICY hackathon_phase3_video_submissions_insert
  ON public.hackathon_phase3_video_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY hackathon_phase3_video_submissions_update
  ON public.hackathon_phase3_video_submissions FOR UPDATE USING (true);

CREATE POLICY hackathon_phase3_mentor_digests_select
  ON public.hackathon_phase3_mentor_digests FOR SELECT USING (true);

-- ============================================================
-- 14. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS hackathon_phase3_cycles_updated_at ON public.hackathon_phase3_cycles;
CREATE TRIGGER hackathon_phase3_cycles_updated_at
  BEFORE UPDATE ON public.hackathon_phase3_cycles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS hackathon_phase3_cycle_steps_updated_at ON public.hackathon_phase3_cycle_steps;
CREATE TRIGGER hackathon_phase3_cycle_steps_updated_at
  BEFORE UPDATE ON public.hackathon_phase3_cycle_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
