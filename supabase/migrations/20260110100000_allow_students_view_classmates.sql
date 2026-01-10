-- Migration: Allow students to view classmates
-- Created: 2026-01-10
-- Description: Updates the 'view_memberships' policy to allow any member of a classroom to view all other memberships in that classroom.

BEGIN;

-- Drop the existing restricted policy
DROP POLICY IF EXISTS "view_memberships" ON public.classroom_memberships;

-- Create the new expanded policy
CREATE POLICY "view_memberships" ON public.classroom_memberships
FOR SELECT 
TO authenticated
USING (
    -- Allow if user is the instructor (via helper function)
    public.is_classroom_instructor(classroom_id, auth.uid()) OR
    -- OR if user is a member of the classroom (via helper function)
    public.is_classroom_member(classroom_id, auth.uid())
);

COMMIT;
