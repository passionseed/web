-- CEO Dashboard Tables for PMF Tracking
-- Created: April 14, 2026

-- Funnel events for tracking user progression
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK (event_name IN (
    'hackathon_signup', 
    'app_register', 
    'onboarding_start',
    'onboarding_complete',
    'portfolio_start', 
    'portfolio_upload',
    'portfolio_complete', 
    'grading_request',
    'grading_complete',
    'payment_intent',
    'payment_convert',
    'first_retention_check',
    'weekly_active',
    'churn_signal'
  )),
  event_timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for funnel analysis queries
CREATE INDEX IF NOT EXISTS idx_funnel_events_user_id ON public.funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_name ON public.funnel_events(event_name);
CREATE INDEX IF NOT EXISTS idx_funnel_events_timestamp ON public.funnel_events(event_timestamp);

-- Cohort assignments for retention tracking
CREATE TABLE IF NOT EXISTS public.cohort_assignments (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_date date NOT NULL, -- First day of week they signed up
  acquisition_channel text NOT NULL CHECK (acquisition_channel IN (
    'hackathon',
    'organic',
    'referral',
    'social_media',
    'paid_ads',
    'camp',
    'discord'
  )),
  signup_source text, -- Specific source (e.g., "hackathon_april_2026")
  utm_campaign text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cohort_assignments_cohort_date ON public.cohort_assignments(cohort_date);
CREATE INDEX IF NOT EXISTS idx_cohort_assignments_channel ON public.cohort_assignments(acquisition_channel);

-- Weekly retro data storage
CREATE TABLE IF NOT EXISTS public.weekly_retro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending date NOT NULL,
  wins text[] DEFAULT '{}',
  blockers text[] DEFAULT '{}',
  action_items jsonb DEFAULT '[]',
  metrics_snapshot jsonb DEFAULT '{}',
  team_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_retro_week ON public.weekly_retro(week_ending);

-- AI Agent status tracking
CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL CHECK (agent_name IN (
    'funnel_guardian',
    'content_strategist',
    'churn_predictor',
    'retro_bot'
  )),
  run_timestamp timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'alert_triggered')),
  output jsonb DEFAULT '{}',
  alerts_generated integer DEFAULT 0,
  error_message text,
  execution_time_ms integer
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_agent ON public.ai_agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_timestamp ON public.ai_agent_runs(run_timestamp);

-- Real-time alerts queue
CREATE TABLE IF NOT EXISTS public.dashboard_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'funnel_drop',
    'retention_drop',
    'conversion_spike',
    'churn_spike',
    'revenue_milestone',
    'users_stuck',
    'system_error'
  )),
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  message text NOT NULL,
  metric_value numeric,
  metric_threshold numeric,
  affected_users integer,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_unresolved ON public.dashboard_alerts(is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_severity ON public.dashboard_alerts(severity, created_at DESC);

-- Content calendar suggestions from AI
CREATE TABLE IF NOT EXISTS public.content_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_date date NOT NULL,
  platform text NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'discord', 'email', 'twitter')),
  content_type text NOT NULL,
  title text NOT NULL,
  description text,
  suggested_copy text,
  suggested_hashtags text[],
  ai_reasoning text, -- Why this content was suggested
  source_signal text, -- What triggered the suggestion (e.g., "47 users stuck at upload")
  is_approved boolean DEFAULT false,
  is_posted boolean DEFAULT false,
  posted_at timestamptz,
  performance_metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_suggestions_date ON public.content_suggestions(suggested_date);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_pending ON public.content_suggestions(is_approved, is_posted, suggested_date);

-- RLS Policies

-- Funnel events: Only admins can view, system can insert
CREATE POLICY "Admin can view funnel events"
ON public.funnel_events
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "System can insert funnel events"
ON public.funnel_events
FOR INSERT
TO public
WITH CHECK (true);

