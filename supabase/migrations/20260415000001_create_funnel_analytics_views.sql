-- Feature Adoption Funnel Analytics for Passion Seed
-- Tracks user journey from app open to key milestones

-- ============================================
-- 1. ONBOARDING FUNNEL
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_onboarding_funnel AS
WITH funnel_stages AS (
  SELECT 
    user_id,
    MIN(CASE WHEN event_type = 'mobile_app_opened' THEN created_at END) as app_opened_at,
    MIN(CASE WHEN event_type = 'onboarding_started' THEN created_at END) as onboarding_started_at,
    MIN(CASE WHEN event_type = 'interest_selected' THEN created_at END) as interest_selected_at,
    MIN(CASE WHEN event_type = 'career_selected' THEN created_at END) as career_selected_at,
    MIN(CASE WHEN event_type = 'onboarding_step_completed' AND (event_data->>'step') = 'complete' THEN created_at END) as onboarding_completed_at
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_users,
  COUNT(app_opened_at) as step_1_app_opened,
  COUNT(onboarding_started_at) as step_2_onboarding_started,
  COUNT(interest_selected_at) as step_3_interest_selected,
  COUNT(career_selected_at) as step_4_career_selected,
  COUNT(onboarding_completed_at) as step_5_onboarding_completed,
  -- Conversion rates
  ROUND(COUNT(onboarding_started_at)::numeric / NULLIF(COUNT(app_opened_at), 0) * 100, 2) as pct_app_to_onboarding,
  ROUND(COUNT(onboarding_completed_at)::numeric / NULLIF(COUNT(onboarding_started_at), 0) * 100, 2) as pct_onboarding_completion,
  ROUND(COUNT(onboarding_completed_at)::numeric / NULLIF(COUNT(app_opened_at), 0) * 100, 2) as pct_overall_conversion,
  -- Drop-off analysis
  COUNT(app_opened_at) - COUNT(onboarding_started_at) as drop_off_before_onboarding,
  COUNT(onboarding_started_at) - COUNT(onboarding_completed_at) as drop_off_during_onboarding
FROM funnel_stages;

-- ============================================
-- 2. SEED ADOPTION FUNNEL
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_seed_adoption_funnel AS
WITH seed_funnel AS (
  SELECT 
    user_id,
    MIN(CASE WHEN event_type = 'onboarding_step_completed' AND (event_data->>'step') = 'complete' THEN created_at END) as onboarding_completed_at,
    MIN(CASE WHEN event_type = 'direction_finder_viewed' THEN created_at END) as direction_finder_viewed_at,
    MIN(CASE WHEN event_type = 'seed_started' THEN created_at END) as first_seed_started_at,
    MIN(CASE WHEN event_type = 'seed_completed' THEN created_at END) as first_seed_completed_at,
    COUNT(CASE WHEN event_type = 'seed_completed' THEN 1 END) as total_seeds_completed
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT 
  COUNT(*) as users_completed_onboarding,
  COUNT(direction_finder_viewed_at) as viewed_direction_finder,
  COUNT(first_seed_started_at) as started_first_seed,
  COUNT(first_seed_completed_at) as completed_first_seed,
  COUNT(*) FILTER (WHERE total_seeds_completed >= 3) as completed_3_plus_seeds,
  -- Conversion rates
  ROUND(COUNT(direction_finder_viewed_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_onboarding_to_direction_finder,
  ROUND(COUNT(first_seed_started_at)::numeric / NULLIF(COUNT(direction_finder_viewed_at), 0) * 100, 2) as pct_direction_finder_to_seed,
  ROUND(COUNT(first_seed_completed_at)::numeric / NULLIF(COUNT(first_seed_started_at), 0) * 100, 2) as pct_seed_completion,
  -- Time to first seed
  AVG(EXTRACT(EPOCH FROM (first_seed_started_at - onboarding_completed_at))/3600)::numeric(10,2) as avg_hours_to_first_seed
FROM seed_funnel
WHERE onboarding_completed_at IS NOT NULL;

-- ============================================
-- 3. PORTFOLIO BUILDING FUNNEL
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_portfolio_funnel AS
WITH portfolio_funnel AS (
  SELECT 
    user_id,
    MIN(CASE WHEN event_type = 'mobile_app_opened' THEN created_at END) as first_app_open,
    MIN(CASE WHEN event_type = 'portfolio_item_added' THEN created_at END) as first_portfolio_add,
    COUNT(CASE WHEN event_type = 'portfolio_item_added' THEN 1 END) as total_items_added,
    MIN(CASE WHEN event_type = 'admission_plan_created' THEN created_at END) as first_admission_plan
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_users,
  COUNT(first_portfolio_add) as added_portfolio_item,
  COUNT(*) FILTER (WHERE total_items_added >= 3) as added_3_plus_items,
  COUNT(first_admission_plan) as created_admission_plan,
  -- Conversion rates
  ROUND(COUNT(first_portfolio_add)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_users_with_portfolio,
  ROUND(COUNT(*) FILTER (WHERE total_items_added >= 3)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_users_with_3_plus_items,
  ROUND(COUNT(first_admission_plan)::numeric / NULLIF(COUNT(first_portfolio_add), 0) * 100, 2) as pct_portfolio_to_plan,
  AVG(total_items_added)::numeric(10,2) as avg_portfolio_items_per_user
FROM portfolio_funnel;

-- ============================================
-- 4. PROGRAM EXPLORATION FUNNEL
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_program_exploration_funnel AS
WITH program_funnel AS (
  SELECT 
    user_id,
    MIN(CASE WHEN event_type = 'program_viewed' THEN created_at END) as first_program_view,
    COUNT(CASE WHEN event_type = 'program_viewed' THEN 1 END) as total_programs_viewed,
    COUNT(DISTINCT CASE WHEN event_type = 'program_viewed' THEN event_data->>'program_id' END) as unique_programs_viewed,
    MIN(CASE WHEN event_type = 'program_saved' THEN created_at END) as first_program_saved,
    COUNT(CASE WHEN event_type = 'program_saved' THEN 1 END) as total_programs_saved,
    MIN(CASE WHEN event_type = 'fit_score_viewed' THEN created_at END) as first_fit_score_viewed
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_users,
  COUNT(first_program_view) as viewed_program,
  COUNT(first_program_saved) as saved_program,
  COUNT(first_fit_score_viewed) as viewed_fit_scores,
  -- Engagement metrics
  AVG(total_programs_viewed)::numeric(10,2) as avg_programs_viewed_per_user,
  AVG(unique_programs_viewed)::numeric(10,2) as avg_unique_programs_viewed,
  AVG(total_programs_saved)::numeric(10,2) as avg_programs_saved_per_user,
  -- Conversion rates
  ROUND(COUNT(first_program_view)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_users_viewed_programs,
  ROUND(COUNT(first_program_saved)::numeric / NULLIF(COUNT(first_program_view), 0) * 100, 2) as pct_view_to_save,
  ROUND(COUNT(first_fit_score_viewed)::numeric / NULLIF(COUNT(first_program_view), 0) * 100, 2) as pct_view_to_fit_score
FROM program_funnel;

-- ============================================
-- 5. COMPLETE USER JOURNEY FUNNEL
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_complete_user_journey AS
WITH user_journey AS (
  SELECT 
    user_id,
    MIN(CASE WHEN event_type = 'mobile_app_opened' THEN created_at END) as first_app_open,
    MIN(CASE WHEN event_type = 'onboarding_started' THEN created_at END) as onboarding_started,
    MIN(CASE WHEN event_type = 'onboarding_step_completed' AND (event_data->>'step') = 'complete' THEN created_at END) as onboarding_completed,
    MIN(CASE WHEN event_type = 'seed_completed' THEN created_at END) as first_seed_completed,
    MIN(CASE WHEN event_type = 'portfolio_item_added' THEN created_at END) as first_portfolio_item,
    MIN(CASE WHEN event_type = 'program_saved' THEN created_at END) as first_program_saved,
    COUNT(CASE WHEN event_type = 'seed_completed' THEN 1 END) as total_seeds_completed,
    COUNT(CASE WHEN event_type = 'portfolio_item_added' THEN 1 END) as total_portfolio_items,
    MAX(created_at) as last_activity
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
),
journey_stages AS (
  SELECT 
    user_id,
    first_app_open,
    -- Stage 1: Onboarding completed
    CASE WHEN onboarding_completed IS NOT NULL THEN 1 ELSE 0 END as stage_1_onboarding,
    -- Stage 2: First seed completed
    CASE WHEN first_seed_completed IS NOT NULL THEN 1 ELSE 0 END as stage_2_first_seed,
    -- Stage 3: Multiple seeds (3+)
    CASE WHEN total_seeds_completed >= 3 THEN 1 ELSE 0 END as stage_3_engaged,
    -- Stage 4: Portfolio created
    CASE WHEN first_portfolio_item IS NOT NULL THEN 1 ELSE 0 END as stage_4_portfolio,
    -- Stage 5: Program saved (high intent)
    CASE WHEN first_program_saved IS NOT NULL THEN 1 ELSE 0 END as stage_5_high_intent,
    -- Days from app open to each stage
    EXTRACT(DAY FROM (onboarding_completed - first_app_open)) as days_to_onboarding,
    EXTRACT(DAY FROM (first_seed_completed - first_app_open)) as days_to_first_seed,
    EXTRACT(DAY FROM (first_portfolio_item - first_app_open)) as days_to_portfolio,
    EXTRACT(DAY FROM (first_program_saved - first_app_open)) as days_to_program_save,
    total_seeds_completed,
    total_portfolio_items
  FROM user_journey
)
SELECT 
  COUNT(*) as total_users,
  SUM(stage_1_onboarding) as completed_onboarding,
  SUM(stage_2_first_seed) as completed_first_seed,
  SUM(stage_3_engaged) as became_engaged,
  SUM(stage_4_portfolio) as created_portfolio,
  SUM(stage_5_high_intent) as showed_high_intent,
  -- Conversion rates between stages
  ROUND(SUM(stage_1_onboarding)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_app_to_onboarding,
  ROUND(SUM(stage_2_first_seed)::numeric / NULLIF(SUM(stage_1_onboarding), 0) * 100, 2) as pct_onboarding_to_seed,
  ROUND(SUM(stage_3_engaged)::numeric / NULLIF(SUM(stage_2_first_seed), 0) * 100, 2) as pct_seed_to_engaged,
  ROUND(SUM(stage_4_portfolio)::numeric / NULLIF(SUM(stage_3_engaged), 0) * 100, 2) as pct_engaged_to_portfolio,
  ROUND(SUM(stage_5_high_intent)::numeric / NULLIF(SUM(stage_4_portfolio), 0) * 100, 2) as pct_portfolio_to_high_intent,
  -- Time to convert
  AVG(days_to_onboarding) FILTER (WHERE stage_1_onboarding = 1)::numeric(10,2) as avg_days_to_onboarding,
  AVG(days_to_first_seed) FILTER (WHERE stage_2_first_seed = 1)::numeric(10,2) as avg_days_to_first_seed,
  AVG(days_to_portfolio) FILTER (WHERE stage_4_portfolio = 1)::numeric(10,2) as avg_days_to_portfolio,
  AVG(days_to_program_save) FILTER (WHERE stage_5_high_intent = 1)::numeric(10,2) as avg_days_to_high_intent,
  -- Engagement levels
  AVG(total_seeds_completed)::numeric(10,2) as avg_seeds_per_user,
  AVG(total_portfolio_items)::numeric(10,2) as avg_portfolio_per_user
FROM journey_stages;

-- ============================================
-- 6. FUNNEL CONVERSION BY COHORT
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_funnel_by_cohort AS
WITH user_cohorts AS (
  SELECT 
    user_id,
    cohort_week
  FROM analytics_user_cohorts
  WHERE cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
),
user_achievements AS (
  SELECT 
    user_id,
    MAX(CASE WHEN event_type = 'onboarding_step_completed' AND (event_data->>'step') = 'complete' THEN 1 ELSE 0 END) as completed_onboarding,
    MAX(CASE WHEN event_type = 'seed_completed' THEN 1 ELSE 0 END) as completed_seed,
    COUNT(CASE WHEN event_type = 'seed_completed' THEN 1 END) as seeds_completed,
    MAX(CASE WHEN event_type = 'portfolio_item_added' THEN 1 ELSE 0 END) as added_portfolio,
    MAX(CASE WHEN event_type = 'program_saved' THEN 1 ELSE 0 END) as saved_program
  FROM public.user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY user_id
)
SELECT 
  uc.cohort_week,
  COUNT(DISTINCT uc.user_id) as cohort_size,
  SUM(ua.completed_onboarding) as completed_onboarding,
  SUM(ua.completed_seed) as completed_first_seed,
  SUM(CASE WHEN ua.seeds_completed >= 3 THEN 1 ELSE 0 END) as became_engaged,
  SUM(ua.added_portfolio) as added_portfolio,
  SUM(ua.saved_program) as saved_program,
  -- Cohort conversion rates
  ROUND(SUM(ua.completed_onboarding)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_onboarding,
  ROUND(SUM(ua.completed_seed)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_first_seed,
  ROUND(SUM(CASE WHEN ua.seeds_completed >= 3 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_engaged,
  ROUND(SUM(ua.added_portfolio)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_portfolio,
  ROUND(SUM(ua.saved_program)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as pct_program_save
FROM user_cohorts uc
LEFT JOIN user_achievements ua ON uc.user_id = ua.user_id
GROUP BY uc.cohort_week
ORDER BY uc.cohort_week DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_funnel_by_cohort 
ON analytics_funnel_by_cohort(cohort_week);

-- ============================================
-- 7. FUNNEL SUMMARY VIEW
-- ============================================
CREATE OR REPLACE VIEW analytics_funnel_summary AS
SELECT 
  CURRENT_DATE as report_date,
  -- Onboarding funnel
  (SELECT step_1_app_opened FROM analytics_onboarding_funnel) as total_app_opens,
  (SELECT step_5_onboarding_completed FROM analytics_onboarding_funnel) as onboarding_completed,
  (SELECT pct_overall_conversion FROM analytics_onboarding_funnel) as onboarding_conversion_pct,
  -- Seed adoption
  (SELECT users_completed_onboarding FROM analytics_seed_adoption_funnel) as users_ready_for_seeds,
  (SELECT completed_first_seed FROM analytics_seed_adoption_funnel) as completed_first_seed,
  (SELECT pct_seed_completion FROM analytics_seed_adoption_funnel) as seed_completion_pct,
  -- Portfolio
  (SELECT added_portfolio_item FROM analytics_portfolio_funnel) as users_with_portfolio,
  (SELECT pct_users_with_portfolio FROM analytics_portfolio_funnel) as portfolio_adoption_pct,
  -- Complete journey
  (SELECT total_users FROM analytics_complete_user_journey) as total_tracked_users,
  (SELECT completed_onboarding FROM analytics_complete_user_journey) as journey_onboarding,
  (SELECT became_engaged FROM analytics_complete_user_journey) as journey_engaged,
  (SELECT showed_high_intent FROM analytics_complete_user_journey) as journey_high_intent,
  -- Key metric: What % of new users become engaged?
  ROUND(
    (SELECT became_engaged FROM analytics_complete_user_journey)::numeric / 
    NULLIF((SELECT total_users FROM analytics_complete_user_journey), 0) * 100,
    2
  ) as overall_engagement_rate;
