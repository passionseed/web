-- Fix: Re-enable RLS on classroom_team_maps
-- RLS was accidentally disabled by 20250915095735_remote_schema.sql (Supabase remote schema sync)
-- which also dropped the team_leaders_insert_team_maps INSERT policy.

BEGIN;

-- 1. Re-enable RLS
ALTER TABLE public.classroom_team_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_team_maps FORCE ROW LEVEL SECURITY;

-- 2. Drop existing policies to rebuild cleanly
DROP POLICY IF EXISTS "team_members_view_team_maps" ON public.classroom_team_maps;
DROP POLICY IF EXISTS "team_leaders_insert_team_maps" ON public.classroom_team_maps;

-- 3. SELECT: classroom members can view team maps in their classroom
CREATE POLICY "view_classroom_team_maps"
ON public.classroom_team_maps
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_teams ct
    WHERE ct.id = classroom_team_maps.team_id
      AND public.can_access_classroom(ct.classroom_id, auth.uid())
  )
);

-- 4. INSERT: team leaders and instructors/admins can create team maps
CREATE POLICY "insert_classroom_team_maps"
ON public.classroom_team_maps
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_memberships tm
    WHERE tm.user_id = auth.uid()
      AND tm.team_id = classroom_team_maps.team_id
      AND tm.is_leader = true
      AND tm.left_at IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM public.classroom_teams ct
    WHERE ct.id = classroom_team_maps.team_id
      AND (public.is_classroom_instructor(ct.classroom_id) OR public.is_admin(auth.uid()))
  )
);

-- 5. ALL: instructors and admins can fully manage team maps
CREATE POLICY "manage_classroom_team_maps"
ON public.classroom_team_maps
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classroom_teams ct
    WHERE ct.id = classroom_team_maps.team_id
      AND (public.is_classroom_instructor(ct.classroom_id) OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.classroom_teams ct
    WHERE ct.id = classroom_team_maps.team_id
      AND (public.is_classroom_instructor(ct.classroom_id) OR public.is_admin(auth.uid()))
  )
);

COMMIT;
