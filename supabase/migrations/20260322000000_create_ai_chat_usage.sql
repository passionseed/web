-- =====================================================
-- AI CHAT USAGE TRACKING
-- Tracks AI chat usage per user for rate limiting and analytics
-- =====================================================

-- AI chat usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request details
  activity_id UUID REFERENCES public.path_activities(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.path_enrollments(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.path_ai_chat_sessions(id) ON DELETE SET NULL,

  -- Usage metrics
  message_count INT NOT NULL DEFAULT 1,
  tokens_used INT, -- Optional: if we track token usage from Gemini

  -- Rate limiting window
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure one record per user per minute window for rate limiting
  UNIQUE(user_id, window_start)
);

-- Index for fast rate limiting checks
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_window
  ON public.ai_chat_usage(user_id, window_start DESC);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_user_created
  ON public.ai_chat_usage(user_id, created_at DESC);

-- Index for activity tracking
CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_activity
  ON public.ai_chat_usage(activity_id) WHERE activity_id IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_chat_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_chat_usage_updated_at
BEFORE UPDATE ON public.ai_chat_usage
FOR EACH ROW
EXECUTE FUNCTION update_ai_chat_usage_timestamp();

-- Function to aggregate usage per user per minute window
CREATE OR REPLACE FUNCTION increment_ai_chat_usage(
  p_user_id UUID,
  p_activity_id UUID DEFAULT NULL,
  p_enrollment_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  current_count INT,
  window_start TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INT;
BEGIN
  -- Round to the current minute for rate limiting window
  v_window_start := date_trunc('minute', now());

  -- Try to insert new record or update existing
  INSERT INTO public.ai_chat_usage (
    user_id, activity_id, enrollment_id, session_id, window_start, message_count
  )
  VALUES (
    p_user_id, p_activity_id, p_enrollment_id, p_session_id, v_window_start, 1
  )
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET
    message_count = public.ai_chat_usage.message_count + 1,
    activity_id = COALESCE(public.ai_chat_usage.activity_id, p_activity_id),
    enrollment_id = COALESCE(public.ai_chat_usage.enrollment_id, p_enrollment_id),
    session_id = COALESCE(public.ai_chat_usage.session_id, p_session_id),
    updated_at = now()
  RETURNING public.ai_chat_usage.message_count, public.ai_chat_usage.window_start
  INTO v_current_count, v_window_start;

  RETURN QUERY SELECT v_current_count, v_window_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.ai_chat_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own AI chat usage"
  ON public.ai_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage AI chat usage"
  ON public.ai_chat_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.ai_chat_usage IS 'Tracks AI chat usage per user for rate limiting and analytics';
COMMENT ON COLUMN public.ai_chat_usage.window_start IS 'Rate limiting window (1-minute buckets)';
COMMENT ON COLUMN public.ai_chat_usage.message_count IS 'Number of messages in this window';
