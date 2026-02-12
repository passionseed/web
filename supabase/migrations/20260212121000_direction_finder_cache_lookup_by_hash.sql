-- Make cache lookup robust by keying on answers_hash + model_name.
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
  v_answers_hash TEXT;
  v_cache_window_days INTEGER := 7;
BEGIN
  v_answers_hash := md5(p_answers::text);

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
  WHERE dfr.answers_hash = v_answers_hash
    AND COALESCE(dfr.model_name, 'gemini-2.5-flash') = p_model_name
    AND dfr.created_at > NOW() - INTERVAL '1 day' * v_cache_window_days
    AND dfr.result IS NOT NULL
  ORDER BY dfr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_cached_direction_result(JSONB, TEXT) TO authenticated;
