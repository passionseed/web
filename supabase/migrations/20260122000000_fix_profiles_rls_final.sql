-- Fix RLS policies for profiles table
-- Re-applying strict policies to ensure users can manage their own profiles
-- This fixes the issue where "profiles_policy" was dropped in 20260113000003_cleanup_policies.sql
-- leaving the table locked for updates.

-- Enable RLS (ensure it is on)
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies to start fresh
DROP POLICY IF EXISTS "profiles_policy" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can read their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON "public"."profiles";
DROP POLICY IF EXISTS "anyone can view profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "System can insert profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Service role can insert profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can manage their own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Instructors can view student profiles in their classrooms" ON "public"."profiles";
DROP POLICY IF EXISTS "view_profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "insert_own_profile" ON "public"."profiles";
DROP POLICY IF EXISTS "update_own_profile" ON "public"."profiles";
DROP POLICY IF EXISTS "delete_own_profile" ON "public"."profiles";

-- Create new clean policies

-- 1. VIEW: Allow authenticated users to view all profiles 
-- (Needed for leaderboards, social features, classroom lists, etc.)
CREATE POLICY "view_profiles" ON "public"."profiles"
FOR SELECT
TO authenticated, service_role
USING ( true );

-- 2. INSERT: Users can insert ONLY their own profile
CREATE POLICY "insert_own_profile" ON "public"."profiles"
FOR INSERT
TO authenticated, service_role
WITH CHECK (
  auth.uid() = id
  OR
  auth.role() = 'service_role'
);

-- 3. UPDATE: Users can update ONLY their own profile
CREATE POLICY "update_own_profile" ON "public"."profiles"
FOR UPDATE
TO authenticated, service_role
USING (
  auth.uid() = id
  OR
  auth.role() = 'service_role'
)
WITH CHECK (
  auth.uid() = id
  OR
  auth.role() = 'service_role'
);

-- 4. DELETE: Users can delete their own profile (usually managed by auth cascade, but safe to have)
CREATE POLICY "delete_own_profile" ON "public"."profiles"
FOR DELETE
TO authenticated, service_role
USING (
  auth.uid() = id
  OR
  auth.role() = 'service_role'
);

-- Grant privileges to ensure no basic permission issues
GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