-- Cohort assignments: Admin only
CREATE POLICY "Admin can view cohort assignments"
ON public.cohort_assignments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "System can manage cohort assignments"
ON public.cohort_assignments
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Weekly retro: Team members can view and edit
CREATE POLICY "Team can view weekly retro"
ON public.weekly_retro
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'team')
  )
);

CREATE POLICY "Team can create retro"
ON public.weekly_retro
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'team')
  )
);

CREATE POLICY "Team can update retro"
ON public.weekly_retro
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'team')
  )
);

-- AI agent runs: Admin only
CREATE POLICY "Admin can view AI agent runs"
ON public.ai_agent_runs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Dashboard alerts: Team can view, system can manage
CREATE POLICY "Team can view alerts"
ON public.dashboard_alerts
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'team')
  )
);

CREATE POLICY "System can manage alerts"
ON public.dashboard_alerts
FOR ALL
TO public
USING (true);

-- Content suggestions: Team can view and approve
CREATE POLICY "Team can view content suggestions"
ON public.content_suggestions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'team')
  )
);

CREATE POLICY "Team can approve and mark posted"
ON public.content_suggestions
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'team')
  )
);

-- Enable RLS on all tables
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_retro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;

-- Function to get funnel metrics for a date range
CREATE OR REPLACE FUNCTION public.get_funnel_metrics(
  start_date date,
  end_date date
)
RETURNS TABLE (
  event_name text,
  event_count bigint,
  unique_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fe.event_name,
    COUNT(*) as event_count,
    COUNT(DISTINCT fe.user_id) as unique_users
  FROM public.funnel_events fe
  WHERE fe.event_timestamp::date BETWEEN start_date AND end_date
  GROUP BY fe.event_name
  ORDER BY MIN(fe.event_timestamp);
END;
$$;

-- Function to get cohort retention data
CREATE OR REPLACE FUNCTION public.get_cohort_retention(
  cohort_week date
)
RETURNS TABLE (
  week_number integer,
  users_retained bigint,
  retention_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users bigint;
BEGIN
  -- Get total users in cohort
  SELECT COUNT(*) INTO total_users
  FROM public.cohort_assignments
  WHERE cohort_date = cohort_week;
  
  RETURN QUERY
  WITH cohort_users AS (
    SELECT user_id
    FROM public.cohort_assignments
    WHERE cohort_date = cohort_week
  ),
  weekly_activity AS (
    SELECT 
      fe.user_id,
      EXTRACT(WEEK FROM fe.event_timestamp) - EXTRACT(WEEK FROM cohort_week) + 1 as week_num
    FROM public.funnel_events fe
    INNER JOIN cohort_users cu ON fe.user_id = cu.user_id
    WHERE fe.event_name = 'weekly_active'
    GROUP BY fe.user_id, EXTRACT(WEEK FROM fe.event_timestamp)
  )
  SELECT 
    wa.week_num::integer as week_number,
    COUNT(DISTINCT wa.user_id) as users_retained,
    ROUND((COUNT(DISTINCT wa.user_id)::numeric / NULLIF(total_users, 0)) * 100, 1) as retention_rate
  FROM weekly_activity wa
  GROUP BY wa.week_num
  ORDER BY wa.week_num;
END;
$$;

-- Trigger function to update weekly_retro updated_at
CREATE OR REPLACE FUNCTION public.update_weekly_retro_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER weekly_retro_updated_at
  BEFORE UPDATE ON public.weekly_retro
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_retro_timestamp();

-- Grant permissions
GRANT SELECT, INSERT ON public.funnel_events TO authenticated;
GRANT SELECT, INSERT ON public.cohort_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.weekly_retro TO authenticated;
GRANT SELECT ON public.ai_agent_runs TO authenticated;
GRANT SELECT, UPDATE ON public.dashboard_alerts TO authenticated;
GRANT SELECT, UPDATE ON public.content_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funnel_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cohort_retention TO authenticated;
