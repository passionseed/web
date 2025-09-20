-- Fix assignment groups and related permission issues
-- This addresses "permission denied for table assignment_groups" and similar errors
-- in the classroom assignment and collaboration system

-- ========================================
-- DISABLE RLS ON ASSIGNMENT GROUP SYSTEM TABLES
-- ========================================

-- Main assignment group tables
ALTER TABLE "public"."assignment_groups" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignment_group_members" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignment_group_assignments" DISABLE ROW LEVEL SECURITY;

-- Related assignment system tables that might be affected
ALTER TABLE "public"."classroom_assignments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignment_enrollments" DISABLE ROW LEVEL SECURITY;

-- Additional team/collaboration tables that might need fixes
-- (These might already be disabled but ensuring consistency)
ALTER TABLE "public"."classroom_teams" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_memberships" DISABLE ROW LEVEL SECURITY;

-- ========================================
-- ENSURE PROPER GRANTS FOR ALL ASSIGNMENT SYSTEM TABLES
-- ========================================

-- Assignment groups system
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."assignment_groups" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."assignment_group_members" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."assignment_group_assignments" TO "authenticated";

-- Classroom assignments system
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."classroom_assignments" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."assignment_enrollments" TO "authenticated";

-- Team system (ensuring consistency)
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."classroom_teams" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."team_memberships" TO "authenticated";

-- Additional tables that might be referenced by assignment system
-- (These should already have permissions but ensuring completeness)
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."classroom_maps" TO "authenticated";

-- ========================================
-- NOTES ON AFFECTED FUNCTIONALITY
-- ========================================

-- This migration fixes the following classroom features:
-- 1. Creating assignment groups (was failing with permission denied)
-- 2. Managing group memberships
-- 3. Assigning work to groups
-- 4. Team collaboration features
-- 5. Assignment enrollment system
-- 6. Classroom assignment management

-- ========================================
-- SECURITY IMPLICATIONS
-- ========================================

-- IMPORTANT: With RLS disabled on these tables, authenticated users can:
-- - Access all assignment groups across all classrooms
-- - See all group memberships
-- - View all assignment enrollments
-- 
-- This is a temporary emergency fix to restore classroom functionality.
-- When security is systematically restored, proper RLS policies should:
-- 1. Allow instructors to manage groups in their classrooms only
-- 2. Allow students to view/join groups in their enrolled classrooms only
-- 3. Restrict assignment access to enrolled users only
-- 4. Implement proper role-based permissions

-- ========================================
-- TABLES NOW WITHOUT RLS (FULL LIST)
-- ========================================

-- Core platform tables (from previous emergency fixes):
-- - profiles
-- - classroom_memberships  
-- - classrooms
-- - classroom_maps
-- - learning_maps
-- - map_nodes
-- - user_map_enrollments
-- - student_node_progress
-- - assessment_submissions
-- - submission_grades
-- - node_assessments
-- - node_content

-- Assignment and collaboration tables (from this fix):
-- - assignment_groups
-- - assignment_group_members
-- - assignment_group_assignments
-- - classroom_assignments
-- - assignment_enrollments
-- - classroom_teams
-- - team_memberships