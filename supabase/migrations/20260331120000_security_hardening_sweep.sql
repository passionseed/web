BEGIN;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_instructor(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid
      AND role IN ('admin', 'instructor', 'teacher', 'TA', 'ta')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_instructor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_access_classroom(lookup_classroom_id uuid, lookup_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classrooms c
    WHERE c.id = lookup_classroom_id
      AND (
        c.instructor_id = lookup_user_id
        OR public.is_classroom_member(lookup_classroom_id, lookup_user_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_classroom(uuid, uuid) TO authenticated;

-- =====================================================
-- REVOKE OVER-BROAD ACCESS ON SENSITIVE / ADMIN VIEWS
-- =====================================================

REVOKE ALL ON TABLE public.user_planner_status FROM anon, authenticated;
REVOKE ALL ON TABLE public.model_performance_stats FROM anon, authenticated;
REVOKE ALL ON TABLE public.generation_stats_hourly FROM anon, authenticated;
REVOKE ALL ON TABLE public.generation_stats_daily FROM anon, authenticated;
REVOKE ALL ON TABLE public.cache_effectiveness_stats FROM anon, authenticated;
REVOKE ALL ON TABLE public.error_analysis FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_daily_unique_visitors FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_hourly_visitors FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_top_referrers FROM anon, authenticated;

GRANT SELECT ON TABLE public.model_performance_stats TO authenticated;
GRANT SELECT ON TABLE public.generation_stats_hourly TO authenticated;
GRANT SELECT ON TABLE public.generation_stats_daily TO authenticated;
GRANT SELECT ON TABLE public.cache_effectiveness_stats TO authenticated;
GRANT SELECT ON TABLE public.error_analysis TO authenticated;
GRANT SELECT ON TABLE public.hackathon_daily_unique_visitors TO authenticated;
GRANT SELECT ON TABLE public.hackathon_hourly_visitors TO authenticated;
GRANT SELECT ON TABLE public.hackathon_top_referrers TO authenticated;

-- =====================================================
-- FIX SECURITY DEFINER / EXPOSED VIEWS
-- =====================================================

DROP VIEW IF EXISTS public.team_members_with_profiles;
CREATE OR REPLACE VIEW public.team_members_with_profiles
WITH (security_invoker = true) AS
SELECT
  tm.*,
  p.username,
  p.full_name,
  p.avatar_url,
  ct.classroom_id
FROM public.team_memberships tm
JOIN public.profiles p ON p.id = tm.user_id
JOIN public.classroom_teams ct ON ct.id = tm.team_id
WHERE ct.is_active = true;

GRANT SELECT ON TABLE public.team_members_with_profiles TO authenticated;

DROP VIEW IF EXISTS public.students_without_teams;
CREATE OR REPLACE VIEW public.students_without_teams
WITH (security_invoker = true) AS
SELECT
  cm.classroom_id,
  cm.user_id,
  p.username,
  p.full_name,
  p.avatar_url
FROM public.classroom_memberships cm
JOIN public.profiles p ON p.id = cm.user_id
WHERE cm.role = 'student'
  AND NOT EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    JOIN public.classroom_teams ct ON ct.id = tm.team_id
    WHERE tm.user_id = cm.user_id
      AND ct.classroom_id = cm.classroom_id
      AND ct.is_active = true
      AND tm.left_at IS NULL
  );

GRANT SELECT ON TABLE public.students_without_teams TO authenticated;

DROP VIEW IF EXISTS public.model_performance_stats;
CREATE OR REPLACE VIEW public.model_performance_stats
WITH (security_invoker = true) AS
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
FROM public.direction_finder_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model_provider, model_name
ORDER BY avg_time_ms ASC NULLS LAST;

DROP VIEW IF EXISTS public.generation_stats_hourly;
CREATE OR REPLACE VIEW public.generation_stats_hourly
WITH (security_invoker = true) AS
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
FROM public.direction_finder_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

DROP VIEW IF EXISTS public.generation_stats_daily;
CREATE OR REPLACE VIEW public.generation_stats_daily
WITH (security_invoker = true) AS
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
FROM public.direction_finder_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

DROP VIEW IF EXISTS public.cache_effectiveness_stats;
CREATE OR REPLACE VIEW public.cache_effectiveness_stats
WITH (security_invoker = true) AS
SELECT
  dfr.answers_hash,
  dfr.model_name,
  COUNT(*) as usage_count,
  MAX(dfr.cache_hit_count) as max_cache_hits,
  AVG(dfm.total_generation_time_ms) as avg_fresh_generation_time_ms,
  MIN(dfr.created_at) as first_seen,
  MAX(dfr.created_at) as last_seen,
  LEFT(dfr.answers::text, 100) || '...' as sample_answers
FROM public.direction_finder_results dfr
LEFT JOIN public.direction_finder_metrics dfm ON dfr.id = dfm.result_id
WHERE dfr.cache_key IS NOT NULL
  AND dfr.created_at > NOW() - INTERVAL '7 days'
GROUP BY dfr.answers_hash, dfr.model_name, dfr.answers
HAVING COUNT(*) > 1
ORDER BY usage_count DESC, max_cache_hits DESC
LIMIT 50;

DROP VIEW IF EXISTS public.error_analysis;
CREATE OR REPLACE VIEW public.error_analysis
WITH (security_invoker = true) AS
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
FROM public.direction_finder_metrics
WHERE error_message IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY model_provider, model_name, error_message
ORDER BY error_count DESC, last_occurrence DESC;

DROP VIEW IF EXISTS public.hackathon_daily_unique_visitors;
CREATE OR REPLACE VIEW public.hackathon_daily_unique_visitors
WITH (security_invoker = true) AS
SELECT
  DATE(viewed_at) as date,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(*) as total_page_views,
  COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE participant_id IS NOT NULL) as logged_in_visitors,
  COUNT(DISTINCT visitor_fingerprint) FILTER (WHERE participant_id IS NULL) as anonymous_visitors,
  COUNT(DISTINCT participant_id) FILTER (WHERE participant_id IS NOT NULL) as unique_logged_in_users
FROM public.hackathon_page_views
WHERE viewed_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(viewed_at)
ORDER BY date DESC;

DROP VIEW IF EXISTS public.hackathon_hourly_visitors;
CREATE OR REPLACE VIEW public.hackathon_hourly_visitors
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('hour', viewed_at) as hour,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(*) as total_page_views,
  COUNT(DISTINCT referrer) FILTER (WHERE referrer IS NOT NULL AND referrer != '') as unique_referrers
FROM public.hackathon_page_views
WHERE viewed_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', viewed_at)
ORDER BY hour DESC;

DROP VIEW IF EXISTS public.hackathon_top_referrers;
CREATE OR REPLACE VIEW public.hackathon_top_referrers
WITH (security_invoker = true) AS
SELECT
  COALESCE(NULLIF(referrer, ''), 'Direct/None') as referrer_source,
  COUNT(DISTINCT visitor_fingerprint) as unique_visitors,
  COUNT(*) as total_visits,
  MIN(viewed_at) as first_visit,
  MAX(viewed_at) as last_visit
FROM public.hackathon_page_views
WHERE viewed_at > NOW() - INTERVAL '30 days'
GROUP BY referrer
ORDER BY unique_visitors DESC
LIMIT 20;

DROP VIEW IF EXISTS public.program_career_mapping_details;
CREATE OR REPLACE VIEW public.program_career_mapping_details
WITH (security_invoker = true) AS
SELECT
  pcm.id AS mapping_id,
  pcm.program_id,
  tp.program_name,
  tp.program_name_en,
  tp.faculty_name,
  tu.university_name,
  pcm.career_id,
  j.title AS career_title,
  j.category AS career_category,
  pcm.confidence,
  pcm.mapping_reason,
  pcm.created_at,
  pcm.updated_at
FROM public.program_career_mappings pcm
JOIN public.tcas_programs tp ON pcm.program_id = tp.id
JOIN public.tcas_universities tu ON tp.university_id = tu.university_id
JOIN public.jobs j ON pcm.career_id = j.id;

GRANT SELECT ON TABLE public.program_career_mapping_details TO authenticated, anon;

-- Remove auth.users exposure from public API surface.
DROP VIEW IF EXISTS public.user_planner_status;

-- =====================================================
-- HACKATHON TOKEN TABLES: SERVER-ONLY
-- =====================================================

REVOKE ALL ON TABLE public.hackathon_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_password_resets FROM anon, authenticated;

ALTER TABLE public.hackathon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_no_access_hackathon_sessions" ON public.hackathon_sessions;
CREATE POLICY "authenticated_no_access_hackathon_sessions"
  ON public.hackathon_sessions
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "authenticated_no_access_hackathon_password_resets" ON public.hackathon_password_resets;
CREATE POLICY "authenticated_no_access_hackathon_password_resets"
  ON public.hackathon_password_resets
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- =====================================================
-- CORE TABLE HARDENING
-- =====================================================

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_node_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_map_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_map_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_program_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_phase_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_team_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_activity_individual_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_activity_team_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_activity_ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_activity_mentor_reviews ENABLE ROW LEVEL SECURITY;

-- ========================================
-- REVOKE TABLE ACCESS BEFORE RE-GRANTING
-- ========================================

REVOKE ALL ON TABLE public.classrooms FROM anon, authenticated;
REVOKE ALL ON TABLE public.classroom_maps FROM anon, authenticated;
REVOKE ALL ON TABLE public.classroom_teams FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_memberships FROM anon, authenticated;
REVOKE ALL ON TABLE public.learning_maps FROM anon, authenticated;
REVOKE ALL ON TABLE public.map_nodes FROM anon, authenticated;
REVOKE ALL ON TABLE public.node_content FROM anon, authenticated;
REVOKE ALL ON TABLE public.node_paths FROM anon, authenticated;
REVOKE ALL ON TABLE public.quiz_questions FROM anon, authenticated;
REVOKE ALL ON TABLE public.student_node_progress FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_map_enrollments FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.interests FROM anon, authenticated;
REVOKE ALL ON TABLE public.classroom_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.assignment_enrollments FROM anon, authenticated;
REVOKE ALL ON TABLE public.assignment_groups FROM anon, authenticated;
REVOKE ALL ON TABLE public.assignment_group_members FROM anon, authenticated;
REVOKE ALL ON TABLE public.assignment_group_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.submission_grades FROM anon, authenticated;
REVOKE ALL ON TABLE public.chat_messages FROM anon, authenticated;
REVOKE ALL ON TABLE public.workshop_comments FROM anon, authenticated;
REVOKE ALL ON TABLE public.workshop_votes FROM anon, authenticated;
REVOKE ALL ON TABLE public.workshop_suggestions FROM anon, authenticated;
REVOKE ALL ON TABLE public.cohorts FROM anon, authenticated;
REVOKE ALL ON TABLE public.cohort_map_enrollments FROM anon, authenticated;
REVOKE ALL ON TABLE public.classroom_groups FROM anon, authenticated;
REVOKE ALL ON TABLE public.group_memberships FROM anon, authenticated;
REVOKE ALL ON TABLE public.node_leaderboard FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_programs FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_program_phases FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_phase_playlists FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_phase_modules FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_team_program_enrollments FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_activity_individual_submissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_activity_team_submissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_activity_ai_reviews FROM anon, authenticated;
REVOKE ALL ON TABLE public.hackathon_activity_mentor_reviews FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classrooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classroom_maps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classroom_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.learning_maps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.map_nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.node_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.node_paths TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_node_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_map_enrollments TO authenticated;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.interests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.classroom_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignment_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignment_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignment_group_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assignment_group_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.submission_grades TO authenticated;

-- ========================================
-- DROP OLD POLICIES BEFORE RECREATING
-- ========================================

DROP POLICY IF EXISTS "users_access_classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Users can view accessible classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Users can manage their own classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "users_view_classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "instructors_manage_own_classrooms" ON public.classrooms;

DROP POLICY IF EXISTS "students_view_classroom_maps" ON public.classroom_maps;
DROP POLICY IF EXISTS "Users can view classroom maps" ON public.classroom_maps;
DROP POLICY IF EXISTS "anon_users_can_view_classroom_maps" ON public.classroom_maps;
DROP POLICY IF EXISTS "authenticated_users_can_view_classroom_maps" ON public.classroom_maps;
DROP POLICY IF EXISTS "instructors_manage_classroom_maps" ON public.classroom_maps;

DROP POLICY IF EXISTS "Users can view teams in their classrooms" ON public.classroom_teams;
DROP POLICY IF EXISTS "Instructors can manage classroom teams" ON public.classroom_teams;
DROP POLICY IF EXISTS "Classroom members can create teams" ON public.classroom_teams;
DROP POLICY IF EXISTS "Users can view classroom teams" ON public.classroom_teams;
DROP POLICY IF EXISTS "Instructors can manage their classroom teams" ON public.classroom_teams;
DROP POLICY IF EXISTS "delete_teams_in_classroom" ON public.classroom_teams;
DROP POLICY IF EXISTS "update_teams_in_classroom" ON public.classroom_teams;

DROP POLICY IF EXISTS "Users can view relevant team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Users can manage team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Users can manage their own team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "instructors_manage_team_memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "join_teams_in_classroom" ON public.team_memberships;
DROP POLICY IF EXISTS "leave_own_team" ON public.team_memberships;
DROP POLICY IF EXISTS "update_own_team_membership" ON public.team_memberships;
DROP POLICY IF EXISTS "view_team_memberships_in_classroom" ON public.team_memberships;

DROP POLICY IF EXISTS "Users can view public maps and their own maps" ON public.learning_maps;
DROP POLICY IF EXISTS "Users can create and manage their own maps" ON public.learning_maps;
DROP POLICY IF EXISTS "create_maps_policy" ON public.learning_maps;
DROP POLICY IF EXISTS "delete_maps_policy" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_delete_creator_or_instructor" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_delete_secure" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_insert_authenticated" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_select_public" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_update_creator_editor_or_instructor" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_update_secure" ON public.learning_maps;
DROP POLICY IF EXISTS "update_maps_policy" ON public.learning_maps;
DROP POLICY IF EXISTS "view_maps_policy" ON public.learning_maps;

DROP POLICY IF EXISTS "Users can view nodes of accessible maps" ON public.map_nodes;
DROP POLICY IF EXISTS "Users can manage nodes of their own maps" ON public.map_nodes;
DROP POLICY IF EXISTS "map_nodes_delete_creator_editor_or_instructor" ON public.map_nodes;
DROP POLICY IF EXISTS "map_nodes_insert_creator_editor_or_instructor" ON public.map_nodes;
DROP POLICY IF EXISTS "map_nodes_update_creator_editor_or_instructor" ON public.map_nodes;

DROP POLICY IF EXISTS "Users can view content for accessible nodes" ON public.node_content;
DROP POLICY IF EXISTS "creators_and_editors_can_delete_content" ON public.node_content;
DROP POLICY IF EXISTS "creators_and_editors_can_insert_content" ON public.node_content;
DROP POLICY IF EXISTS "creators_and_editors_can_update_content" ON public.node_content;

DROP POLICY IF EXISTS "creators_and_editors_can_delete_paths" ON public.node_paths;
DROP POLICY IF EXISTS "creators_and_editors_can_insert_paths" ON public.node_paths;
DROP POLICY IF EXISTS "Users can view node paths for accessible maps" ON public.node_paths;

DROP POLICY IF EXISTS "creators_and_editors_can_delete_quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "creators_and_editors_can_insert_quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "creators_and_editors_can_update_quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Users can view quiz questions for accessible assessments" ON public.quiz_questions;

DROP POLICY IF EXISTS "members_can_view_progress" ON public.student_node_progress;
DROP POLICY IF EXISTS "users_can_manage_own_progress" ON public.student_node_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.student_node_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.student_node_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.student_node_progress;
DROP POLICY IF EXISTS "Instructors and Admins can view all progress" ON public.student_node_progress;

DROP POLICY IF EXISTS "Users can manage their own map enrollments" ON public.user_map_enrollments;
DROP POLICY IF EXISTS "Users can create their own map enrollments" ON public.user_map_enrollments;
DROP POLICY IF EXISTS "Users can update their own map enrollments" ON public.user_map_enrollments;
DROP POLICY IF EXISTS "Users can view their own map enrollments" ON public.user_map_enrollments;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users can delete their own interests" ON public.interests;
DROP POLICY IF EXISTS "Users can update their own interests" ON public.interests;
DROP POLICY IF EXISTS "can create" ON public.interests;
DROP POLICY IF EXISTS "view interests" ON public.interests;

DROP POLICY IF EXISTS "students_view_published_assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "creators_manage_assignments" ON public.classroom_assignments;

DROP POLICY IF EXISTS "Instructors can manage assignment groups" ON public.assignment_groups;
DROP POLICY IF EXISTS "Students can view assignment groups" ON public.assignment_groups;
DROP POLICY IF EXISTS "Allow all operations with app-level permissions" ON public.assignment_group_members;
DROP POLICY IF EXISTS "Group members can view group assignments" ON public.assignment_group_assignments;
DROP POLICY IF EXISTS "Instructors can manage group assignments" ON public.assignment_group_assignments;

DROP POLICY IF EXISTS "instructors_can_manage_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "students_can_view_own_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "anon_users_can_view_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "authenticated_users_full_access_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "instructors_and_admins_create_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "instructors_and_admins_update_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "instructors_and_admins_view_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "instructors_can_manage_grades" ON public.submission_grades;
DROP POLICY IF EXISTS "students_can_view_own_grades" ON public.submission_grades;

-- ========================================
-- RECREATE POLICIES
-- ========================================

CREATE POLICY "users_access_classrooms" ON public.classrooms
FOR SELECT TO authenticated
USING (public.can_access_classroom(id, auth.uid()));

CREATE POLICY "instructors_manage_own_classrooms" ON public.classrooms
FOR ALL TO authenticated
USING (instructor_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (instructor_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "users_view_classroom_maps" ON public.classroom_maps
FOR SELECT TO authenticated
USING (
  is_active = true
  AND public.can_access_classroom(classroom_id, auth.uid())
);

CREATE POLICY "instructors_manage_classroom_maps" ON public.classroom_maps
FOR ALL TO authenticated
USING (
  public.is_classroom_instructor(classroom_id) OR public.is_admin(auth.uid())
)
WITH CHECK (
  public.is_classroom_instructor(classroom_id) OR public.is_admin(auth.uid())
);

CREATE POLICY "users_view_classroom_teams" ON public.classroom_teams
FOR SELECT TO authenticated
USING (
  is_active = true
  AND public.can_access_classroom(classroom_id, auth.uid())
);

CREATE POLICY "users_manage_classroom_teams" ON public.classroom_teams
FOR ALL TO authenticated
USING (
  public.is_classroom_instructor(classroom_id)
  OR public.is_admin(auth.uid())
  OR (
    created_by = auth.uid()
    AND public.can_access_classroom(classroom_id, auth.uid())
  )
)
WITH CHECK (
  public.is_classroom_instructor(classroom_id)
  OR public.is_admin(auth.uid())
  OR (
    created_by = auth.uid()
    AND public.can_access_classroom(classroom_id, auth.uid())
  )
);

CREATE POLICY "view_team_memberships_in_classroom" ON public.team_memberships
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.classroom_teams ct
    WHERE ct.id = team_memberships.team_id
      AND public.can_access_classroom(ct.classroom_id, auth.uid())
  )
);

CREATE POLICY "manage_team_memberships_in_classroom" ON public.team_memberships
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.classroom_teams ct
    WHERE ct.id = team_memberships.team_id
      AND (
        public.is_classroom_instructor(ct.classroom_id)
        OR public.is_admin(auth.uid())
      )
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.classroom_teams ct
    WHERE ct.id = team_memberships.team_id
      AND (
        public.is_classroom_instructor(ct.classroom_id)
        OR public.is_admin(auth.uid())
      )
  )
);

