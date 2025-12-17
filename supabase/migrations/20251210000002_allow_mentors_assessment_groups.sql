-- Allow mentors to access assessment groups for their seed rooms
-- This fixes the issue where mentors couldn't view group work in seed rooms

-- Drop existing policy
DROP POLICY IF EXISTS "assessment_groups_access" ON public.assessment_groups;

-- Recreate with mentor access added
CREATE POLICY "assessment_groups_access" ON public.assessment_groups
    FOR SELECT
    USING (
        -- Original: users can see groups they're a member of
        id IN (SELECT public.get_user_assessment_group_ids(auth.uid()))
        OR
        -- Original: users can see groups they created
        created_by = auth.uid()
        OR
        -- NEW: mentors can see groups for their seed rooms
        (
            seed_room_id IS NOT NULL
            AND seed_room_id IN (
                SELECT id FROM public.seed_rooms
                WHERE mentor_id = auth.uid()
            )
        )
    );

-- Also update assessment_group_members to allow mentors to see members
DROP POLICY IF EXISTS "assessment_group_members_select" ON public.assessment_group_members;

CREATE POLICY "assessment_group_members_select" ON public.assessment_group_members
    FOR SELECT
    USING (
        -- Original: users can see members of groups they belong to
        group_id IN (SELECT public.get_user_assessment_group_ids(auth.uid()))
        OR
        -- Original: users can see their own membership
        user_id = auth.uid()
        OR
        -- NEW: mentors can see members of their seed room groups
        group_id IN (
            SELECT ag.id
            FROM public.assessment_groups ag
            WHERE ag.seed_room_id IN (
                SELECT id FROM public.seed_rooms
                WHERE mentor_id = auth.uid()
            )
        )
    );

COMMENT ON POLICY "assessment_groups_access" ON public.assessment_groups IS
'Allow access to assessment groups for: group members, creators, or mentors of the associated seed room';

COMMENT ON POLICY "assessment_group_members_select" ON public.assessment_group_members IS
'Allow viewing group members for: group members, self, or mentors of the associated seed room';
