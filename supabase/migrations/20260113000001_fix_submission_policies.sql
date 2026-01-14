-- Enable RLS
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

-- Policy for Instructors and Admins to view all submissions
CREATE POLICY "Instructors and Admins can view all submissions"
ON public.assessment_submissions
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role IN ('instructor', 'admin')
  )
);

-- Policy for Students to view their own submissions
CREATE POLICY "Students can view their own submissions"
ON public.assessment_submissions
FOR SELECT
USING (
  progress_id IN (
    SELECT id 
    FROM public.student_node_progress 
    WHERE user_id = auth.uid()
  )
);

-- Policy for inserting submissions (Students)
CREATE POLICY "Students can insert their own submissions"
ON public.assessment_submissions
FOR INSERT
WITH CHECK (
  progress_id IN (
    SELECT id 
    FROM public.student_node_progress 
    WHERE user_id = auth.uid()
  )
);

-- Policy for updating submissions (Students) - e.g. quiz answers
CREATE POLICY "Students can update their own submissions"
ON public.assessment_submissions
FOR UPDATE
USING (
  progress_id IN (
    SELECT id 
    FROM public.student_node_progress 
    WHERE user_id = auth.uid()
  )
);

-- Ensure node_assessments is readable
ALTER TABLE public.node_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view node assessments"
ON public.node_assessments
FOR SELECT
TO authenticated
USING (true);