CREATE POLICY "view_maps_policy" ON public.learning_maps
FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR creator_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classroom_maps cm
    WHERE cm.map_id = learning_maps.id
      AND cm.is_active = true
      AND public.can_access_classroom(cm.classroom_id, auth.uid())
  )
);

CREATE POLICY "manage_maps_policy" ON public.learning_maps
FOR ALL TO authenticated
USING (
  creator_id = auth.uid() OR public.is_admin(auth.uid())
)
WITH CHECK (
  creator_id = auth.uid() OR public.is_admin(auth.uid())
);

CREATE POLICY "view_map_nodes_policy" ON public.map_nodes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.learning_maps lm
    WHERE lm.id = map_nodes.map_id
      AND (
        lm.visibility = 'public'
        OR lm.creator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.classroom_maps cm
          WHERE cm.map_id = lm.id
            AND cm.is_active = true
            AND public.can_access_classroom(cm.classroom_id, auth.uid())
        )
      )
  )
);

CREATE POLICY "manage_map_nodes_policy" ON public.map_nodes
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.learning_maps lm
    WHERE lm.id = map_nodes.map_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.learning_maps lm
    WHERE lm.id = map_nodes.map_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "view_node_content_policy" ON public.node_content
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE mn.id = node_content.node_id
      AND (
        lm.visibility = 'public'
        OR lm.creator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.classroom_maps cm
          WHERE cm.map_id = lm.id
            AND cm.is_active = true
            AND public.can_access_classroom(cm.classroom_id, auth.uid())
        )
      )
  )
);

