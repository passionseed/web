-- Migration: Fix RLS Policy Recursion for classroom_memberships
-- Created: 2026-01-10
-- Description: Fixes infinite recursion in RLS policies between classroom_memberships and classrooms

BEGIN;

-- =====================================================
-- STEP 1: Drop ALL policies that depend on is_classroom_member
-- =====================================================

-- Policies on classrooms
DROP POLICY IF EXISTS "users_access_classrooms" ON public.classrooms;

-- Policies on classroom_assignments
DROP POLICY IF EXISTS "students_view_published_assignments" ON public.classroom_assignments;

-- Policies on assignment_nodes
DROP POLICY IF EXISTS "students_view_enrolled_assignment_nodes" ON public.assignment_nodes;

-- Policies on classroom_maps
DROP POLICY IF EXISTS "students_view_classroom_maps" ON public.classroom_maps;

-- Policies on classroom_memberships (all of them)
DROP POLICY IF EXISTS "view_own_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "join_as_student" ON public.classroom_memberships;
DROP POLICY IF EXISTS "leave_own_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_manage_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "authenticated_users_can_join" ON public.classroom_memberships;
DROP POLICY IF EXISTS "anyone_can_view_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "users_leave_classrooms" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_update_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "users_view_own_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "students_join_classrooms" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_manage_classroom_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "members_can_view_fellow_members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_view_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_insert_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "instructors_delete_memberships" ON public.classroom_memberships;
-- Drop new policies too in case of re-run
DROP POLICY IF EXISTS "view_memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "manage_memberships_insert" ON public.classroom_memberships;
DROP POLICY IF EXISTS "manage_memberships_update" ON public.classroom_memberships;
DROP POLICY IF EXISTS "manage_memberships_delete" ON public.classroom_memberships;

-- =====================================================
-- STEP 2: Drop and recreate the helper functions with SECURITY DEFINER
-- =====================================================

DROP FUNCTION IF EXISTS public.is_classroom_member(UUID, UUID);

CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER  -- Critical: bypasses RLS to prevent recursion
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO anon;

-- Create helper function to check if user is instructor (also needs SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.is_classroom_instructor(UUID, UUID);

CREATE OR REPLACE FUNCTION public.is_classroom_instructor(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classrooms 
        WHERE id = classroom_uuid 
        AND instructor_id = user_uuid
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_classroom_instructor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_classroom_instructor(UUID, UUID) TO anon;

-- =====================================================
-- STEP 3: Recreate all the policies using SECURITY DEFINER functions
-- =====================================================

-- CLASSROOMS policies
CREATE POLICY "users_access_classrooms" ON public.classrooms
FOR SELECT 
TO authenticated
USING (
    is_active = true OR
    instructor_id = auth.uid() OR
    public.is_classroom_member(id, auth.uid())
);

-- CLASSROOM_MEMBERSHIPS policies
CREATE POLICY "view_memberships" ON public.classroom_memberships
FOR SELECT 
TO authenticated
USING (
    user_id = auth.uid() OR 
    public.is_classroom_instructor(classroom_id, auth.uid())
);

CREATE POLICY "manage_memberships_insert" ON public.classroom_memberships
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() OR 
    public.is_classroom_instructor(classroom_id, auth.uid())
);

CREATE POLICY "manage_memberships_update" ON public.classroom_memberships
FOR UPDATE
TO authenticated
USING (public.is_classroom_instructor(classroom_id, auth.uid()));

CREATE POLICY "manage_memberships_delete" ON public.classroom_memberships
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR 
    public.is_classroom_instructor(classroom_id, auth.uid())
);

-- CLASSROOM_ASSIGNMENTS policies
CREATE POLICY "students_view_published_assignments" ON public.classroom_assignments
FOR SELECT 
USING (
    is_published = true AND
    public.is_classroom_member(classroom_id, auth.uid())
);

-- ASSIGNMENT_NODES policies
CREATE POLICY "students_view_enrolled_assignment_nodes" ON public.assignment_nodes
FOR SELECT 
USING (
    assignment_id IN (
        SELECT assignment_id FROM public.assignment_enrollments 
        WHERE user_id = auth.uid()
    ) OR
    assignment_id IN (
        SELECT ca.id FROM public.classroom_assignments ca
        WHERE ca.is_published = true 
        AND public.is_classroom_member(ca.classroom_id, auth.uid())
    )
);

-- CLASSROOM_MAPS policies
CREATE POLICY "students_view_classroom_maps" ON public.classroom_maps
FOR SELECT 
USING (
    is_active = true AND
    public.is_classroom_member(classroom_id, auth.uid())
);

COMMIT;
