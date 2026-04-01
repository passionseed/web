-- Fix statement timeout on path_activities and path_assessments SELECT.
-- Both tables had RLS policies doing multi-table joins + enrollment checks
-- on every row, causing 2-6s query times.
-- Replace with cheap seed_type = 'pathlab' check (no auth join needed).

-- =====================================================
-- path_activities
-- =====================================================
DROP POLICY IF EXISTS "users_can_view_path_activities" ON public.path_activities;

CREATE POLICY "pathlab_activities_readable" ON public.path_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM path_days pd
      JOIN paths p ON p.id = pd.path_id
      JOIN seeds s ON s.id = p.seed_id
      WHERE pd.id = path_activities.path_day_id
        AND s.seed_type = 'pathlab'
    )
  );

-- =====================================================
-- path_assessments
-- =====================================================
DROP POLICY IF EXISTS "users_can_view_path_assessments" ON public.path_assessments;
DROP POLICY IF EXISTS "pathlab_assessments_readable" ON public.path_assessments;

CREATE POLICY "pathlab_assessments_readable" ON public.path_assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM path_activities pa
      JOIN path_days pd ON pd.id = pa.path_day_id
      JOIN paths p ON p.id = pd.path_id
      JOIN seeds s ON s.id = p.seed_id
      WHERE pa.id = path_assessments.activity_id
        AND s.seed_type = 'pathlab'
    )
  );
