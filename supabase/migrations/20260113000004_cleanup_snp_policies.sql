-- Drop all existing policies on student_node_progress to start fresh
DROP POLICY IF EXISTS "users_can_manage_own_progress" ON "public"."student_node_progress";
DROP POLICY IF EXISTS "authenticated_users_can_update_progress" ON "public"."student_node_progress";
DROP POLICY IF EXISTS "authenticated_users_can_view_progress" ON "public"."student_node_progress";
DROP POLICY IF EXISTS "anon_users_can_manage_progress" ON "public"."student_node_progress";
DROP POLICY IF EXISTS "instructors_and_admins_view_progress" ON "public"."student_node_progress";
DROP POLICY IF EXISTS "Users can manage own progress" ON "public"."student_node_progress";

-- Create clean, safe policies

-- 1. Users can view their own progress
CREATE POLICY "Users can view their own progress" ON "public"."student_node_progress"
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- 2. Instructors and Admins can view ALL progress
CREATE POLICY "Instructors and Admins can view all progress" ON "public"."student_node_progress"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('instructor', 'admin')
  )
);

-- 3. Users can insert/update their own progress
CREATE POLICY "Users can insert their own progress" ON "public"."student_node_progress"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own progress" ON "public"."student_node_progress"
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
);
