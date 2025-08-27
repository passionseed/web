-- Emergency fix for node_assessments RLS policies
-- These policies were dropped and need to be recreated immediately

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "instructors_can_manage_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_manage_assessments" ON public.node_assessments;

-- Recreate the policies
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

-- Map owners can also manage assessments for their maps
CREATE POLICY "map_owners_can_manage_assessments" ON public.node_assessments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);

-- Add a simple policy for map creators
CREATE POLICY "map_creators_can_manage_assessments" ON public.node_assessments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.map_nodes mn
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    WHERE mn.id = node_assessments.node_id
    AND lm.creator_id = auth.uid()
  )
);