CREATE POLICY "manage_node_content_policy" ON public.node_content
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE mn.id = node_content.node_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE mn.id = node_content.node_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "view_node_paths_policy" ON public.node_paths
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE mn.id = node_paths.source_node_id
      AND (
        lm.visibility = 'public'
        OR lm.creator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.classroom_maps cm
          WHERE cm.map_id = lm.id
            AND cm.is_active = true
            AND public.can_access_classroom(cm.classroom_id, auth.uid())
        )
      )
  )
);

CREATE POLICY "manage_node_paths_policy" ON public.node_paths
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE mn.id = node_paths.source_node_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE mn.id = node_paths.source_node_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "view_quiz_questions_policy" ON public.quiz_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.node_assessments na
    JOIN public.map_nodes mn ON mn.id = na.node_id
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE na.id = quiz_questions.assessment_id
      AND (
        lm.visibility = 'public'
        OR lm.creator_id = auth.uid()
        OR public.is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.classroom_maps cm
          WHERE cm.map_id = lm.id
            AND cm.is_active = true
            AND public.can_access_classroom(cm.classroom_id, auth.uid())
        )
      )
  )
);

CREATE POLICY "manage_quiz_questions_policy" ON public.quiz_questions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.node_assessments na
    JOIN public.map_nodes mn ON mn.id = na.node_id
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE na.id = quiz_questions.assessment_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.node_assessments na
    JOIN public.map_nodes mn ON mn.id = na.node_id
    JOIN public.learning_maps lm ON lm.id = mn.map_id
    WHERE na.id = quiz_questions.assessment_id
      AND (lm.creator_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "view_progress_policy" ON public.student_node_progress
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.map_nodes mn
    JOIN public.classroom_maps cm ON cm.map_id = mn.map_id
    WHERE mn.id = student_node_progress.node_id
      AND public.is_classroom_instructor(cm.classroom_id)
  )
);

