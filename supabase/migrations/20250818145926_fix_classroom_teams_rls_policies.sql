-- Fix RLS policies for classroom teams to allow students to create teams
-- The original policy was too restrictive, only allowing instructors/TAs to create teams

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Classroom instructors and leaders can create teams" ON public.classroom_teams;

-- Create a new policy that allows any classroom member (including students) to create teams
CREATE POLICY "Classroom members can create teams" ON public.classroom_teams
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    classroom_id IN (
      SELECT classroom_id FROM public.classroom_memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Also update the policy name for team memberships to be more inclusive
-- First, let's check if we need to update the team memberships policy as well
-- The current policy should already allow students to join teams, but let's make it explicit

-- Drop and recreate the team memberships policy to be more clear
DROP POLICY IF EXISTS "Team leaders and classroom instructors can manage memberships" ON public.team_memberships;

-- Create separate policies for different operations on team memberships
CREATE POLICY "Users can join teams in their classrooms" ON public.team_memberships
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (
      SELECT id FROM public.classroom_teams 
      WHERE classroom_id IN (
        SELECT classroom_id FROM public.classroom_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team leaders and instructors can manage team memberships" ON public.team_memberships
  FOR UPDATE USING (
    -- Team leaders can manage their team
    team_id IN (
      SELECT team_id FROM public.team_memberships 
      WHERE user_id = auth.uid() AND is_leader = true AND left_at IS NULL
    ) OR
    -- Classroom instructors/TAs can manage any team in their classroom
    team_id IN (
      SELECT id FROM public.classroom_teams 
      WHERE classroom_id IN (
        SELECT classroom_id FROM public.classroom_memberships 
        WHERE user_id = auth.uid() AND role IN ('instructor', 'ta')
      )
    ) OR
    -- Users can update their own membership (e.g., to leave a team)
    user_id = auth.uid()
  );

CREATE POLICY "Team leaders and instructors can remove team members" ON public.team_memberships
  FOR DELETE USING (
    -- Team leaders can remove members from their team
    team_id IN (
      SELECT team_id FROM public.team_memberships 
      WHERE user_id = auth.uid() AND is_leader = true AND left_at IS NULL
    ) OR
    -- Classroom instructors/TAs can remove any team member in their classroom
    team_id IN (
      SELECT id FROM public.classroom_teams 
      WHERE classroom_id IN (
        SELECT classroom_id FROM public.classroom_memberships 
        WHERE user_id = auth.uid() AND role IN ('instructor', 'ta')
      )
    ) OR
    -- Users can remove themselves from a team
    user_id = auth.uid()
  );

-- Add a comment explaining the policy changes
COMMENT ON POLICY "Classroom members can create teams" ON public.classroom_teams IS 'Allows any classroom member (students, TAs, instructors) to create teams within their classroom';
COMMENT ON POLICY "Users can join teams in their classrooms" ON public.team_memberships IS 'Allows users to join teams in classrooms they are members of';
COMMENT ON POLICY "Team leaders and instructors can manage team memberships" ON public.team_memberships IS 'Allows team leaders and classroom instructors to update team memberships';
COMMENT ON POLICY "Team leaders and instructors can remove team members" ON public.team_memberships IS 'Allows team leaders and classroom instructors to remove team members';
