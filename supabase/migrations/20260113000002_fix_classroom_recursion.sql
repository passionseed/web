-- Function to check if current user is an instructor in a classroom
-- SECURITY DEFINER allows it to bypass RLS on classroom_memberships
CREATE OR REPLACE FUNCTION public.is_classroom_instructor(lookup_classroom_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.classroom_memberships 
    WHERE classroom_id = lookup_classroom_id 
    AND user_id = auth.uid() 
    AND role IN ('instructor', 'ta')
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_classroom_instructor TO authenticated;

-- Use the new function in classroom_memberships policy to avoid recursion
DROP POLICY IF EXISTS "Instructors can view all memberships in their classrooms" ON "public"."classroom_memberships";

CREATE POLICY "Instructors can view all memberships in their classrooms" ON "public"."classroom_memberships"
FOR SELECT 
TO authenticated
USING (
  -- Users can view their own membership
  auth.uid() = user_id
  OR
  -- Instructors can view all memberships in their classrooms (using security definer function)
  public.is_classroom_instructor(classroom_id)
);

-- Update profiles policy to use the function and avoid deep recursion
DROP POLICY IF EXISTS "Instructors can view student profiles in their classrooms" ON "public"."profiles";

CREATE POLICY "Instructors can view student profiles in their classrooms" ON "public"."profiles"
FOR SELECT 
TO authenticated
USING (
  -- Users can always view their own profile
  auth.uid() = id 
  OR
  -- Instructors can view profiles of students in their classrooms
  EXISTS (
    SELECT 1 
    FROM public.classroom_memberships student_membership
    WHERE student_membership.user_id = id
    AND public.is_classroom_instructor(student_membership.classroom_id)
  )
);