CREATE POLICY "manage_own_progress_policy" ON public.student_node_progress
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_progress_policy" ON public.student_node_progress
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_view_own_map_enrollments" ON public.user_map_enrollments
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "users_manage_own_map_enrollments" ON public.user_map_enrollments
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "users_read_own_roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "users_view_interests" ON public.interests
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "users_manage_own_interests" ON public.interests
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "view_classroom_assignments_policy" ON public.classroom_assignments
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_classroom_instructor(classroom_id)
  OR (
    is_published = true
    AND public.can_access_classroom(classroom_id, auth.uid())
  )
);

CREATE POLICY "manage_classroom_assignments_policy" ON public.classroom_assignments
FOR ALL TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_classroom_instructor(classroom_id)
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_classroom_instructor(classroom_id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "view_assignment_enrollments_policy" ON public.assignment_enrollments
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = assignment_enrollments.assignment_id
      AND public.is_classroom_instructor(ca.classroom_id)
  )
);

CREATE POLICY "manage_assignment_enrollments_policy" ON public.assignment_enrollments
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = assignment_enrollments.assignment_id
      AND public.is_classroom_instructor(ca.classroom_id)
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = assignment_enrollments.assignment_id
      AND public.is_classroom_instructor(ca.classroom_id)
  )
);

