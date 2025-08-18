-- Fix infinite recursion in team_memberships RLS policies
-- The issue is that policies are querying the same table they're protecting

-- Drop all existing problematic policies for team_memberships
DROP POLICY IF EXISTS "Users can join teams in their classrooms" ON public.team_memberships;
DROP POLICY IF EXISTS "Team leaders and instructors can manage team memberships" ON public.team_memberships;
DROP POLICY IF EXISTS "Team leaders and instructors can remove team members" ON public.team_memberships;
DROP POLICY IF EXISTS "Users can view team memberships in their classrooms" ON public.team_memberships;

-- Create simpler, non-recursive policies

-- Policy 1: Users can view memberships for teams in their classrooms
CREATE POLICY "view_team_memberships_in_classroom" ON public.team_memberships
  FOR SELECT USING (
    team_id IN (
      SELECT ct.id 
      FROM public.classroom_teams ct
      JOIN public.classroom_memberships cm ON ct.classroom_id = cm.classroom_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Policy 2: Users can insert themselves into teams (join teams)
CREATE POLICY "join_teams_in_classroom" ON public.team_memberships
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (
      SELECT ct.id 
      FROM public.classroom_teams ct
      JOIN public.classroom_memberships cm ON ct.classroom_id = cm.classroom_id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Policy 3: Users can update their own memberships (leave teams)
CREATE POLICY "update_own_team_membership" ON public.team_memberships
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Policy 4: Classroom instructors/TAs can manage any team membership in their classroom
CREATE POLICY "instructors_manage_team_memberships" ON public.team_memberships
  FOR ALL USING (
    team_id IN (
      SELECT ct.id 
      FROM public.classroom_teams ct
      JOIN public.classroom_memberships cm ON ct.classroom_id = cm.classroom_id
      WHERE cm.user_id = auth.uid() AND cm.role IN ('instructor', 'ta')
    )
  );

-- Policy 5: Users can delete their own memberships (leave teams)
CREATE POLICY "leave_own_team" ON public.team_memberships
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Also simplify the classroom_teams policies to avoid any potential recursion
DROP POLICY IF EXISTS "Team leaders and classroom instructors can update teams" ON public.classroom_teams;

-- Create a simpler update policy for teams
CREATE POLICY "update_teams_in_classroom" ON public.classroom_teams
  FOR UPDATE USING (
    -- Team creator can update
    created_by = auth.uid() OR
    -- Classroom instructors/TAs can update any team in their classroom
    classroom_id IN (
      SELECT cm.classroom_id 
      FROM public.classroom_memberships cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('instructor', 'ta')
    )
  );

-- Add delete policy for teams
CREATE POLICY "delete_teams_in_classroom" ON public.classroom_teams
  FOR DELETE USING (
    -- Team creator can delete
    created_by = auth.uid() OR
    -- Classroom instructors/TAs can delete any team in their classroom
    classroom_id IN (
      SELECT cm.classroom_id 
      FROM public.classroom_memberships cm
      WHERE cm.user_id = auth.uid() AND cm.role IN ('instructor', 'ta')
    )
  );

-- Add helpful comments
COMMENT ON POLICY "view_team_memberships_in_classroom" ON public.team_memberships IS 'Allow viewing team memberships in classrooms user belongs to';
COMMENT ON POLICY "join_teams_in_classroom" ON public.team_memberships IS 'Allow users to join teams in their classrooms';
COMMENT ON POLICY "update_own_team_membership" ON public.team_memberships IS 'Allow users to update their own team membership';
COMMENT ON POLICY "instructors_manage_team_memberships" ON public.team_memberships IS 'Allow instructors/TAs to manage all team memberships in their classrooms';
COMMENT ON POLICY "leave_own_team" ON public.team_memberships IS 'Allow users to leave teams by deleting their membership';
COMMENT ON POLICY "update_teams_in_classroom" ON public.classroom_teams IS 'Allow team creators and classroom instructors to update teams';
COMMENT ON POLICY "delete_teams_in_classroom" ON public.classroom_teams IS 'Allow team creators and classroom instructors to delete teams';
