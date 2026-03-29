-- Replace join-based RLS policies on PathLab read-only tables with open read.
-- path_content, path_activities, path_assessments hold curriculum content that
-- is identical for every user — no PII, no per-user data. The join policies
-- were causing 2-8s query times due to row-by-row join evaluation.
-- Write policies (INSERT/UPDATE/DELETE) are unchanged.

-- =====================================================
-- path_content
-- =====================================================
DROP POLICY IF EXISTS "pathlab_content_readable" ON public.path_content;
DROP POLICY IF EXISTS "users_can_view_path_content" ON public.path_content;
DROP POLICY IF EXISTS "pathlab_content_is_public" ON public.path_content;
DROP POLICY IF EXISTS "enrolled_users_can_view_path_content" ON public.path_content;

CREATE POLICY "path_content_open_read" ON public.path_content
  FOR SELECT
  USING (true);

-- =====================================================
-- path_activities
-- =====================================================
DROP POLICY IF EXISTS "pathlab_activities_readable" ON public.path_activities;
DROP POLICY IF EXISTS "users_can_view_path_activities" ON public.path_activities;

CREATE POLICY "path_activities_open_read" ON public.path_activities
  FOR SELECT
  USING (true);

-- =====================================================
-- path_assessments
-- =====================================================
DROP POLICY IF EXISTS "pathlab_assessments_readable" ON public.path_assessments;
DROP POLICY IF EXISTS "users_can_view_path_assessments" ON public.path_assessments;

CREATE POLICY "path_assessments_open_read" ON public.path_assessments
  FOR SELECT
  USING (true);