CREATE POLICY "view_assignment_groups_policy" ON public.assignment_groups
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_classroom_instructor(classroom_id)
  OR (
    is_active = true
    AND public.can_access_classroom(classroom_id, auth.uid())
  )
);

CREATE POLICY "manage_assignment_groups_policy" ON public.assignment_groups
FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid()) OR public.is_classroom_instructor(classroom_id)
)
WITH CHECK (
  public.is_admin(auth.uid()) OR public.is_classroom_instructor(classroom_id)
);

CREATE POLICY "view_assignment_group_members_policy" ON public.assignment_group_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assignment_groups ag
    WHERE ag.id = assignment_group_members.group_id
      AND (
        public.is_classroom_instructor(ag.classroom_id)
        OR public.can_access_classroom(ag.classroom_id, auth.uid())
      )
  )
);

CREATE POLICY "manage_assignment_group_members_policy" ON public.assignment_group_members
FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assignment_groups ag
    WHERE ag.id = assignment_group_members.group_id
      AND public.is_classroom_instructor(ag.classroom_id)
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assignment_groups ag
    WHERE ag.id = assignment_group_members.group_id
      AND public.is_classroom_instructor(ag.classroom_id)
  )
);

CREATE POLICY "view_assignment_group_assignments_policy" ON public.assignment_group_assignments
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assignment_group_members agm
    WHERE agm.group_id = assignment_group_assignments.group_id
      AND agm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = assignment_group_assignments.assignment_id
      AND public.is_classroom_instructor(ca.classroom_id)
  )
);

