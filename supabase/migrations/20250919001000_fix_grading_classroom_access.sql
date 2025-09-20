-- Fix classroom membership and profiles access for grading functionality
-- This migration ensures instructors can access student profiles and memberships for grading

-- ========================================
-- ENABLE RLS ON CLASSROOM TABLES
-- ========================================

ALTER TABLE "public"."classroom_memberships" ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE CLASSROOM MEMBERSHIPS POLICIES
-- ========================================

-- Check and create policies only if they don't exist

-- Policy for instructors to view all memberships in their classrooms
DROP POLICY IF EXISTS "Instructors can view all memberships in their classrooms" ON "public"."classroom_memberships";
CREATE POLICY "Instructors can view all memberships in their classrooms" ON "public"."classroom_memberships"
FOR SELECT 
TO authenticated
USING (
  -- Users can view their own membership
  auth.uid() = user_id
  OR
  -- Instructors can view all memberships in their classrooms
  EXISTS (
    SELECT 1 FROM classroom_memberships instructor_membership
    WHERE instructor_membership.classroom_id = classroom_memberships.classroom_id
    AND instructor_membership.user_id = auth.uid()
    AND instructor_membership.role IN ('instructor', 'ta')
  )
);

-- ========================================
-- UPDATE PROFILES POLICIES FOR CLASSROOM ACCESS
-- ========================================

-- Drop existing policy
DROP POLICY IF EXISTS "Instructors can view student profiles in their classrooms" ON "public"."profiles";

-- Create policy for instructors to view student profiles in their classrooms
CREATE POLICY "Instructors can view student profiles in their classrooms" ON "public"."profiles"
FOR SELECT 
TO authenticated
USING (
  -- Users can always view their own profile
  auth.uid() = id 
  OR
  -- Instructors can view profiles of students in their classrooms
  EXISTS (
    SELECT 1 FROM classroom_memberships instructor_membership
    JOIN classroom_memberships student_membership 
      ON instructor_membership.classroom_id = student_membership.classroom_id
    WHERE instructor_membership.user_id = auth.uid()
    AND instructor_membership.role IN ('instructor', 'ta')
    AND student_membership.user_id = profiles.id
    AND student_membership.role = 'student'
  )
);

-- ========================================
-- GRANT NECESSARY PERMISSIONS FOR GRADING
-- ========================================

-- Ensure authenticated users can INSERT/UPDATE/DELETE classroom memberships
GRANT INSERT, UPDATE, DELETE ON table "public"."classroom_memberships" TO "authenticated";

-- ========================================
-- NOTE
-- ========================================
-- This migration specifically addresses the grading functionality issue where
-- instructors couldn't access classroom_memberships and student profiles
-- The RLS policies ensure proper security while allowing necessary access