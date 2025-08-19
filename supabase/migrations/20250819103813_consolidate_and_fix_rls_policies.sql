BEGIN;
-- This function safely retrieves the classrooms for the current user.
-- As a SECURITY DEFINER, it bypasses the RLS policy on classroom_memberships,
-- thus preventing the infinite recursion loop.
CREATE OR REPLACE FUNCTION get_my_classrooms()
RETURNS TABLE(id uuid)
LANGUAGE sql
SECURITY DEFINER
-- IMPORTANT: Set a secure search_path for SECURITY DEFINER functions
SET search_path = public, pg_temp
AS $$
  SELECT classroom_id FROM public.classroom_memberships WHERE user_id = auth.uid();
$$;
-- Grant permission to all authenticated users to execute this function.
GRANT EXECUTE ON FUNCTION get_my_classrooms() TO authenticated;
-- Ensure tables have RLS enabled.
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
-- Drop old policies to prevent conflicts.
DROP POLICY IF EXISTS "users_view_own_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "users_view_classroom_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "members_can_view_fellow_members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "classroom_members_view_teams" ON public.classroom_teams;
DROP POLICY IF EXISTS "members_can_view_teams" ON public.classroom_teams;
DROP POLICY IF EXISTS "users_view_team_memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "members_can_view_team_memberships" ON public.team_memberships;
--
-- RECREATE POLICIES USING THE NON-RECURSIVE FUNCTION
--
-- Policy for: classroom_memberships
-- Users can see memberships of classrooms they belong to.
CREATE POLICY "members_can_view_fellow_members" ON public.classroom_memberships
FOR SELECT USING (
  classroom_id IN (SELECT id FROM get_my_classrooms())
);
-- Policy for: classroom_teams
-- Users can see teams within their classrooms.
CREATE POLICY "members_can_view_teams" ON public.classroom_teams
FOR SELECT USING (
  classroom_id IN (SELECT id FROM get_my_classrooms())
);
-- Policy for: team_memberships
-- Users can see memberships for teams within their classrooms.
CREATE POLICY "members_can_view_team_memberships" ON public.team_memberships
FOR SELECT USING (
  team_id IN (
    SELECT ct.id
    FROM public.classroom_teams ct
    WHERE ct.classroom_id IN (SELECT id FROM get_my_classrooms())
  )
);
COMMENT ON FUNCTION get_my_classrooms() IS 'SECURITY DEFINER function to safely fetch the current user''s classrooms, avoiding RLS recursion.';
COMMIT;