CREATE POLICY "manage_assignment_group_assignments_policy" ON public.assignment_group_assignments
FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = assignment_group_assignments.assignment_id
      AND public.is_classroom_instructor(ca.classroom_id)
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.classroom_assignments ca
    WHERE ca.id = assignment_group_assignments.assignment_id
      AND public.is_classroom_instructor(ca.classroom_id)
  )
);

CREATE POLICY "view_submission_grades_policy" ON public.submission_grades
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assessment_submissions asub
    JOIN public.student_node_progress snp ON snp.id = asub.progress_id
    WHERE asub.id = submission_grades.submission_id
      AND snp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.assessment_submissions asub
    JOIN public.student_node_progress snp ON snp.id = asub.progress_id
    JOIN public.map_nodes mn ON mn.id = snp.node_id
    JOIN public.classroom_maps cm ON cm.map_id = mn.map_id
    WHERE asub.id = submission_grades.submission_id
      AND public.is_classroom_instructor(cm.classroom_id)
  )
);

CREATE POLICY "manage_submission_grades_policy" ON public.submission_grades
FOR ALL TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assessment_submissions asub
    JOIN public.student_node_progress snp ON snp.id = asub.progress_id
    JOIN public.map_nodes mn ON mn.id = snp.node_id
    JOIN public.classroom_maps cm ON cm.map_id = mn.map_id
    WHERE asub.id = submission_grades.submission_id
      AND public.is_classroom_instructor(cm.classroom_id)
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.assessment_submissions asub
    JOIN public.student_node_progress snp ON snp.id = asub.progress_id
    JOIN public.map_nodes mn ON mn.id = snp.node_id
    JOIN public.classroom_maps cm ON cm.map_id = mn.map_id
    WHERE asub.id = submission_grades.submission_id
      AND public.is_classroom_instructor(cm.classroom_id)
  )
);

