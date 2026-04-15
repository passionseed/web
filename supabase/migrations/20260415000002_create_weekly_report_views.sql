-- Weekly Report Views for Passion Seed Analytics
-- Automated reporting with key metrics and insights

-- ============================================
-- 1. WEEKLY SUMMARY REPORT
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_weekly_report AS
WITH week_ranges AS (
  SELECT 
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week') as last_week,
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '2 weeks') as two_weeks_ago,
    DATE_TRUNC('week', CURRENT_DATE) as this_week
),
weekly_metrics AS (
  SELECT 
    w.this_week,
    w.last_week,
    w.two_weeks_ago,
    -- This week so far (partial)
    (SELECT COUNT(DISTINCT user_id) 
     FROM public.user_events 
     WHERE DATE_TRUNC('week', created_at) = w.this_week) as this_week_users_partial,
    
    -- Last week complete
    (SELECT COUNT(DISTINCT user_id) 
     FROM public.user_events 
     WHERE DATE_TRUNC('week', created_at) = w.last_week) as last_week_users,
    
    -- Two weeks ago
    (SELECT COUNT(DISTINCT user_id) 
     FROM public.user_events 
     WHERE DATE_TRUNC('week', created_at) = w.two_weeks_ago) as two_weeks_ago_users,
    
    -- New users last week
    (SELECT COUNT(*) 
     FROM analytics_user_cohorts 
     WHERE cohort_week = w.last_week) as new_users_last_week,
    
    -- Active users by segment last week
    (SELECT COUNT(*) 
     FROM analytics_user_cohorts 
     WHERE cohort_week = w.last_week AND is_active_last_7_days) as retained_new_users,
    
    -- Funnel completions last week
    (SELECT COUNT(DISTINCT user_id)
     FROM public.user_events
     WHERE event_type = 'onboarding_step_completed'
       AND event_data->>'step' = 'complete'
       AND DATE_TRUNC('week', created_at) = w.last_week) as onboarding_completions,
    
    (SELECT COUNT(DISTINCT user_id)
     FROM public.user_events
     WHERE event_type = 'seed_completed'
       AND DATE_TRUNC('week', created_at) = w.last_week) as seed_completions,
    
    (SELECT COUNT(DISTINCT user_id)
     FROM public.user_events
     WHERE event_type = 'portfolio_item_added'
       AND DATE_TRUNC('week', created_at) = w.last_week) as portfolio_additions
  FROM week_ranges w
)
SELECT 
  CURRENT_DATE as report_generated_at,
  this_week as current_week,
  last_week as report_week,
  last_week_users as wau,
  two_weeks_ago_users as prev_wau,
  CASE 
    WHEN two_weeks_ago_users > 0 
    THEN ROUND((last_week_users - two_weeks_ago_users)::numeric / two_weeks_ago_users * 100, 2)
    ELSE 0
  END as wau_change_pct,
  new_users_last_week,
  retained_new_users,
  CASE 
    WHEN new_users_last_week > 0 
    THEN ROUND(retained_new_users::numeric / new_users_last_week * 100, 2)
    ELSE 0
  END as new_user_retention_pct,
  onboarding_completions,
  seed_completions,
  portfolio_additions,
  -- This week so far (for trend projection)
  this_week_users_partial
FROM weekly_metrics;

-- ============================================
-- 2. TOP PERFORMING COHORTS
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_top_cohorts AS
SELECT 
  cohort_week,
  cohort_size,
  total_seeds_completed,
  users_with_portfolio,
  users_with_program_save,
  avg_days_to_first_seed,
  overall_engagement_rate,
  RANK() OVER (ORDER BY overall_engagement_rate DESC) as engagement_rank,
  RANK() OVER (ORDER BY avg_days_to_first_seed ASC) as speed_rank
FROM analytics_funnel_by_cohort
WHERE cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
ORDER BY cohort_week DESC;

