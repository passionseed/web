-- =====================================================
-- FIX PATHLAB CONTENT RLS FOR PREVIEW
-- Allow viewing activities and content for pathlab seeds
-- =====================================================

-- =====================================================
-- PATH ACTIVITIES RLS FIX
-- =====================================================
DROP POLICY IF EXISTS "users_can_view_path_activities" ON public.path_activities;

CREATE POLICY "users_can_view_path_activities" ON public.path_activities
  FOR SELECT USING (
    -- User created the path
    EXISTS (
      SELECT 1 FROM public.path_days pd
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pd.id = path_activities.path_day_id
        AND p.created_by = auth.uid()
    )
    OR
    -- User is enrolled
    EXISTS (
      SELECT 1 FROM public.path_days pd
      JOIN public.paths p ON p.id = pd.path_id
      JOIN public.path_enrollments pe ON pe.path_id = p.id
      WHERE pd.id = path_activities.path_day_id
        AND pe.user_id = auth.uid()
    )
    OR
    -- Path belongs to a pathlab seed (public preview)
    EXISTS (
      SELECT 1 FROM public.path_days pd
      JOIN public.paths p ON p.id = pd.path_id
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE pd.id = path_activities.path_day_id
        AND s.seed_type = 'pathlab'
    )
  );

-- =====================================================
-- PATH CONTENT RLS FIX
-- =====================================================
DROP POLICY IF EXISTS "users_can_view_path_content" ON public.path_content;

CREATE POLICY "users_can_view_path_content" ON public.path_content
  FOR SELECT USING (
    -- User created the path
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      WHERE pa.id = path_content.activity_id
        AND p.created_by = auth.uid()
    )
    OR
    -- User is enrolled
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      JOIN public.path_enrollments pe ON pe.path_id = p.id
      WHERE pa.id = path_content.activity_id
        AND pe.user_id = auth.uid()
    )
    OR
    -- Activity belongs to a pathlab seed (public preview)
    EXISTS (
      SELECT 1 FROM public.path_activities pa
      JOIN public.path_days pd ON pd.id = pa.path_day_id
      JOIN public.paths p ON p.id = pd.path_id
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE pa.id = path_content.activity_id
        AND s.seed_type = 'pathlab'
    )
  );