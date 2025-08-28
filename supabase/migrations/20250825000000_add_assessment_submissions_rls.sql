-- Enable RLS and create policies for assessment_submissions and related tables
-- This fixes the issue where assessment_submissions queries were failing due to missing RLS policies

-- Enable RLS for assessment_submissions table
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_node_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for assessment_submissions
-- Users can view submissions in classrooms they belong to
CREATE POLICY "members_can_view_submissions" ON public.assessment_submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.student_node_progress snp
    JOIN public.map_nodes mn ON snp.node_id = mn.id
    JOIN public.classroom_maps cm ON mn.map_id = cm.map_id
    WHERE snp.id = assessment_submissions.progress_id
    AND cm.classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships
      WHERE user_id = auth.uid()
    )
  )
);

-- Users can create their own submissions
CREATE POLICY "users_can_create_own_submissions" ON public.assessment_submissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.student_node_progress snp
    WHERE snp.id = assessment_submissions.progress_id
    AND snp.user_id = auth.uid()
  )
);

-- Users can update their own submissions (if not yet graded)
CREATE POLICY "users_can_update_own_submissions" ON public.assessment_submissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.student_node_progress snp
    WHERE snp.id = assessment_submissions.progress_id
    AND snp.user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.submission_grades sg
    WHERE sg.submission_id = assessment_submissions.id
  )
);

-- Create policies for submission_grades
-- Instructors and TAs can view/create grades for their classroom submissions
CREATE POLICY "instructors_can_manage_grades" ON public.submission_grades
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.assessment_submissions asub
    JOIN public.student_node_progress snp ON asub.progress_id = snp.id
    JOIN public.map_nodes mn ON snp.node_id = mn.id
    JOIN public.classroom_maps cmap ON mn.map_id = cmap.map_id
    JOIN public.classroom_memberships cm ON cmap.classroom_id = cm.classroom_id
    WHERE asub.id = submission_grades.submission_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('instructor', 'ta')
  )
);

-- Students can view grades for their own submissions
CREATE POLICY "students_can_view_own_grades" ON public.submission_grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.assessment_submissions asub
    JOIN public.student_node_progress snp ON asub.progress_id = snp.id
    WHERE asub.id = submission_grades.submission_id
    AND snp.user_id = auth.uid()
  )
);

-- Create policies for student_node_progress
-- Users can view progress in classrooms they belong to
CREATE POLICY "members_can_view_progress" ON public.student_node_progress
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.classroom_maps cm ON mn.map_id = cm.map_id
    WHERE mn.id = student_node_progress.node_id
    AND cm.classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships
      WHERE user_id = auth.uid()
    )
  )
);

-- Users can create and update their own progress
CREATE POLICY "users_can_manage_own_progress" ON public.student_node_progress
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policies for node_assessments
-- Users can view assessments for nodes in classrooms they belong to
CREATE POLICY "members_can_view_assessments" ON public.node_assessments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.classroom_maps cm ON mn.map_id = cm.map_id
    WHERE mn.id = node_assessments.node_id
    AND cm.classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships
      WHERE user_id = auth.uid()
    )
  )
);

-- Admin policies will be added in a separate migration when is_admin function is properly available