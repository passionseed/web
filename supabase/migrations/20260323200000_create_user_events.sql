-- Migration: Create user_events table for Super Planner event tracking
-- Created: 2026-03-23 20:00:00
-- Description: Tracks user events through the Super Planner for PMF discovery

-- Create user_events table
CREATE TABLE IF NOT EXISTS public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON public.user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON public.user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_session_id ON public.user_events(session_id);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own events
DROP POLICY IF EXISTS "users_insert_own_events" ON public.user_events;
CREATE POLICY "users_insert_own_events" ON public.user_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all events (uses existing is_admin function from 20250818120000_add_admin_role.sql)
DROP POLICY IF EXISTS "admins_read_all_events" ON public.user_events;
CREATE POLICY "admins_read_all_events" ON public.user_events
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Create view for user status computation
CREATE OR REPLACE VIEW public.user_planner_status AS
SELECT 
  u.id as user_id,
  u.email,
  p.full_name as profile_name,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM public.user_events WHERE user_id = u.id) THEN 'not_started'
    WHEN EXISTS (SELECT 1 FROM public.user_events WHERE user_id = u.id AND event_type = 'plan_created') THEN 'completed'
    WHEN (SELECT MAX(created_at) FROM public.user_events WHERE user_id = u.id) < NOW() - INTERVAL '7 days' THEN 'churned'
    ELSE 'in_progress'
  END as status,
  (SELECT MAX(created_at) FROM public.user_events WHERE user_id = u.id) as last_event_at,
  (SELECT COUNT(DISTINCT event_type) FROM public.user_events 
   WHERE user_id = u.id 
   AND event_type IN ('portfolio_uploaded', 'interest_quiz_completed', 'tcas_program_viewed', 'tcas_program_saved', 'plan_created')
  ) as steps_completed
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id;

-- Grant SELECT on view to authenticated users (admins will use it via RLS)
GRANT SELECT ON public.user_planner_status TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_events IS 'Tracks user events through the Super Planner for PMF discovery';
COMMENT ON COLUMN public.user_events.event_type IS 'Type of event: portfolio_uploaded, interest_quiz_started, interest_quiz_completed, interest_quiz_abandoned, tcas_program_viewed, tcas_program_saved, plan_created';
COMMENT ON COLUMN public.user_events.event_data IS 'JSON payload with event-specific data';
COMMENT ON COLUMN public.user_events.session_id IS 'Session identifier for tracking user sessions across page loads';
COMMENT ON VIEW public.user_planner_status IS 'Computed user status for Super Planner progress';