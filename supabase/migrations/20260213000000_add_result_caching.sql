-- Add caching infrastructure for Direction Finder results
-- This enables hash-based result caching to reduce AI generation load during high-concurrency scenarios

-- Add caching columns to direction_finder_results table
ALTER TABLE direction_finder_results
ADD COLUMN IF NOT EXISTS answers_hash TEXT GENERATED ALWAYS AS (md5(answers::text)) STORED,
ADD COLUMN IF NOT EXISTS cache_key TEXT,
ADD COLUMN IF NOT EXISTS is_cached BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cache_hit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_result_id UUID REFERENCES direction_finder_results(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS model_name TEXT;

-- Create index on cache_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_direction_finder_cache_key ON direction_finder_results(cache_key) WHERE cache_key IS NOT NULL;

-- Create index on answers_hash for duplicate detection
CREATE INDEX IF NOT EXISTS idx_direction_finder_answers_hash ON direction_finder_results(answers_hash);

-- Create index on created_at for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_direction_finder_created_at ON direction_finder_results(created_at DESC);

-- Function to find cached direction finder result
-- Returns the most recent matching result within the cache window (7 days)
-- Cache key is based on: answers_hash + model_name
CREATE OR REPLACE FUNCTION find_cached_direction_result(
  p_answers JSONB,
  p_model_name TEXT DEFAULT 'gemini-2.5-flash'
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  answers JSONB,
  result JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  model_name TEXT,
  is_cached BOOLEAN,
  cache_hit_count INTEGER,
  original_result_id UUID
) AS $$
DECLARE
  v_cache_key TEXT;
  v_cache_window_days INTEGER := 7;
BEGIN
  -- Generate cache key from answers hash and model name
  v_cache_key := md5(p_answers::text) || '_' || p_model_name;

  -- Find the most recent matching result within cache window
  RETURN QUERY
  SELECT
    dfr.id,
    dfr.user_id,
    dfr.answers,
    dfr.result,
    dfr.created_at,
    dfr.updated_at,
    dfr.model_name,
    dfr.is_cached,
    dfr.cache_hit_count,
    dfr.original_result_id
  FROM direction_finder_results dfr
  WHERE dfr.cache_key = v_cache_key
    AND dfr.created_at > NOW() - INTERVAL '1 day' * v_cache_window_days
    AND dfr.result IS NOT NULL -- Only return completed results
  ORDER BY dfr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_cached_direction_result(JSONB, TEXT) TO authenticated;

-- Function to update cache hit count when a cached result is used
CREATE OR REPLACE FUNCTION increment_cache_hit_count(p_result_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE direction_finder_results
  SET cache_hit_count = cache_hit_count + 1
  WHERE id = p_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_cache_hit_count(UUID) TO authenticated;

-- Add comment explaining the caching strategy
COMMENT ON COLUMN direction_finder_results.cache_key IS 'Hash of answers + model_name for cache lookups. Format: md5(answers::text)_model_name';
COMMENT ON COLUMN direction_finder_results.is_cached IS 'True if this result was returned from cache (not freshly generated)';
COMMENT ON COLUMN direction_finder_results.cache_hit_count IS 'Number of times this result has been served from cache';
COMMENT ON COLUMN direction_finder_results.original_result_id IS 'Reference to the original result if this is a cached copy';
COMMENT ON FUNCTION find_cached_direction_result(JSONB, TEXT) IS 'Find matching cached result within 7-day window based on answers hash and model name';
