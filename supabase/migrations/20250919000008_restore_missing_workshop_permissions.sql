-- Restore permissions for workshop-related tables that were missed in the comprehensive migration
-- These tables were also affected by the 20250915095735_remote_schema.sql migration

-- ========================================
-- WORKSHOP SYSTEM PERMISSIONS
-- ========================================

-- Grant SELECT permissions for workshop tables
GRANT SELECT ON table "public"."workshops" TO "authenticated";
GRANT SELECT ON table "public"."user_workshops" TO "authenticated";

-- Grant management permissions for user workshop enrollments
GRANT INSERT, UPDATE, DELETE ON table "public"."user_workshops" TO "authenticated";

-- Enable RLS on workshop tables
ALTER TABLE "public"."workshops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_workshops" ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for workshops (assuming public workshops that users can view)
DROP POLICY IF EXISTS "Users can view workshops" ON "public"."workshops";
CREATE POLICY "Users can view workshops" ON "public"."workshops"
FOR SELECT 
TO authenticated
USING (true); -- Allow all authenticated users to view workshops

-- Create RLS policies for user workshop enrollments
DROP POLICY IF EXISTS "Users can manage their own workshop enrollments" ON "public"."user_workshops";
CREATE POLICY "Users can manage their own workshop enrollments" ON "public"."user_workshops"
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());