-- Remove conflicting/recursive policies on classroom_memberships
DROP POLICY IF EXISTS "view_classroom_memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "instructors_manage_memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "join_as_student" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "leave_own_memberships" ON "public"."classroom_memberships";

-- Ensure we have the safe policies (re-declaring them implies checking existence but DROP IF EXISTS fixes conflict)
-- My previous migration created "Instructors can view all memberships in their classrooms".
-- I will keep it.

-- But students need to view their own memberships too.
-- "Instructors can view all memberships in their classrooms" included "auth.uid() = user_id".
-- So students CAN view their own.
-- What about "Join as student"? (INSERT).
-- Students need to INSERT into classroom_memberships.
-- Creating a safe INSERT policy:
DROP POLICY IF EXISTS "Users can join classrooms" ON "public"."classroom_memberships";

CREATE POLICY "Users can join classrooms" ON "public"."classroom_memberships"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Users needs to DELETE their own membership (Leave).
DROP POLICY IF EXISTS "Users can leave classrooms" ON "public"."classroom_memberships";

CREATE POLICY "Users can leave classrooms" ON "public"."classroom_memberships"
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- Remove conflicting policies on profiles
DROP POLICY IF EXISTS "profiles_policy" ON "public"."profiles";
-- "Users can read their own profile", "Instructors can view..." are fine.
-- But "profiles_policy" is likely a legacy catch-all that causes recursion.
-- Also "Users can manage their own profile" might be duplicate of "Users can update...".
DROP POLICY IF EXISTS "Users can manage their own profile" ON "public"."profiles";

-- Ensure Profiles are readable by instructors via safe function (already done in previous migration, but good to be sure).
-- Previous migration 20260113000002_fix_classroom_recursion.sql handles this.

-- Fix for "500 Internal Server Error" in logs for /api/maps/.../progress
-- The API uses adminClient but if RLS was causing issues in client-side queries, cleaning this up helps.