-- ========================================
-- LEGACY / LOW-CONFIDENCE TABLES: DEFAULT CLOSED
-- ========================================

DROP POLICY IF EXISTS "deny_authenticated_chat_messages" ON public.chat_messages;
CREATE POLICY "deny_authenticated_chat_messages"
  ON public.chat_messages FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_workshop_comments" ON public.workshop_comments;
CREATE POLICY "deny_authenticated_workshop_comments"
  ON public.workshop_comments FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_workshop_votes" ON public.workshop_votes;
CREATE POLICY "deny_authenticated_workshop_votes"
  ON public.workshop_votes FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_workshop_suggestions" ON public.workshop_suggestions;
CREATE POLICY "deny_authenticated_workshop_suggestions"
  ON public.workshop_suggestions FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_cohorts" ON public.cohorts;
CREATE POLICY "deny_authenticated_cohorts"
  ON public.cohorts FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_cohort_map_enrollments" ON public.cohort_map_enrollments;
CREATE POLICY "deny_authenticated_cohort_map_enrollments"
  ON public.cohort_map_enrollments FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_classroom_groups" ON public.classroom_groups;
CREATE POLICY "deny_authenticated_classroom_groups"
  ON public.classroom_groups FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_group_memberships" ON public.group_memberships;
CREATE POLICY "deny_authenticated_group_memberships"
  ON public.group_memberships FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_node_leaderboard" ON public.node_leaderboard;
