-- Fix RLS policies for assessment_groups and assessment_group_members
-- Uses SECURITY DEFINER function to avoid infinite recursion

-- ============================================
-- HELPER FUNCTION (bypasses RLS to prevent recursion)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_assessment_group_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
    SELECT group_id FROM public.assessment_group_members WHERE user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- ASSESSMENT_GROUPS POLICIES
-- ============================================

DROP POLICY IF EXISTS "assessment_groups_classroom_access" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_access" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_insert" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_modify" ON public.assessment_groups;
DROP POLICY IF EXISTS "assessment_groups_delete" ON public.assessment_groups;

-- SELECT: users can see groups they're a member of or created
CREATE POLICY "assessment_groups_access" ON public.assessment_groups
    FOR SELECT
    USING (
        id IN (SELECT public.get_user_assessment_group_ids(auth.uid()))
        OR
        created_by = auth.uid()
    );

-- INSERT: user must be the creator
CREATE POLICY "assessment_groups_insert" ON public.assessment_groups
    FOR INSERT
    WITH CHECK (created_by = auth.uid());

-- UPDATE: only creator can modify
CREATE POLICY "assessment_groups_modify" ON public.assessment_groups
    FOR UPDATE
    USING (created_by = auth.uid());

-- DELETE: only creator can delete
CREATE POLICY "assessment_groups_delete" ON public.assessment_groups
    FOR DELETE
    USING (created_by = auth.uid());

-- ============================================
-- ASSESSMENT_GROUP_MEMBERS POLICIES
-- ============================================

DROP POLICY IF EXISTS "assessment_group_members_classroom_access" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_access" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_select" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_insert" ON public.assessment_group_members;
DROP POLICY IF EXISTS "assessment_group_members_delete" ON public.assessment_group_members;

-- SELECT: users can see members of groups they belong to
CREATE POLICY "assessment_group_members_select" ON public.assessment_group_members
    FOR SELECT
    USING (
        group_id IN (SELECT public.get_user_assessment_group_ids(auth.uid()))
        OR
        user_id = auth.uid()
    );

-- INSERT: assigned_by must be current user
CREATE POLICY "assessment_group_members_insert" ON public.assessment_group_members
    FOR INSERT
    WITH CHECK (assigned_by = auth.uid());

-- DELETE: assigned_by or self can remove
CREATE POLICY "assessment_group_members_delete" ON public.assessment_group_members
    FOR DELETE
    USING (assigned_by = auth.uid() OR user_id = auth.uid());
