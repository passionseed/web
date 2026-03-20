-- =====================================================
-- FIX PATH_DAYS RLS FOR PREVIEW
-- Allow viewing path_days for public seeds (before enrollment)
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Path days are viewable by enrolled users and admins" ON public.path_days;

-- Create new policy that allows:
-- 1. Enrolled users
-- 2. Seed creators
-- 3. Admins/instructors
-- 4. Anyone viewing a pathlab seed (for preview before enrollment)
CREATE POLICY "Path days are viewable for preview and enrolled users"
  ON public.path_days FOR SELECT
  USING (
    -- User is enrolled in this path
    EXISTS (
      SELECT 1
      FROM public.path_enrollments pe
      WHERE pe.path_id = path_days.path_id
      AND pe.user_id = auth.uid()
    )
    OR
    -- User is the seed creator
    EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id
      AND s.created_by = auth.uid()
    )
    OR
    -- User is admin/instructor
    EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'instructor')
      )
    )
    OR
    -- Seed is a pathlab (public preview allowed)
    EXISTS (
      SELECT 1
      FROM public.paths p
      JOIN public.seeds s ON s.id = p.seed_id
      WHERE p.id = path_days.path_id
      AND s.seed_type = 'pathlab'
    )
  );