BEGIN;

-- Fix classroom_memberships permission issue
-- Users are getting "permission denied for table classroom_memberships" errors
-- when trying to fetch their own classroom memberships

-- Drop any existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can view their own classroom memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "Users can manage their own classroom memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "Instructors can view all memberships in their classrooms" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "Users can view relevant classroom memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "Users can manage classroom memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "anyone_can_view_memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "authenticated_users_can_join" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "instructors_manage_memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "users_leave_classrooms" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "instructors_update_memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "members_can_view_fellow_members" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "users_view_own_memberships" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "students_join_classrooms" ON "public"."classroom_memberships";
DROP POLICY IF EXISTS "instructors_manage_classroom_memberships" ON "public"."classroom_memberships";

-- Create simple, working policies
-- Users can view their own memberships
CREATE POLICY "view_own_memberships" ON "public"."classroom_memberships"
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Users can join classrooms as students
CREATE POLICY "join_as_student" ON "public"."classroom_memberships"
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND 
  role = 'student'
);

-- Users can leave their own memberships
CREATE POLICY "leave_own_memberships" ON "public"."classroom_memberships"
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Instructors can manage memberships in their classrooms
CREATE POLICY "instructors_manage_memberships" ON "public"."classroom_memberships"
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE id = classroom_memberships.classroom_id 
    AND instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classrooms 
    WHERE id = classroom_memberships.classroom_id 
    AND instructor_id = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE "public"."classroom_memberships" ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON table "public"."classroom_memberships" TO "authenticated";

COMMIT;