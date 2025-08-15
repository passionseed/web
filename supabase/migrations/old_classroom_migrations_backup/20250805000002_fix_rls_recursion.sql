-- Migration: Fix RLS Policy Infinite Recursion
-- Created: 2025-08-05
-- Description: Fixes infinite recursion in classroom RLS policies

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their classrooms" ON public.classrooms;
DROP POLICY IF EXISTS "Instructors can manage classroom members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Users can view classroom memberships" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can remove members" ON public.classroom_memberships;
DROP POLICY IF EXISTS "Instructors can create assignments" ON public.classroom_assignments;

-- Recreate policies without recursion

-- Instructors can view their own classrooms
CREATE POLICY "Instructors can view their classrooms" ON public.classrooms
    FOR SELECT 
    USING (instructor_id = auth.uid());

-- Students can view classrooms they're members of (no recursion)
CREATE POLICY "Students can view joined classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_memberships 
            WHERE classroom_id = id 
            AND user_id = auth.uid()
        )
    );

-- Fix classroom memberships policies
CREATE POLICY "Instructors can manage classroom members" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

CREATE POLICY "Users can view classroom memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (
        user_id = auth.uid() OR
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can remove members" ON public.classroom_memberships
    FOR DELETE 
    USING (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Fix classroom assignments policies
CREATE POLICY "Instructors can create assignments" ON public.classroom_assignments
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() AND
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Fix remaining assignment policies to avoid potential recursion
DROP POLICY IF EXISTS "Instructors can manage assignment nodes" ON public.assignment_nodes;
CREATE POLICY "Instructors can manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Instructors can manage enrollments" ON public.assignment_enrollments;
CREATE POLICY "Instructors can manage enrollments" ON public.assignment_enrollments
    FOR INSERT 
    WITH CHECK (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Instructors can update enrollments" ON public.assignment_enrollments;
CREATE POLICY "Instructors can update enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    )
    WITH CHECK (
        assignment_id IN (
            SELECT ca.id FROM public.classroom_assignments ca
            WHERE ca.created_by = auth.uid()
        )
    );
