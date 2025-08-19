-- Comprehensive fix for classroom_memberships RLS policies

BEGIN;

-- Drop all existing classroom_memberships policies to start clean
DROP POLICY IF EXISTS "students_join_classrooms" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_can_add_students" ON public.classroom_memberships;
DROP POLICY IF EXISTS "allow_classroom_membership_insert" ON public.classroom_memberships;
DROP POLICY IF EXISTS "anyone_can_join_classrooms" ON public.classroom_memberships;
DROP POLICY IF EXISTS "allow_student_joins" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_insert_members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "classroom_memberships_insert" ON public.classroom_memberships;
DROP POLICY IF EXISTS "authenticated_users_can_join" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_manage_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "users_leave_classrooms" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_manage_classroom_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "members_can_view_fellow_members" ON public.classroom_memberships;

-- INSERT policy: Authenticated users can join as students (inserting themselves only)
CREATE POLICY "authenticated_users_can_join" ON public.classroom_memberships
  FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL) 
    AND (role::text = 'student'::text)
    AND (user_id = auth.uid())
  );

-- INSERT policy: Instructors can add anyone to their classrooms
CREATE POLICY "instructors_manage_memberships" ON public.classroom_memberships
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id 
      AND instructor_id = auth.uid()
    )
  );

-- SELECT policy: Anyone can view classroom memberships
CREATE POLICY "anyone_can_view_memberships" ON public.classroom_memberships
  FOR SELECT USING (true);

-- DELETE policy: Users can leave their own memberships
CREATE POLICY "users_leave_classrooms" ON public.classroom_memberships
  FOR DELETE USING (user_id = auth.uid());

-- UPDATE policy: Instructors can update memberships in their classrooms
CREATE POLICY "instructors_update_memberships" ON public.classroom_memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.classrooms 
      WHERE id = classroom_id 
      AND instructor_id = auth.uid()
    )
  );

COMMIT;