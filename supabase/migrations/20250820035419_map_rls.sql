-- Migration: Fix RLS policy for classroom_team_maps to allow instructors/admins access
-- This allows team members, instructors, and admins to view team maps

-- Drop the existing policy
DROP POLICY IF EXISTS "team_members_view_team_maps" ON "public"."classroom_team_maps";

-- Create the updated policy that includes instructor/admin access
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
  -- Instructors and admins can view all team maps
  (EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('instructor', 'admin')
  ))
);

-- Optional: Create an index on user_roles for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles USING btree (user_id, role) 
TABLESPACE pg_default;