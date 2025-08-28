-- SECURITY FIX: Restrict map editing to proper permissions
-- Current issue: Any instructor can edit any map
-- Fix: Instructors can only edit maps in their classrooms

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "learning_maps_update_creator_or_instructor" ON public.learning_maps;
DROP POLICY IF EXISTS "learning_maps_delete_creator_or_instructor" ON public.learning_maps;

-- Create secure UPDATE policy
CREATE POLICY "learning_maps_update_secure" ON public.learning_maps
FOR UPDATE
USING (
    -- Map creator can always edit their own maps
    creator_id = auth.uid()
    OR
    -- Admins can edit any map
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
    OR
    -- Instructors/TAs can edit maps in their classrooms only
    EXISTS (
        SELECT 1 FROM public.classroom_maps cm
        JOIN public.classroom_memberships cmem ON cm.classroom_id = cmem.classroom_id
        WHERE cm.map_id = learning_maps.id
        AND cmem.user_id = auth.uid()
        AND cmem.role IN ('instructor', 'ta')
    )
);

-- Create secure DELETE policy  
CREATE POLICY "learning_maps_delete_secure" ON public.learning_maps
FOR DELETE
USING (
    -- Map creator can always delete their own maps
    creator_id = auth.uid()
    OR
    -- Admins can delete any map
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
    OR
    -- Instructors can delete maps in their classrooms only
    EXISTS (
        SELECT 1 FROM public.classroom_maps cm
        JOIN public.classroom_memberships cmem ON cm.classroom_id = cmem.classroom_id
        WHERE cm.map_id = learning_maps.id
        AND cmem.user_id = auth.uid()
        AND cmem.role = 'instructor'
    )
);