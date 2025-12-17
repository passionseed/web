-- Fix infinite recursion in assessment_groups RLS by using SECURITY DEFINER functions

-- Create helper function to check if user can access an assessment group (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_can_access_assessment_group(
    p_user_id UUID,
    p_group_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_seed_room_id UUID;
    v_is_member BOOLEAN;
    v_is_mentor BOOLEAN;
    v_is_creator BOOLEAN;
BEGIN
    -- Check if user created the group
    SELECT EXISTS(
        SELECT 1 FROM public.assessment_groups
        WHERE id = p_group_id AND created_by = p_user_id
    ) INTO v_is_creator;

    IF v_is_creator THEN
        RETURN TRUE;
    END IF;

    -- Check if user is a member of the group
    SELECT EXISTS(
        SELECT 1 FROM public.assessment_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    ) INTO v_is_member;

    IF v_is_member THEN
        RETURN TRUE;
    END IF;

    -- Check if this is a seed room group
    SELECT seed_room_id INTO v_seed_room_id
    FROM public.assessment_groups
    WHERE id = p_group_id;

    IF v_seed_room_id IS NOT NULL THEN
        -- Check if user is the mentor of this seed room
        SELECT EXISTS(
            SELECT 1 FROM public.seed_rooms
            WHERE id = v_seed_room_id AND mentor_id = p_user_id
        ) INTO v_is_mentor;

        IF v_is_mentor THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop all existing assessment_groups policies
DROP POLICY IF EXISTS "assessment_groups_classroom_access" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_access" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_insert" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_modify" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_delete" ON public.assessment_groups;

-- Create simplified policies using the helper function
CREATE POLICY "assessment_groups_select" ON public.assessment_groups
    FOR SELECT
    USING (public.user_can_access_assessment_group(auth.uid(), id));

CREATE POLICY "assessment_groups_insert" ON public.assessment_groups
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "assessment_groups_update" ON public.assessment_groups
    FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "assessment_groups_delete" ON public.assessment_groups
    FOR DELETE
    USING (created_by = auth.uid());

-- Create helper function for assessment_group_members access
CREATE OR REPLACE FUNCTION public.user_can_access_group_members(
    p_user_id UUID,
    p_group_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Reuse the assessment group access function
    RETURN public.user_can_access_assessment_group(p_user_id, p_group_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop all existing assessment_group_members policies
DROP POLICY IF EXISTS "assessment_group_members_classroom_access" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_access" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_select" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_insert" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_delete" ON public.assessment_group_members;

-- Create simplified policies for assessment_group_members
CREATE POLICY "assessment_group_members_select" ON public.assessment_group_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.user_can_access_group_members(auth.uid(), group_id)
    );

CREATE POLICY "assessment_group_members_insert" ON public.assessment_group_members
    FOR INSERT
    WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "assessment_group_members_delete" ON public.assessment_group_members
    FOR DELETE
    USING (assigned_by = auth.uid() OR user_id = auth.uid());

-- Add comments
COMMENT ON FUNCTION public.user_can_access_assessment_group IS
'Security definer function to check if user can access an assessment group. Checks: group creator, group member, or mentor of associated seed room.';

COMMENT ON FUNCTION public.user_can_access_group_members IS
'Security definer function to check if user can access group members. Uses user_can_access_assessment_group.';

COMMENT ON POLICY "assessment_groups_select" ON public.assessment_groups IS
'Allow users to view groups they created, are members of, or are mentors for (seed rooms)';

COMMENT ON POLICY "assessment_group_members_select" ON public.assessment_group_members IS
'Allow users to view members of groups they can access, or their own membership';
