-- Create metrics tracking table for Direction Finder performance analysis
-- This enables comprehensive monitoring of AI generation performance, cost, and quality

CREATE TABLE IF NOT EXISTS direction_finder_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID REFERENCES direction_finder_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),

  -- Model & Performance
  model_provider TEXT NOT NULL CHECK (model_provider IN ('google', 'anthropic', 'openai', 'deepseek')),
  model_name TEXT NOT NULL,

  -- Timing (milliseconds)
  core_generation_time_ms INTEGER,
  details_generation_time_ms INTEGER,
  total_generation_time_ms INTEGER NOT NULL,
  conversation_duration_ms INTEGER, -- Time from start to finish button

  -- Token Usage
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  prompt_size_bytes INTEGER,

  -- Cache Performance
  cache_hit BOOLEAN DEFAULT false,
  cache_lookup_time_ms INTEGER,

  -- Quality Metrics (optional user feedback)
  user_rating INTEGER CHECK (user_rating IS NULL OR user_rating BETWEEN 1 AND 5),
  user_feedback TEXT,

  -- Error Tracking
  had_timeout BOOLEAN DEFAULT false,
  had_rate_limit BOOLEAN DEFAULT false,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Context
  conversation_turn_count INTEGER,
  language TEXT CHECK (language IN ('en', 'th')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metrics_model ON direction_finder_metrics(model_provider, model_name);
CREATE INDEX IF NOT EXISTS idx_metrics_created ON direction_finder_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_result ON direction_finder_metrics(result_id);
CREATE INDEX IF NOT EXISTS idx_metrics_user ON direction_finder_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_cache_hit ON direction_finder_metrics(cache_hit) WHERE cache_hit = true;

-- RLS Policies
ALTER TABLE direction_finder_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view their own metrics
CREATE POLICY "Users can view their own metrics"
  ON direction_finder_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert metrics
CREATE POLICY "Authenticated users can insert metrics"
  ON direction_finder_metrics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own metrics (for adding feedback)
CREATE POLICY "Users can update their own metrics"
  ON direction_finder_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE direction_finder_metrics IS 'Tracks performance metrics for Direction Finder AI generations to enable A/B testing and optimization';
COMMENT ON COLUMN direction_finder_metrics.model_provider IS 'AI provider: google, anthropic, openai, or deepseek';
COMMENT ON COLUMN direction_finder_metrics.cache_hit IS 'True if this generation was served from cache (not freshly generated)';
COMMENT ON COLUMN direction_finder_metrics.conversation_turn_count IS 'Number of message exchanges before generation';
COMMENT ON COLUMN direction_finder_metrics.user_rating IS 'Optional 1-5 star rating from user on result quality';
