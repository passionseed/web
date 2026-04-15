-- Retention Analytics Views for Passion Seed
-- Tracks DAU, MAU, WAU, and user cohort retention

-- ============================================
-- 1. DAILY ACTIVE USERS (DAU)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_daily_active_users AS
WITH daily_activity AS (
  SELECT 
    user_id,
    DATE(created_at) as activity_date,
    COUNT(*) as event_count,
    MIN(created_at) as first_event_at,
    MAX(created_at) as last_event_at
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id, DATE(created_at)
),
first_user_activity AS (
  SELECT 
    user_id,
    MIN(activity_date) as first_active_date
  FROM daily_activity
  GROUP BY user_id
)
SELECT 
  da.activity_date,
  COUNT(DISTINCT da.user_id) as dau,
  AVG(da.event_count)::numeric(10,2) as avg_events_per_user,
  COUNT(DISTINCT da.user_id) FILTER (WHERE da.event_count >= 10) as power_users,
  COUNT(DISTINCT CASE WHEN fua.first_active_date = da.activity_date THEN da.user_id END) as new_daily_users
FROM daily_activity da
LEFT JOIN first_user_activity fua ON da.user_id = fua.user_id
GROUP BY da.activity_date
ORDER BY da.activity_date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_dau_date ON analytics_daily_active_users(activity_date);

-- ============================================
-- 2. WEEKLY ACTIVE USERS (WAU)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_weekly_active_users AS
WITH weekly_activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', created_at) as activity_week,
    COUNT(*) as event_count,
    COUNT(DISTINCT DATE(created_at)) as active_days
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
  GROUP BY user_id, DATE_TRUNC('week', created_at)
),
first_user_activity AS (
  SELECT 
    user_id,
    MIN(activity_week) as first_active_week
  FROM weekly_activity
  GROUP BY user_id
)
SELECT 
  wa.activity_week,
  COUNT(DISTINCT wa.user_id) as wau,
  AVG(wa.event_count)::numeric(10,2) as avg_events_per_user,
  AVG(wa.active_days)::numeric(10,2) as avg_active_days,
  COUNT(DISTINCT wa.user_id) FILTER (WHERE wa.active_days >= 5) as highly_engaged_users,
  COUNT(DISTINCT CASE WHEN fua.first_active_week = wa.activity_week THEN wa.user_id END) as new_weekly_users
FROM weekly_activity wa
LEFT JOIN first_user_activity fua ON wa.user_id = fua.user_id
GROUP BY wa.activity_week
ORDER BY wa.activity_week DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_wau_week ON analytics_weekly_active_users(activity_week);

-- ============================================
-- 3. MONTHLY ACTIVE USERS (MAU)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_monthly_active_users AS
WITH monthly_activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('month', created_at) as activity_month,
    COUNT(*) as event_count,
    COUNT(DISTINCT DATE_TRUNC('week', created_at)) as active_weeks
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY user_id, DATE_TRUNC('month', created_at)
),
first_user_activity AS (
  SELECT 
    user_id,
    MIN(activity_month) as first_active_month
  FROM monthly_activity
  GROUP BY user_id
)
SELECT 
  ma.activity_month,
  COUNT(DISTINCT ma.user_id) as mau,
  AVG(ma.event_count)::numeric(10,2) as avg_events_per_user,
  AVG(ma.active_weeks)::numeric(10,2) as avg_active_weeks,
  COUNT(DISTINCT ma.user_id) FILTER (WHERE ma.active_weeks >= 3) as retained_users,
  COUNT(DISTINCT CASE WHEN fua.first_active_month = ma.activity_month THEN ma.user_id END) as new_monthly_users
FROM monthly_activity ma
LEFT JOIN first_user_activity fua ON ma.user_id = fua.user_id
GROUP BY ma.activity_month
ORDER BY ma.activity_month DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_mau_month ON analytics_monthly_active_users(activity_month);

-- ============================================
-- 4. USER COHORT RETENTION ANALYSIS
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_user_cohorts AS
WITH user_first_activity AS (
  SELECT 
    user_id,
    MIN(DATE(created_at)) as first_active_date,
    MIN(DATE_TRUNC('week', created_at)) as first_active_week,
    MIN(DATE_TRUNC('month', created_at)) as first_active_month
  FROM public.user_events
  GROUP BY user_id
),
user_activity_by_day AS (
  SELECT 
    user_id,
    DATE(created_at) as activity_date,
    COUNT(*) as events
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '180 days'
  GROUP BY user_id, DATE(created_at)
),
user_activity_flags AS (
  SELECT 
    user_id,
    COUNT(DISTINCT activity_date) as total_active_days,
    SUM(events) as total_events,
    MAX(activity_date) as last_active_date,
    BOOL_OR(activity_date >= CURRENT_DATE - INTERVAL '7 days') as is_active_last_7_days,
    BOOL_OR(activity_date >= CURRENT_DATE - INTERVAL '30 days') as is_active_last_30_days
  FROM user_activity_by_day
  GROUP BY user_id
)
SELECT 
  ufa.user_id,
  ufa.first_active_date,
  ufa.first_active_week as cohort_week,
  ufa.first_active_month as cohort_month,
  COALESCE(uaf.total_active_days, 0) as total_active_days,
  COALESCE(uaf.total_events, 0) as total_events,
  uaf.last_active_date,
  (CURRENT_DATE - ufa.first_active_date) as days_since_first_active,
  COALESCE(uaf.is_active_last_7_days, false) as is_active_last_7_days,
  COALESCE(uaf.is_active_last_30_days, false) as is_active_last_30_days
