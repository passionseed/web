-- Migration: Fix UUID Generation for Classroom System
-- Created: 2025-08-07
-- Description: Replace uuid_generate_v4() with gen_random_uuid() which is built into PostgreSQL 13+

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.assignment_enrollments CASCADE;
DROP TABLE IF EXISTS public.assignment_nodes CASCADE;
DROP TABLE IF EXISTS public.classroom_assignments CASCADE;
DROP TABLE IF EXISTS public.classroom_memberships CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;

-- Create classrooms table with gen_random_uuid()
CREATE TABLE public.classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code VARCHAR(8) UNIQUE NOT NULL,
    max_students INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classrooms_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT classrooms_join_code_format CHECK (join_code ~ '^[A-Z0-9]{6}$'),
    CONSTRAINT classrooms_max_students_positive CHECK (max_students > 0)
);

-- Create classroom_memberships table
CREATE TABLE public.classroom_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'ta', 'student')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint to prevent duplicate memberships
    UNIQUE(classroom_id, user_id)
);

-- Create classroom_assignments table
CREATE TABLE public.classroom_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    default_due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignments_title_length CHECK (char_length(title) >= 1)
);

-- Create assignment_nodes table (junction table for assignments and map nodes)
CREATE TABLE public.assignment_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate node assignments
    UNIQUE(assignment_id, node_id)
);

-- Create assignment_enrollments table (tracks which students are enrolled in assignments)
CREATE TABLE public.assignment_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ, -- Individual due date (overrides default)
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    
    -- Unique constraint to prevent duplicate enrollments
    UNIQUE(assignment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_classrooms_instructor ON public.classrooms(instructor_id);
CREATE INDEX idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX idx_classroom_memberships_classroom ON public.classroom_memberships(classroom_id);
CREATE INDEX idx_classroom_memberships_user ON public.classroom_memberships(user_id);
CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments(classroom_id);
CREATE INDEX idx_classroom_assignments_creator ON public.classroom_assignments(created_by);
CREATE INDEX idx_assignment_nodes_assignment ON public.assignment_nodes(assignment_id);
CREATE INDEX idx_assignment_nodes_node ON public.assignment_nodes(node_id);
CREATE INDEX idx_assignment_enrollments_assignment ON public.assignment_enrollments(assignment_id);
CREATE INDEX idx_assignment_enrollments_user ON public.assignment_enrollments(user_id);

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is member of classroom (security definer to avoid RLS recursion)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_classroom_member(UUID, UUID) TO authenticated;

-- RLS Policies for classrooms
CREATE POLICY "Instructors access their classrooms" ON public.classrooms
    FOR ALL 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Students can find and access classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        -- Allow finding active classrooms by join code (for joining)
        (is_active = true) OR
        -- Allow accessing classrooms user is already a member of
        public.is_classroom_member(id, auth.uid())
    );

-- RLS Policies for classroom_memberships
CREATE POLICY "Users manage their memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can join classrooms" ON public.classroom_memberships
    FOR INSERT 
    WITH CHECK (user_id = auth.uid() AND role = 'student');

CREATE POLICY "Users can leave classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

CREATE POLICY "Instructors manage memberships" ON public.classroom_memberships
    FOR ALL 
    USING (
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

-- RLS Policies for classroom_assignments
CREATE POLICY "Creators access their assignments" ON public.classroom_assignments
    FOR ALL 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Students access classroom assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (public.is_classroom_member(classroom_id, auth.uid()));

-- RLS Policies for assignment_nodes
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

CREATE POLICY "Students view enrolled assignment nodes" ON public.assignment_nodes
    FOR SELECT 
    USING (
        assignment_id IN (
            SELECT assignment_id FROM public.assignment_enrollments 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for assignment_enrollments
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

-- Add helpful comments
COMMENT ON TABLE public.classrooms IS 'Virtual classrooms for organizing students and assignments';
COMMENT ON TABLE public.classroom_memberships IS 'Tracks user membership in classrooms with roles';
COMMENT ON TABLE public.classroom_assignments IS 'Assignments created within classrooms';
COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific learning map nodes';
COMMENT ON TABLE public.assignment_enrollments IS 'Tracks which students are enrolled in which assignments';
COMMENT ON FUNCTION public.is_classroom_member(UUID, UUID) IS 'Security definer function to check classroom membership without RLS recursion';
