-- Migration: Fix RLS policy for classroom_team_maps to properly allow student access
-- This ensures students who are team members can access their team maps

BEGIN;

-- Drop the existing policy
DROP POLICY IF EXISTS "team_members_view_team_maps" ON "public"."classroom_team_maps";

-- Create the updated policy that properly handles all user types
CREATE POLICY "team_members_view_team_maps"
ON "public"."classroom_team_maps"
FOR SELECT
TO public
USING (
  -- Team members can view (active memberships only)
  (EXISTS (
    SELECT 1
    FROM team_memberships tm
    WHERE tm.user_id = auth.uid() 
      AND tm.team_id = classroom_team_maps.team_id
      AND tm.left_at IS NULL
  ))
  OR
  -- Users who are in the same classroom as the team can view
  (EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN classroom_teams ct ON tm.team_id = ct.id
    JOIN classroom_memberships cm ON ct.classroom_id = cm.classroom_id
    WHERE cm.user_id = auth.uid()
      AND tm.team_id = classroom_team_maps.team_id
      AND tm.left_at IS NULL
  ))
  OR
  -- Instructors and admins can view all team maps
  (EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('instructor', 'admin')
  ))
  OR
  -- Users with any role (including students) who are team members
  (EXISTS (
    SELECT 1 
    FROM team_memberships tm
    LEFT JOIN user_roles ur ON ur.user_id = tm.user_id
    WHERE tm.user_id = auth.uid()
      AND tm.team_id = classroom_team_maps.team_id
      AND tm.left_at IS NULL
      AND (ur.role IS NULL OR ur.role IN ('student', 'instructor', 'admin', 'TA'))
  ))
);

-- Create an index to optimize the team membership lookups
CREATE INDEX IF NOT EXISTS idx_team_memberships_user_team_active 
ON public.team_memberships (user_id, team_id, left_at) 
WHERE left_at IS NULL;

-- Add a comment explaining the policy
COMMENT ON POLICY "team_members_view_team_maps" ON "public"."classroom_team_maps" IS 
'Allows team members, classroom members, and users with appropriate roles to view team maps. Includes specific support for students who may not have explicit roles.';

COMMIT;