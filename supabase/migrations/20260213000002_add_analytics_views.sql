-- Create analytics views for Direction Finder performance analysis
-- These views enable easy querying of metrics for A/B testing and optimization decisions

-- Model Performance Comparison View
-- Compares performance across different AI models and providers
CREATE OR REPLACE VIEW model_performance_stats AS
SELECT
  model_provider,
  model_name,
  COUNT(*) as total_generations,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / NULLIF(COUNT(*), 0), 2) as cache_hit_rate_percent,
  ROUND(AVG(total_generation_time_ms)::numeric, 0) as avg_time_ms,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY total_generation_time_ms)::numeric, 0) as p50_time_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_generation_time_ms)::numeric, 0) as p95_time_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_generation_time_ms)::numeric, 0) as p99_time_ms,
  MIN(total_generation_time_ms) as min_time_ms,
  MAX(total_generation_time_ms) as max_time_ms,
  ROUND(AVG(total_tokens)::numeric, 0) as avg_tokens,
  ROUND(AVG(user_rating)::numeric, 2) as avg_rating,
  COUNT(*) FILTER (WHERE user_rating IS NOT NULL) as rated_count,
  COUNT(*) FILTER (WHERE had_timeout = true) as timeout_count,
  COUNT(*) FILTER (WHERE had_rate_limit = true) as rate_limit_count,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as error_count
FROM direction_finder_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model_provider, model_name
ORDER BY avg_time_ms ASC NULLS LAST;

COMMENT ON VIEW model_performance_stats IS 'Aggregated performance statistics by model for the last 30 days';

-- Hourly Generation Stats
-- Tracks load patterns and system health over time
CREATE OR REPLACE VIEW generation_stats_hourly AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE had_timeout = true) as timeouts,
  ROUND(100.0 * COUNT(*) FILTER (WHERE had_timeout = true) / NULLIF(COUNT(*), 0), 2) as timeout_rate_percent,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / NULLIF(COUNT(*), 0), 2) as cache_hit_rate_percent,
  ROUND(AVG(total_generation_time_ms)::numeric, 0) as avg_time_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_generation_time_ms)::numeric, 0) as p95_time_ms,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors
FROM direction_finder_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

COMMENT ON VIEW generation_stats_hourly IS 'Hourly aggregated statistics for the last 7 days, useful for identifying load spikes';

-- Daily Generation Stats
-- Higher-level view of system usage and performance trends
CREATE OR REPLACE VIEW generation_stats_daily AS
SELECT
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / NULLIF(COUNT(*), 0), 2) as cache_hit_rate_percent,
  ROUND(AVG(total_generation_time_ms)::numeric, 0) as avg_time_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_generation_time_ms)::numeric, 0) as p95_time_ms,
  ROUND(AVG(total_tokens)::numeric, 0) as avg_tokens,
  SUM(total_tokens) as total_tokens_used,
  ROUND(AVG(conversation_turn_count)::numeric, 1) as avg_conversation_turns,
  COUNT(*) FILTER (WHERE had_timeout = true) as timeouts,
  COUNT(*) FILTER (WHERE had_rate_limit = true) as rate_limits,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors,
  ROUND(AVG(user_rating)::numeric, 2) as avg_rating,
  COUNT(*) FILTER (WHERE user_rating IS NOT NULL) as rated_count
FROM direction_finder_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

COMMENT ON VIEW generation_stats_daily IS 'Daily aggregated statistics for the last 30 days';

-- Cache Effectiveness View
-- Analyzes which answer patterns are most frequently cached
CREATE OR REPLACE VIEW cache_effectiveness_stats AS
SELECT
  dfr.answers_hash,
  dfr.model_name,
  COUNT(*) as usage_count,
  MAX(dfr.cache_hit_count) as max_cache_hits,
  AVG(dfm.total_generation_time_ms) as avg_fresh_generation_time_ms,
  MIN(dfr.created_at) as first_seen,
  MAX(dfr.created_at) as last_seen,
  -- Show a sample of the answers for context (first 100 chars of JSON)
  LEFT(dfr.answers::text, 100) || '...' as sample_answers
FROM direction_finder_results dfr
LEFT JOIN direction_finder_metrics dfm ON dfr.id = dfm.result_id
WHERE dfr.cache_key IS NOT NULL
  AND dfr.created_at > NOW() - INTERVAL '7 days'
GROUP BY dfr.answers_hash, dfr.model_name, dfr.answers
HAVING COUNT(*) > 1 -- Only show patterns that appeared multiple times
ORDER BY usage_count DESC, max_cache_hits DESC
LIMIT 50;

COMMENT ON VIEW cache_effectiveness_stats IS 'Shows most frequently accessed answer patterns for cache optimization';

-- Error Analysis View
-- Helps identify problematic models or patterns
CREATE OR REPLACE VIEW error_analysis AS
SELECT
  model_provider,
  model_name,
  error_message,
  COUNT(*) as error_count,
  ROUND(AVG(total_generation_time_ms)::numeric, 0) as avg_time_before_error_ms,
  ROUND(AVG(retry_count)::numeric, 1) as avg_retries,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  COUNT(DISTINCT user_id) as affected_users
FROM direction_finder_metrics
WHERE error_message IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY model_provider, model_name, error_message
ORDER BY error_count DESC, last_occurrence DESC;

COMMENT ON VIEW error_analysis IS 'Aggregates error patterns to identify systematic issues';

-- Grant SELECT on all views to authenticated users (for admins and analytics)
GRANT SELECT ON model_performance_stats TO authenticated;
GRANT SELECT ON generation_stats_hourly TO authenticated;
GRANT SELECT ON generation_stats_daily TO authenticated;
GRANT SELECT ON cache_effectiveness_stats TO authenticated;
GRANT SELECT ON error_analysis TO authenticated;
