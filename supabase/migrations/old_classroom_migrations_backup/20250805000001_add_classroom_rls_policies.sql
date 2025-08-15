-- Migration: Add RLS Policies for Classroom System
-- Created: 2025-08-05
-- Description: Creates Row Level Security policies for classroom tables

-- Enable RLS on all classroom tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CLASSROOMS POLICIES
-- ========================================

-- Instructors can create classrooms
CREATE POLICY "Instructors can create classrooms" ON public.classrooms
    FOR INSERT 
    WITH CHECK (
        auth.uid() = instructor_id AND
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('instructor', 'TA')
        )
    );

-- Users can view classrooms they created
CREATE POLICY "Instructors can view their classrooms" ON public.classrooms
    FOR SELECT 
    USING (instructor_id = auth.uid());

-- Students can view classrooms they're members of
CREATE POLICY "Students can view joined classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_memberships 
            WHERE classroom_id = id 
            AND user_id = auth.uid()
        )
    );

-- Instructors can update their own classrooms
CREATE POLICY "Instructors can update their classrooms" ON public.classrooms
    FOR UPDATE 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- Instructors can delete their own classrooms
CREATE POLICY "Instructors can delete their classrooms" ON public.classrooms
    FOR DELETE 
    USING (instructor_id = auth.uid());

-- ========================================
-- CLASSROOM MEMBERSHIPS POLICIES
-- ========================================

-- Students can join classrooms (insert membership)
CREATE POLICY "Students can join classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid() AND
        role = 'student' AND
        EXISTS (
            SELECT 1 FROM public.classrooms 
            WHERE id = classroom_id 
            AND is_active = true
        )
    );

-- Instructors can add members to their classrooms
CREATE POLICY "Instructors can manage classroom members" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Users can view memberships for their classrooms
CREATE POLICY "Users can view classroom memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (
        user_id = auth.uid() OR
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Users can leave classrooms (delete their own membership)
CREATE POLICY "Students can leave classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

-- Instructors can remove members from their classrooms
CREATE POLICY "Instructors can remove members" ON public.classroom_memberships
    FOR DELETE 
    USING (
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- ========================================
-- CLASSROOM ASSIGNMENTS POLICIES
-- ========================================

-- Instructors can create assignments in their classrooms
CREATE POLICY "Instructors can create assignments" ON public.classroom_assignments
    FOR INSERT 
    WITH CHECK (
        created_by = auth.uid() AND
        classroom_id IN (
            SELECT id FROM public.classrooms 
            WHERE instructor_id = auth.uid()
        )
    );

-- Users can view assignments for classrooms they're in
CREATE POLICY "Users can view classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classroom_memberships 
            WHERE classroom_id = classroom_assignments.classroom_id 
            AND user_id = auth.uid()
        )
    );

-- Instructors can update assignments they created
CREATE POLICY "Instructors can update their assignments" ON public.classroom_assignments
    FOR UPDATE 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Instructors can delete assignments they created
CREATE POLICY "Instructors can delete their assignments" ON public.classroom_assignments
    FOR DELETE 
    USING (created_by = auth.uid());

-- ========================================
-- ASSIGNMENT NODES POLICIES
-- ========================================

-- Instructors can manage nodes in their assignments
CREATE POLICY "Instructors can manage assignment nodes" ON public.assignment_nodes
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Students can view nodes for assignments they're enrolled in
CREATE POLICY "Students can view assignment nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.assignment_enrollments 
            WHERE assignment_id = assignment_nodes.assignment_id 
            AND user_id = auth.uid()
        )
    );

-- ========================================
-- ASSIGNMENT ENROLLMENTS POLICIES
-- ========================================

-- Instructors can enroll students in assignments
CREATE POLICY "Instructors can manage enrollments" ON public.assignment_enrollments
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Users can view their own enrollments
CREATE POLICY "Users can view their enrollments" ON public.assignment_enrollments
    FOR SELECT 
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Instructors can update enrollments for their assignments
CREATE POLICY "Instructors can update enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.classroom_assignments ca
            JOIN public.classrooms c ON ca.classroom_id = c.id
            WHERE ca.id = assignment_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Students can update their own enrollment status (for self-reporting progress)
CREATE POLICY "Students can update their own enrollments" ON public.assignment_enrollments
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
