-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own results" ON public.direction_finder_results;

-- Create a new inclusive policy
CREATE POLICY "Users and instructors can view results" 
ON public.direction_finder_results 
FOR SELECT 
TO authenticated 
USING (
  -- User can see their own results
  auth.uid() = user_id 
  OR 
  -- OR if the requesting user is an instructor/TA of a classroom the target user is a student in
  EXISTS (
    SELECT 1 
    FROM public.classroom_memberships instructor_cm
    JOIN public.classroom_memberships student_cm ON instructor_cm.classroom_id = student_cm.classroom_id
    WHERE instructor_cm.user_id = auth.uid()
    AND (instructor_cm.role = 'instructor' OR instructor_cm.role = 'ta')
    AND student_cm.user_id = direction_finder_results.user_id
    AND student_cm.role = 'student'
  )
);
