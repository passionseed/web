-- =====================================================
-- RLS POLICIES FOR DRAFT ACTIVITIES
-- Students cannot see draft activities
-- Admins and creators can see all activities
-- =====================================================

-- Drop existing policies if they exist (to recreate with draft filtering)
DROP POLICY IF EXISTS "Users can view activities in their enrolled paths" ON public.path_activities;
DROP POLICY IF EXISTS "Path creators can manage activities" ON public.path_activities;

-- Policy: Students can only view published (non-draft) activities in their enrolled paths
CREATE POLICY "Students can view published activities in enrolled paths"
  ON public.path_activities
  FOR SELECT
  USING (
    -- Activity must not be draft OR user must be admin/creator
    (
      is_draft = false
      OR
      -- Allow admins to see all activities
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
      )
      OR
      -- Allow path creators to see their own draft activities
      EXISTS (
        SELECT 1 FROM public.path_days pd
        JOIN public.paths p ON p.id = pd.path_id
        WHERE pd.id = path_day_id
        AND p.created_by = auth.uid()
      )
    )
  );

-- Policy: Path creators and admins can manage activities
CREATE POLICY "Path creators and admins can manage activities"
  ON public.path_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.path_days pd
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pd.id = path_day_id
      AND p.created_by = auth.uid()
    )
  );

-- Policy: Prevent student progress on draft activities
-- Students cannot create progress entries for draft activities
DROP POLICY IF EXISTS "Students cannot track progress on draft activities" ON public.path_activity_progress;

CREATE POLICY "Students cannot track progress on draft activities"
  ON public.path_activity_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.path_activities
      WHERE id = activity_id
      AND is_draft = false
    )
    OR
    -- Allow admins to bypass this restriction
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

COMMENT ON POLICY "Students can view published activities in enrolled paths" ON public.path_activities
  IS 'Students can only see activities that are not drafts. Admins and path creators can see all activities including drafts.';

COMMENT ON POLICY "Students cannot track progress on draft activities" ON public.path_activity_progress
  IS 'Prevents students from creating progress entries for draft activities, ensuring they cannot access incomplete content.';
