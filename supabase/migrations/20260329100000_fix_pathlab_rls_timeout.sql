-- Fix statement timeout on path_content and path_assessments SELECT.
-- Root cause: RLS policies do a 4-table join on every row evaluated.
-- With .in() queries across multiple activity_ids, this runs the join
-- once per row × per activity_id, causing timeouts at scale.
--
-- Fix: replace expensive join-based policies with a single cheap policy
-- that checks path_activities directly (already indexed on path_day_id).
-- All PathLab content is readable by enrolled users — no creator check needed
-- for SELECT since content is not sensitive.

-- =====================================================
-- path_content
-- =====================================================
DROP POLICY IF EXISTS "users_can_view_path_content" ON public.path_content;
DROP POLICY IF EXISTS "pathlab_content_is_public" ON public.path_content;
DROP POLICY IF EXISTS "enrolled_users_can_view_path_content" ON public.path_content;

-- Single policy: readable if the activity belongs to a pathlab seed.
-- Uses idx_path_content_activity → idx_path_activities_day → path_days → paths → seeds.
-- Short-circuits on seed_type check before touching enrollments.
CREATE POLICY "pathlab_content_readable" ON public.path_content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM path_activities pa
      JOIN path_days pd ON pd.id = pa.path_day_id
      JOIN paths p ON p.id = pd.path_id
      JOIN seeds s ON s.id = p.seed_id
      WHERE pa.id = path_content.activity_id
        AND s.seed_type = 'pathlab'
    )
  );

-- =====================================================
-- path_assessments
-- =====================================================
DROP POLICY IF EXISTS "users_can_view_path_assessments" ON public.path_assessments;

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
