-- Fix node_assessments permissions - restore INSERT, UPDATE, DELETE for authenticated users
-- The 20250915095735_remote_schema.sql migration revoked all permissions
-- The 20250919000006_restore_all_system_permissions.sql migration only restored SELECT
-- This migration restores the missing CRUD permissions needed for assessment creation

-- Restore INSERT permission for authenticated users to create assessments
GRANT INSERT ON table "public"."node_assessments" TO "authenticated";

-- Restore UPDATE permission for authenticated users to modify assessments
GRANT UPDATE ON table "public"."node_assessments" TO "authenticated";

-- Restore DELETE permission for authenticated users to remove assessments
GRANT DELETE ON table "public"."node_assessments" TO "authenticated";

-- Also need to restore permissions for quiz_questions table which is related
GRANT INSERT ON table "public"."quiz_questions" TO "authenticated";
GRANT UPDATE ON table "public"."quiz_questions" TO "authenticated";
GRANT DELETE ON table "public"."quiz_questions" TO "authenticated";

-- Verify that RLS policies exist to control access (they should already exist from previous migrations)
-- The existing policies should ensure that users can only manage assessments for:
-- 1. Maps they own (creator_id = auth.uid())
-- 2. Classrooms they are instructors/TAs in
-- 3. Public maps they have access to

-- Log this permission restoration
COMMENT ON TABLE "public"."node_assessments" IS 'Assessment creation permissions restored on 2025-09-19 - users can now create/update/delete assessments based on RLS policies';