-- Fix RLS policies for assessment_groups to support seed maps
-- The existing policies only allow access for classroom_exclusive maps
-- This migration adds support for seed maps

BEGIN;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "assessment_groups_classroom_access" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_group_members_classroom_access" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_groups_access" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_group_members_access" ON public.assessment_group_members;

-- Create new RLS policy for assessment_groups that supports both classroom and seed maps
CREATE POLICY "assessment_groups_access" ON public.assessment_groups
    FOR ALL
    USING (
        -- Allow access for classroom maps (original logic)
        EXISTS (
            SELECT 1 FROM public.node_assessments na
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
            WHERE na.id = assessment_groups.assessment_id
            AND cm.user_id = auth.uid()
            AND lm.map_type = 'classroom_exclusive'
        )
        OR
        -- Allow access for seed maps (new logic)
        EXISTS (
            SELECT 1 FROM public.node_assessments na
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            JOIN public.seed_room_members srm ON srm.room_id = assessment_groups.seed_room_id
            WHERE na.id = assessment_groups.assessment_id
            AND srm.user_id = auth.uid()
            AND lm.map_type = 'seed'
            AND assessment_groups.seed_room_id IS NOT NULL
        )
    );

-- Create new RLS policy for assessment_group_members that supports both classroom and seed maps
CREATE POLICY "assessment_group_members_access" ON public.assessment_group_members
    FOR ALL
    USING (
        -- Allow access for classroom maps (original logic)
        EXISTS (
            SELECT 1 FROM public.assessment_groups ag
            JOIN public.node_assessments na ON ag.assessment_id = na.id
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
            WHERE ag.id = assessment_group_members.group_id
            AND cm.user_id = auth.uid()
            AND lm.map_type = 'classroom_exclusive'
        )
        OR
        -- Allow access for seed maps (new logic)
        EXISTS (
            SELECT 1 FROM public.assessment_groups ag
            JOIN public.seed_room_members srm ON srm.room_id = ag.seed_room_id
            WHERE ag.id = assessment_group_members.group_id
            AND srm.user_id = auth.uid()
            AND ag.seed_room_id IS NOT NULL
        )
    );

-- Add comments
COMMENT ON POLICY "assessment_groups_access" ON public.assessment_groups IS 
'Allow access to assessment groups for classroom members (classroom maps) or seed room members (seed maps)';

COMMENT ON POLICY "assessment_group_members_access" ON public.assessment_group_members IS 
'Allow access to assessment group members for classroom members (classroom maps) or seed room members (seed maps)';

COMMIT;