CREATE POLICY "deny_authenticated_node_leaderboard"
  ON public.node_leaderboard FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_programs" ON public.hackathon_programs;
CREATE POLICY "deny_authenticated_hackathon_programs"
  ON public.hackathon_programs FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_program_phases" ON public.hackathon_program_phases;
CREATE POLICY "deny_authenticated_hackathon_program_phases"
  ON public.hackathon_program_phases FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_phase_playlists" ON public.hackathon_phase_playlists;
CREATE POLICY "deny_authenticated_hackathon_phase_playlists"
  ON public.hackathon_phase_playlists FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_phase_modules" ON public.hackathon_phase_modules;
CREATE POLICY "deny_authenticated_hackathon_phase_modules"
  ON public.hackathon_phase_modules FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_team_program_enrollments" ON public.hackathon_team_program_enrollments;
CREATE POLICY "deny_authenticated_hackathon_team_program_enrollments"
  ON public.hackathon_team_program_enrollments FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_activity_individual_submissions" ON public.hackathon_activity_individual_submissions;
CREATE POLICY "deny_authenticated_hackathon_activity_individual_submissions"
  ON public.hackathon_activity_individual_submissions FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_activity_team_submissions" ON public.hackathon_activity_team_submissions;
CREATE POLICY "deny_authenticated_hackathon_activity_team_submissions"
  ON public.hackathon_activity_team_submissions FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_activity_ai_reviews" ON public.hackathon_activity_ai_reviews;
CREATE POLICY "deny_authenticated_hackathon_activity_ai_reviews"
  ON public.hackathon_activity_ai_reviews FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny_authenticated_hackathon_activity_mentor_reviews" ON public.hackathon_activity_mentor_reviews;
CREATE POLICY "deny_authenticated_hackathon_activity_mentor_reviews"
  ON public.hackathon_activity_mentor_reviews FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMIT;
