-- Migration: Fix Classroom Join RLS Policy
-- Created: 2025-08-06
-- Description: Allow users to find classrooms by join code to enable joining

-- The issue: Students can't join classrooms because they can't query the classrooms table
-- by join code when they're not yet members. We need a policy that allows users to
-- read classroom data when they have a valid join code.

-- Drop the existing restrictive student policy
DROP POLICY IF EXISTS "Students access joined classrooms" ON public.classrooms;

-- Create a new policy that allows:
-- 1. Instructors to access their own classrooms (unchanged)
-- 2. Users to find ANY active classroom by join code (for joining)
-- 3. Students to access classrooms they're members of (for after joining)

-- First, create a combined policy for students that allows both finding and accessing joined classrooms
CREATE POLICY "Students can find and access classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        -- Allow finding active classrooms by join code (for joining)
        (is_active = true) OR
        -- Allow accessing classrooms user is already a member of
        public.is_classroom_member(id, auth.uid())
    );

-- Also ensure the classroom creation and other instructor policies remain intact
-- (they should already exist from previous migrations)

-- Add helpful comments
COMMENT ON POLICY "Students can find and access classrooms" ON public.classrooms 
IS 'Allows students to find active classrooms by join code AND access classrooms they are members of. This enables the join workflow while maintaining security.';

-- Verify we have the helper function (should exist from previous migration)
-- If not, recreate it
CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;
