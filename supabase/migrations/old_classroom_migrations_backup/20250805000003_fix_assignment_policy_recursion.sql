-- Migration: Fix Assignment Policy Recursion
-- Created: 2025-08-05
-- Description: Fixes infinite recursion by splitting assignment policies for instructors vs students

-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Users can view classroom assignments" ON public.classroom_assignments;

-- Create separate policies to avoid recursion

-- Policy 1: Instructors can view assignments they created (no membership check needed)
CREATE POLICY "Instructors can view their assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (created_by = auth.uid());

-- Policy 2: Students can view assignments for classrooms they're members of
CREATE POLICY "Students can view classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (
        -- Only check memberships for non-creators to avoid recursion
        created_by != auth.uid() AND
        classroom_id IN (
            SELECT classroom_id FROM public.classroom_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Also fix any potential recursion in classroom_memberships policies
-- Drop and recreate the problematic policies with simpler logic

DROP POLICY IF EXISTS "Students can view joined classrooms" ON public.classrooms;

-- Recreate with direct classroom_id check instead of EXISTS
CREATE POLICY "Members can view their classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        instructor_id = auth.uid() OR
        id IN (
            SELECT classroom_id FROM public.classroom_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Also ensure assignment_nodes policies don't cause recursion
DROP POLICY IF EXISTS "Instructors can manage assignment nodes" ON public.assignment_nodes;

CREATE POLICY "Instructors can manage assignment nodes" ON public.assignment_nodes
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

-- Fix enrollment policies to avoid recursion
DROP POLICY IF EXISTS "Instructors can update enrollments" ON public.assignment_enrollments;

CREATE POLICY "Instructors can update their assignment enrollments" ON public.assignment_enrollments
    FOR UPDATE 
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

DROP POLICY IF EXISTS "Instructors can manage enrollments" ON public.assignment_enrollments;

CREATE POLICY "Instructors can create assignment enrollments" ON public.assignment_enrollments
    FOR INSERT 
    WITH CHECK (
        assignment_id IN (
            SELECT id FROM public.classroom_assignments
            WHERE created_by = auth.uid()
        )
    );
