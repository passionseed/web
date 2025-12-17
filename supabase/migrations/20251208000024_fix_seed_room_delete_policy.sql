-- Allow admins and instructors to delete seed rooms
-- This is needed for the admin lobbies management interface

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admins and instructors can delete seed rooms" ON public.seed_rooms;

-- Create new delete policy for admins and instructors
CREATE POLICY "Admins and instructors can delete seed rooms" ON public.seed_rooms
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'instructor')
        )
    );

-- Also ensure admins/instructors can view all rooms for management
DROP POLICY IF EXISTS "Admins and instructors can view all seed rooms" ON public.seed_rooms;

CREATE POLICY "Admins and instructors can view all seed rooms" ON public.seed_rooms
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'instructor')
        )
    );