FROM user_first_activity ufa
LEFT JOIN user_activity_flags uaf ON ufa.user_id = uaf.user_id;

CREATE INDEX IF NOT EXISTS idx_analytics_cohorts_cohort_week ON analytics_user_cohorts(cohort_week);
CREATE INDEX IF NOT EXISTS idx_analytics_cohorts_cohort_month ON analytics_user_cohorts(cohort_month);
CREATE INDEX IF NOT EXISTS idx_analytics_cohorts_user_id ON analytics_user_cohorts(user_id);

-- ============================================
-- 5. COHORT RETENTION RATES BY WEEK
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_cohort_retention_weekly AS
WITH cohort_users AS (
  SELECT 
    cohort_week,
    user_id,
    first_active_date
  FROM analytics_user_cohorts
  WHERE cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
),
retention_weeks AS (
  SELECT generate_series(0, 8) as week_number
),
user_retention AS (
  SELECT 
    cu.cohort_week,
    cu.user_id,
    rw.week_number,
    EXISTS (
      SELECT 1 FROM public.user_events ue
      WHERE ue.user_id = cu.user_id
      AND DATE(ue.created_at) >= cu.first_active_date + (rw.week_number || ' weeks')::INTERVAL
      AND DATE(ue.created_at) < cu.first_active_date + ((rw.week_number + 1) || ' weeks')::INTERVAL
    ) as is_active
  FROM cohort_users cu
  CROSS JOIN retention_weeks rw
)
SELECT 
  cohort_week,
  week_number,
  COUNT(DISTINCT user_id) FILTER (WHERE is_active) as users_active,
  COUNT(DISTINCT CASE WHEN week_number = 0 THEN user_id END) as cohort_size,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN week_number = 0 THEN user_id END) > 0
    THEN ROUND(
      (COUNT(DISTINCT user_id) FILTER (WHERE is_active))::numeric / 
      NULLIF(COUNT(DISTINCT CASE WHEN week_number = 0 THEN user_id END), 0)::numeric * 100, 
      2
    )
    ELSE 0
  END as retention_rate_pct
FROM user_retention
GROUP BY cohort_week, week_number
ORDER BY cohort_week DESC, week_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_cohort_retention_weekly 
ON analytics_cohort_retention_weekly(cohort_week, week_number);

-- ============================================
-- 6. SESSION DURATION ANALYTICS
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_session_duration AS
WITH session_events AS (
  SELECT 
    user_id,
    session_id,
    MIN(created_at) as session_start,
    MAX(created_at) as session_end,
    COUNT(*) as event_count,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as duration_minutes
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND session_id IS NOT NULL
  GROUP BY user_id, session_id
)
SELECT 
  DATE(session_start) as session_date,
  COUNT(*) as total_sessions,
  AVG(duration_minutes)::numeric(10,2) as avg_session_duration_min,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_minutes)::numeric(10,2) as median_session_duration_min,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY duration_minutes)::numeric(10,2) as p90_session_duration_min,
  AVG(event_count)::numeric(10,2) as avg_events_per_session,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE duration_minutes >= 5) as engaged_sessions,
  COUNT(*) FILTER (WHERE duration_minutes >= 30) as long_sessions
FROM session_events
GROUP BY DATE(session_start)
ORDER BY session_date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_session_duration_date ON analytics_session_duration(session_date);

