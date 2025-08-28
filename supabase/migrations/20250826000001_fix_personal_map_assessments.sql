-- Allow personal map creators to create assessments on their own maps
-- This fixes the issue where personal maps (not in classrooms) can't create assessments

-- Add a simple policy that allows any authenticated user to create assessments on maps they own
CREATE POLICY "map_owners_can_create_assessments" ON public.node_assessments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

-- Also allow them to update and delete their own assessments
CREATE POLICY "map_owners_can_modify_assessments" ON public.node_assessments
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

CREATE POLICY "map_owners_can_delete_assessments" ON public.node_assessments
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

-- Allow map owners to view their assessments
CREATE POLICY "map_owners_can_view_assessments" ON public.node_assessments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);