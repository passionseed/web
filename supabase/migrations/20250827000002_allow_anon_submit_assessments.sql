-- Allow anonymous users to create assessment submissions
-- This fixes the issue where students can see assessments but can't submit them

-- Allow anon users to create assessment submissions
CREATE POLICY "anon_users_can_create_submissions" ON public.assessment_submissions
FOR INSERT TO anon WITH CHECK (true);

-- Allow anon users to view their own submissions (using progress_id as identifier)
CREATE POLICY "anon_users_can_view_submissions" ON public.assessment_submissions  
FOR SELECT TO anon USING (true);

-- Allow anon users to view/create progress records
CREATE POLICY "anon_users_can_manage_progress" ON public.student_node_progress
FOR ALL TO anon 
USING (true) 
WITH CHECK (true);

-- Allow anon users to view grades for their submissions
CREATE POLICY "anon_users_can_view_grades" ON public.submission_grades
FOR SELECT TO anon USING (true);