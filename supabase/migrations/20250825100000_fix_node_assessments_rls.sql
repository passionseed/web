-- Fix node_assessments RLS policies by adding missing INSERT/UPDATE/DELETE policies
-- The previous migration only added SELECT policy, causing RLS violations on creation

-- Instructors and TAs can create/update/delete assessments for nodes in their classrooms
CREATE POLICY "instructors_can_manage_assessments" ON public.node_assessments
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

-- Map owners can also manage assessments for their maps (in case they're not classroom members)
CREATE POLICY "map_owners_can_manage_assessments" ON public.node_assessments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);