-- ============================================
-- 3. FEATURE ADOPTION VELOCITY
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_feature_velocity AS
WITH daily_feature_usage AS (
  SELECT 
    DATE(created_at) as usage_date,
    COUNT(DISTINCT CASE WHEN event_type = 'mobile_app_opened' THEN user_id END) as app_opens,
    COUNT(DISTINCT CASE WHEN event_type = 'seed_started' THEN user_id END) as seed_starters,
    COUNT(DISTINCT CASE WHEN event_type = 'seed_completed' THEN user_id END) as seed_completers,
    COUNT(DISTINCT CASE WHEN event_type = 'portfolio_item_added' THEN user_id END) as portfolio_creators,
    COUNT(DISTINCT CASE WHEN event_type = 'program_saved' THEN user_id END) as program_savers,
    COUNT(DISTINCT CASE WHEN event_type = 'direction_finder_viewed' THEN user_id END) as direction_finder_users
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  usage_date,
  app_opens,
  seed_starters,
  seed_completers,
  portfolio_creators,
  program_savers,
  direction_finder_users,
  -- Daily conversion rates
  ROUND(seed_starters::numeric / NULLIF(app_opens, 0) * 100, 2) as pct_opens_to_seeds,
  ROUND(seed_completers::numeric / NULLIF(seed_starters, 0) * 100, 2) as pct_seed_completion,
  ROUND(portfolio_creators::numeric / NULLIF(app_opens, 0) * 100, 2) as pct_opens_to_portfolio,
  -- 7-day rolling averages
  AVG(seed_starters) OVER (ORDER BY usage_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::numeric(10,2) as seed_starters_7d_avg,
  AVG(seed_completers) OVER (ORDER BY usage_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::numeric(10,2) as seed_completers_7d_avg
FROM daily_feature_usage
ORDER BY usage_date DESC;

-- ============================================
-- 4. ALERTS & ANOMALIES VIEW
-- ============================================
CREATE OR REPLACE VIEW analytics_alerts AS
WITH baseline_metrics AS (
  SELECT 
    AVG(dau) as avg_dau,
    STDDEV(dau) as stddev_dau,
    AVG(new_daily_users) as avg_new_users,
    STDDEV(new_daily_users) as stddev_new_users
  FROM analytics_daily_active_users
  WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days'
),
current_metrics AS (
  SELECT 
    dau,
    new_daily_users,
    activity_date
  FROM analytics_daily_active_users
  ORDER BY activity_date DESC
  LIMIT 1
)
SELECT 
  'Low DAU Alert' as alert_type,
  CASE 
    WHEN cm.dau < bm.avg_dau - 2 * bm.stddev_dau 
    THEN 'CRITICAL'
    WHEN cm.dau < bm.avg_dau - bm.stddev_dau 
    THEN 'WARNING'
    ELSE 'OK'
  END as severity,
  cm.dau as current_value,
  ROUND(bm.avg_dau::numeric, 0) as expected_value,
  cm.activity_date as alert_date
FROM current_metrics cm
CROSS JOIN baseline_metrics bm

UNION ALL

SELECT 
  'New User Spike' as alert_type,
  CASE 
    WHEN cm.new_daily_users > bm.avg_new_users + 2 * bm.stddev_new_users 
    THEN 'NOTICE'
    ELSE 'OK'
  END as severity,
  cm.new_daily_users as current_value,
  ROUND(bm.avg_new_users::numeric, 0) as expected_value,
  cm.activity_date as alert_date
FROM current_metrics cm
CROSS JOIN baseline_metrics bm;

-- ============================================
-- 5. EMAIL REPORT DATA (JSON format for easy sending)
-- ============================================
CREATE OR REPLACE VIEW analytics_email_report AS
SELECT 
  json_build_object(
    'report_date', CURRENT_DATE,
    'generated_at', NOW(),
    'summary', (SELECT row_to_json(r) FROM analytics_weekly_report r LIMIT 1),
    'retention', (SELECT row_to_json(r) FROM analytics_retention_summary r LIMIT 1),
    'funnel', (SELECT row_to_json(f) FROM analytics_onboarding_funnel f LIMIT 1),
    'journey', (SELECT row_to_json(j) FROM analytics_complete_user_journey j LIMIT 1),
    'alerts', (SELECT json_agg(a) FROM analytics_alerts a WHERE severity != 'OK'),
    'top_cohorts', (SELECT json_agg(c) FROM (
      SELECT * FROM analytics_top_cohorts 
      ORDER BY engagement_rank 
      LIMIT 5
    ) c)
  ) as report_json;

-- ============================================
-- 6. REFRESH ALL REPORT VIEWS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION refresh_weekly_report_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_weekly_report;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_top_cohorts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_feature_velocity;
END;
$$;

-- ============================================
-- 7. GET WEEKLY REPORT FOR EMAIL
-- ============================================
CREATE OR REPLACE FUNCTION get_weekly_report()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  report_data json;
BEGIN
  SELECT report_json INTO report_data FROM analytics_email_report;
  RETURN report_data;
END;
$$;