-- ============================================
-- 7. COMPREHENSIVE RETENTION SUMMARY VIEW
-- ============================================
CREATE OR REPLACE VIEW analytics_retention_summary AS
SELECT 
  CURRENT_DATE as report_date,
  (SELECT dau FROM analytics_daily_active_users ORDER BY activity_date DESC LIMIT 1) as current_dau,
  (SELECT wau FROM analytics_weekly_active_users ORDER BY activity_week DESC LIMIT 1) as current_wau,
  (SELECT mau FROM analytics_monthly_active_users ORDER BY activity_month DESC LIMIT 1) as current_mau,
  (SELECT dau FROM analytics_daily_active_users ORDER BY activity_date DESC OFFSET 1 LIMIT 1) as prev_dau,
  (SELECT wau FROM analytics_weekly_active_users ORDER BY activity_week DESC OFFSET 1 LIMIT 1) as prev_wau,
  (SELECT mau FROM analytics_monthly_active_users ORDER BY activity_month DESC OFFSET 1 LIMIT 1) as prev_mau,
  (SELECT COUNT(DISTINCT user_id) FROM analytics_user_cohorts) as total_users_ever,
  (SELECT COUNT(*) FROM analytics_user_cohorts WHERE is_active_last_7_days) as active_users_7d,
  (SELECT COUNT(*) FROM analytics_user_cohorts WHERE is_active_last_30_days) as active_users_30d,
  (SELECT avg_session_duration_min FROM analytics_session_duration ORDER BY session_date DESC LIMIT 1) as avg_session_min,
  -- Calculate week-over-week change percentages
  CASE 
    WHEN (SELECT dau FROM analytics_daily_active_users ORDER BY activity_date DESC OFFSET 1 LIMIT 1) > 0
    THEN ROUND(
      ((SELECT dau FROM analytics_daily_active_users ORDER BY activity_date DESC LIMIT 1) - 
       (SELECT dau FROM analytics_daily_active_users ORDER BY activity_date DESC OFFSET 1 LIMIT 1))::numeric /
      (SELECT dau FROM analytics_daily_active_users ORDER BY activity_date DESC OFFSET 1 LIMIT 1) * 100,
      2
    )
    ELSE 0
  END as dau_change_pct,
  CASE 
    WHEN (SELECT wau FROM analytics_weekly_active_users ORDER BY activity_week DESC OFFSET 1 LIMIT 1) > 0
    THEN ROUND(
      ((SELECT wau FROM analytics_weekly_active_users ORDER BY activity_week DESC LIMIT 1) - 
       (SELECT wau FROM analytics_weekly_active_users ORDER BY activity_week DESC OFFSET 1 LIMIT 1))::numeric /
      (SELECT wau FROM analytics_weekly_active_users ORDER BY activity_week DESC OFFSET 1 LIMIT 1) * 100,
      2
    )
    ELSE 0
  END as wau_change_pct,
  CASE 
    WHEN (SELECT mau FROM analytics_monthly_active_users ORDER BY activity_month DESC OFFSET 1 LIMIT 1) > 0
    THEN ROUND(
      ((SELECT mau FROM analytics_monthly_active_users ORDER BY activity_month DESC LIMIT 1) - 
       (SELECT mau FROM analytics_monthly_active_users ORDER BY activity_month DESC OFFSET 1 LIMIT 1))::numeric /
      (SELECT mau FROM analytics_monthly_active_users ORDER BY activity_month DESC OFFSET 1 LIMIT 1) * 100,
      2
    )
    ELSE 0
  END as mau_change_pct;

-- ============================================
-- 8. REFRESH FUNCTION FOR MATERIALIZED VIEWS
-- ============================================
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_weekly_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_monthly_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_user_cohorts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_cohort_retention_weekly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_session_duration;
END;
$$;

-- ============================================
-- 9. COHORT RETENTION BY MONTH (Longer view)
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_cohort_retention_monthly AS
WITH cohort_users AS (
  SELECT 
    cohort_month,
    user_id,
    first_active_date
  FROM analytics_user_cohorts
  WHERE cohort_month >= CURRENT_DATE - INTERVAL '6 months'
),
retention_months AS (
  SELECT generate_series(0, 5) as month_number
),
user_retention AS (
  SELECT 
    cu.cohort_month,
    cu.user_id,
    rm.month_number,
    EXISTS (
      SELECT 1 FROM public.user_events ue
      WHERE ue.user_id = cu.user_id
      AND DATE(ue.created_at) >= cu.first_active_date + (rm.month_number || ' months')::INTERVAL
      AND DATE(ue.created_at) < cu.first_active_date + ((rm.month_number + 1) || ' months')::INTERVAL
    ) as is_active
  FROM cohort_users cu
  CROSS JOIN retention_months rm
)
SELECT 
  cohort_month,
  month_number,
  COUNT(DISTINCT user_id) FILTER (WHERE is_active) as users_active,
  COUNT(DISTINCT CASE WHEN month_number = 0 THEN user_id END) as cohort_size,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN month_number = 0 THEN user_id END) > 0
    THEN ROUND(
      (COUNT(DISTINCT user_id) FILTER (WHERE is_active))::numeric / 
      NULLIF(COUNT(DISTINCT CASE WHEN month_number = 0 THEN user_id END), 0)::numeric * 100, 
      2
    )
    ELSE 0
  END as retention_rate_pct
FROM user_retention
GROUP BY cohort_month, month_number
ORDER BY cohort_month DESC, month_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_cohort_retention_monthly 
ON analytics_cohort_retention_monthly(cohort_month, month_number);
