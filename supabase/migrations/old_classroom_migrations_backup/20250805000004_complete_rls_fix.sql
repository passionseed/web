-- Migration: Complete RLS Policy Recursion Fix
-- Created: 2025-08-05
-- Description: Completely eliminates circular references in RLS policies

-- First, let's drop ALL policies that could cause recursion
DROP POLICY IF EXISTS "Students can view joined classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Members can view their classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Users can view classroom assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Instructors can view their assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Students can view classroom assignments" ON public.classroom_assignments;
DROP POLICY IF EXISTS "Users can view classroom memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can manage classroom members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can remove members" ON public.classroom_memberships;

-- ========================================
-- SIMPLE POLICIES WITHOUT CROSS-REFERENCES
-- ========================================

-- 1. CLASSROOMS: Only instructor-based access (no membership checks)
CREATE POLICY "Instructors access their classrooms" ON public.classrooms
    FOR ALL 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- 2. CLASSROOM_ASSIGNMENTS: Only creator-based access (no membership checks for instructors)
CREATE POLICY "Creators access their assignments" ON public.classroom_assignments
    FOR ALL 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- 3. CLASSROOM_MEMBERSHIPS: Simple user-based access
CREATE POLICY "Users manage their memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can join classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (user_id = auth.uid() AND role = 'student');

CREATE POLICY "Users can leave classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

-- 4. Separate policies for instructors managing memberships (using direct classroom ownership)
CREATE POLICY "Instructors manage memberships" ON public.classroom_memberships
    FOR ALL 
    USING (
        -- Direct check: user owns the classroom (no subquery to avoid recursion)
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND instructor_id = auth.uid()
        )
    );

-- ========================================
-- STUDENT ACCESS POLICIES (SEPARATE TO AVOID RECURSION)
-- ========================================

-- Students need a separate way to access classrooms they've joined
-- We'll use a function-based approach to avoid RLS recursion

-- Create a function to check if user is member of classroom
CREATE OR REPLACE FUNCTION public.is_classroom_member(classroom_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.classroom_memberships 
        WHERE classroom_id = classroom_uuid 
        AND user_id = user_uuid
    );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;

-- Now create student access policies using the function
CREATE POLICY "Students access joined classrooms" ON public.classrooms
    FOR SELECT 
    USING (public.is_classroom_member(id, auth.uid()));

CREATE POLICY "Students access classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (public.is_classroom_member(classroom_id, auth.uid()));

-- ========================================
-- ASSIGNMENT NODES AND ENROLLMENTS (SIMPLIFIED)
-- ========================================

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Instructors can manage assignment nodes" ON public.assignment_nodes;
DROP POLICY IF EXISTS "Students can view assignment nodes" ON public.assignment_nodes;
DROP POLICY IF EXISTS "Instructors can create assignment enrollments" ON public.assignment_enrollments;
DROP POLICY IF EXISTS "Instructors can update their assignment enrollments" ON public.assignment_enrollments;
DROP POLICY IF EXISTS "Users can view their enrollments" ON public.assignment_enrollments;
DROP POLICY IF EXISTS "Students can update their own enrollments" ON public.assignment_enrollments;

-- Simple creator-based policies for assignment nodes
CREATE POLICY "Creators manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        )
    );

-- Simple creator-based policies for assignment enrollments
CREATE POLICY "Creators manage enrollments" ON public.assignment_enrollments
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    )
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments 
            WHERE created_by = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Students can view nodes for their enrollments
CREATE POLICY "Students view enrolled assignment nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        assignment_id IN (
            SELECT assignment_id FROM public.assignment_enrollments 
            WHERE user_id = auth.uid()
        )
    );
