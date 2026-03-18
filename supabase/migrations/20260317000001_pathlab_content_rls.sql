-- =====================================================
-- PATHLAB CONTENT SYSTEM - ROW LEVEL SECURITY
-- RLS policies for PathLab content tables
-- =====================================================

-- =====================================================
-- PATH ACTIVITIES RLS
-- =====================================================
ALTER TABLE public.path_activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities if they created the path or are enrolled
CREATE POLICY "users_can_view_path_activities" ON public.path_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_days pd
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pd.id = path_activities.path_day_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.path_enrollments pe
            WHERE pe.path_id = p.id AND pe.user_id = auth.uid()
          )
        )
    )
  );

-- Path creators can manage activities
CREATE POLICY "path_creators_can_manage_activities" ON public.path_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.path_days pd
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pd.id = path_activities.path_day_id
        AND p.created_by = auth.uid()
    )
  );

-- =====================================================
-- PATH CONTENT RLS
-- =====================================================
ALTER TABLE public.path_content ENABLE ROW LEVEL SECURITY;

-- Users can view content if they created the path or are enrolled
CREATE POLICY "users_can_view_path_content" ON public.path_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pa.id = path_content.activity_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.path_enrollments pe
            WHERE pe.path_id = p.id AND pe.user_id = auth.uid()
          )
        )
    )
  );

-- Path creators can manage content
CREATE POLICY "path_creators_can_manage_content" ON public.path_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pa.id = path_content.activity_id
        AND p.created_by = auth.uid()
    )
  );

-- =====================================================
-- PATH ASSESSMENTS RLS
-- =====================================================
ALTER TABLE public.path_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view assessments if they created the path or are enrolled
CREATE POLICY "users_can_view_path_assessments" ON public.path_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pa.id = path_assessments.activity_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.path_enrollments pe
            WHERE pe.path_id = p.id AND pe.user_id = auth.uid()
          )
        )
    )
  );

-- Path creators can manage assessments
CREATE POLICY "path_creators_can_manage_assessments" ON public.path_assessments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pa.id = path_assessments.activity_id
        AND p.created_by = auth.uid()
    )
  );

-- =====================================================
-- PATH QUIZ QUESTIONS RLS
-- =====================================================
ALTER TABLE public.path_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Users can view quiz questions if they created the path or are enrolled
CREATE POLICY "users_can_view_path_quiz_questions" ON public.path_quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_assessments pa
      JOIN public.path_activities pact ON pact.id = pa.activity_id
      JOIN public.path_days pd ON pd.id = pact.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pa.id = path_quiz_questions.assessment_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.path_enrollments pe
            WHERE pe.path_id = p.id AND pe.user_id = auth.uid()
          )
        )
    )
  );

-- Path creators can manage quiz questions
CREATE POLICY "path_creators_can_manage_quiz_questions" ON public.path_quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.path_assessments pass
      JOIN public.path_activities pa ON pa.id = pass.activity_id
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pass.id = path_quiz_questions.assessment_id
        AND p.created_by = auth.uid()
    )
  );

-- =====================================================
-- PATH ACTIVITY PROGRESS RLS
-- =====================================================
ALTER TABLE public.path_activity_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "users_can_view_own_progress" ON public.path_activity_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_enrollments pe
      WHERE pe.id = path_activity_progress.enrollment_id
        AND pe.user_id = auth.uid()
    )
  );

-- Users can update their own progress
CREATE POLICY "users_can_update_own_progress" ON public.path_activity_progress
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.path_enrollments pe
      WHERE pe.id = path_activity_progress.enrollment_id
        AND pe.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_modify_own_progress" ON public.path_activity_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.path_enrollments pe
      WHERE pe.id = path_activity_progress.enrollment_id
        AND pe.user_id = auth.uid()
    )
  );

-- Path creators can view all progress for their paths
CREATE POLICY "creators_can_view_path_progress" ON public.path_activity_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_enrollments pe
      JOIN public.paths p ON p.id = pe.path_id
      WHERE pe.id = path_activity_progress.enrollment_id
        AND p.created_by = auth.uid()
    )
  );

-- =====================================================
-- PATH ASSESSMENT SUBMISSIONS RLS
-- =====================================================
ALTER TABLE public.path_assessment_submissions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own submissions
CREATE POLICY "users_can_view_own_submissions" ON public.path_assessment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_activity_progress pap
      JOIN public.path_enrollments pe ON pe.id = pap.enrollment_id
      WHERE pap.id = path_assessment_submissions.progress_id
        AND pe.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_create_own_submissions" ON public.path_assessment_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.path_activity_progress pap
      JOIN public.path_enrollments pe ON pe.id = pap.enrollment_id
      WHERE pap.id = path_assessment_submissions.progress_id
        AND pe.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_own_submissions" ON public.path_assessment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.path_activity_progress pap
      JOIN public.path_enrollments pe ON pe.id = pap.enrollment_id
      WHERE pap.id = path_assessment_submissions.progress_id
        AND pe.user_id = auth.uid()
    )
  );

-- Path creators can view submissions for their paths
CREATE POLICY "creators_can_view_path_submissions" ON public.path_assessment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.path_activity_progress pap
      JOIN public.path_enrollments pe ON pe.id = pap.enrollment_id
      JOIN public.paths p ON p.id = pe.path_id
      WHERE pap.id = path_assessment_submissions.progress_id
        AND p.created_by = auth.uid()
    )
  );
