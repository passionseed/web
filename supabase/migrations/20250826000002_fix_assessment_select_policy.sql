-- Fix assessment SELECT policy to ensure assessments can be viewed when loading maps
-- The current policies might be too restrictive for viewing assessments

-- Drop the current view policy and create a more comprehensive one
DROP POLICY IF EXISTS "map_owners_can_view_assessments" ON public.node_assessments;

-- Allow anyone to view assessments on public maps they have access to
CREATE POLICY "users_can_view_assessments" ON public.node_assessments
FOR SELECT USING (
  -- Map owners can always view their assessments
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
  OR
  -- Users enrolled in the map can view assessments
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.user_map_enrollments ume ON mn.map_id = ume.map_id
    WHERE mn.id = node_assessments.node_id
    AND ume.user_id = auth.uid()
  )
  OR  
  -- Members of classrooms with the map can view assessments
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.classroom_maps cm ON mn.map_id = cm.map_id
    JOIN public.classroom_memberships cmem ON cm.classroom_id = cmem.classroom_id
    WHERE mn.id = node_assessments.node_id
    AND cmem.user_id = auth.uid()
  )
);

-- Also ensure we have a comprehensive policy for all operations
-- Drop and recreate the "FOR ALL" policies to be more specific

DROP POLICY IF EXISTS "instructors_can_manage_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_manage_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_creators_can_manage_assessments" ON public.node_assessments;

-- Create separate policies for each operation for clarity
CREATE POLICY "map_owners_insert_assessments" ON public.node_assessments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

CREATE POLICY "map_owners_update_assessments" ON public.node_assessments  
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

CREATE POLICY "map_owners_delete_assessments" ON public.node_assessments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

-- Add classroom instructor policies
CREATE POLICY "instructors_manage_classroom_assessments" ON public.node_assessments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.classroom_maps cm ON mn.map_id = cm.map_id
    JOIN public.classroom_memberships cmem ON cm.classroom_id = cmem.classroom_id
    WHERE mn.id = node_assessments.node_id
    AND cmem.user_id = auth.uid()
    AND cmem.role IN ('instructor', 'ta')
  )
);