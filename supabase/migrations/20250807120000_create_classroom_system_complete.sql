-- Migration: Complete Classroom System Creation
-- Created: 2025-08-07 12:00:00
-- Description: Creates a comprehensive classroom system with proper RLS policies, 
--              constraints, and helper functions. This migration consolidates all 
--              classroom functionality into a single file with fixes applied.

-- ========================================
-- EXTENSIONS AND PREREQUISITES
-- ========================================

-- Ensure we have required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify required tables exist (map_nodes should exist from map system)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'map_nodes') THEN
        RAISE EXCEPTION 'map_nodes table must exist before creating classroom system. Run map migrations first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        RAISE EXCEPTION 'user_roles table must exist before creating classroom system. Run user roles migration first.';
    END IF;
END$$;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to generate secure join codes
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    attempts INTEGER := 0;
BEGIN
    LOOP
        result := '';
        -- Generate 6-character code
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.classrooms WHERE join_code = result) THEN
            RETURN result;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique join code after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Grant execute permissions for generate_join_code
GRANT EXECUTE ON FUNCTION public.generate_join_code() TO authenticated;

-- ========================================
-- CORE TABLES
-- ========================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.assignment_enrollments CASCADE;
DROP TABLE IF EXISTS public.assignment_nodes CASCADE;
DROP TABLE IF EXISTS public.classroom_assignments CASCADE;
DROP TABLE IF EXISTS public.classroom_memberships CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;

-- 1. CLASSROOMS TABLE
CREATE TABLE public.classrooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    join_code VARCHAR(6) UNIQUE NOT NULL DEFAULT public.generate_join_code(),
    max_students INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classrooms_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT classrooms_join_code_format CHECK (join_code ~ '^[A-Z0-9]{6}$'),
    CONSTRAINT classrooms_max_students_positive CHECK (max_students > 0 AND max_students <= 1000),
    CONSTRAINT classrooms_description_length CHECK (char_length(description) <= 2000)
);

-- 2. CLASSROOM MEMBERSHIPS TABLE
CREATE TABLE public.classroom_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classroom_memberships_unique_membership UNIQUE(classroom_id, user_id),
    CONSTRAINT classroom_memberships_valid_role CHECK (role IN ('student', 'ta', 'instructor'))
);

-- 3. CLASSROOM ASSIGNMENTS TABLE
CREATE TABLE public.classroom_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    default_due_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignments_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 255),
    CONSTRAINT assignments_description_length CHECK (char_length(description) <= 5000),
    CONSTRAINT assignments_instructions_length CHECK (char_length(instructions) <= 10000),
    CONSTRAINT assignments_due_date_future CHECK (default_due_date IS NULL OR default_due_date > created_at)
);

-- 4. ASSIGNMENT NODES TABLE (Many-to-many: assignments ↔ map_nodes)
CREATE TABLE public.assignment_nodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN DEFAULT true,
    points_possible INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignment_nodes_unique_assignment_node UNIQUE(assignment_id, node_id),
    CONSTRAINT assignment_nodes_unique_sequence UNIQUE(assignment_id, sequence_order),
    CONSTRAINT assignment_nodes_sequence_positive CHECK (sequence_order > 0),
    CONSTRAINT assignment_nodes_points_non_negative CHECK (points_possible >= 0)
);

-- 5. ASSIGNMENT ENROLLMENTS TABLE (Tracks student enrollments)
CREATE TABLE public.assignment_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ, -- Individual due date (overrides default)
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'assigned' NOT NULL,
    completion_percentage INTEGER DEFAULT 0,
    total_points_earned INTEGER DEFAULT 0,
    total_points_possible INTEGER DEFAULT 0,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT assignment_enrollments_unique_enrollment UNIQUE(assignment_id, user_id),
    CONSTRAINT assignment_enrollments_valid_status CHECK (status IN ('assigned', 'in_progress', 'submitted', 'completed', 'overdue')),
    CONSTRAINT assignment_enrollments_percentage_range CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT assignment_enrollments_points_non_negative CHECK (
        total_points_earned >= 0 AND total_points_possible >= 0 AND total_points_earned <= total_points_possible
    ),
    CONSTRAINT assignment_enrollments_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed')
    ),
    CONSTRAINT assignment_enrollments_started_logic CHECK (
        (status IN ('in_progress', 'submitted', 'completed') AND started_at IS NOT NULL) OR
        (status IN ('assigned', 'overdue'))
    ),
    CONSTRAINT assignment_enrollments_notes_length CHECK (char_length(notes) <= 2000)
);

-- ========================================
-- MEMBERSHIP HELPER FUNCTION
-- ========================================

-- Create function to check classroom membership (security definer to avoid RLS recursion)
-- This function is created after tables to avoid circular dependencies
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

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Classrooms indexes
CREATE INDEX idx_classrooms_instructor ON public.classrooms(instructor_id);
CREATE INDEX idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX idx_classrooms_active ON public.classrooms(is_active) WHERE is_active = true;
CREATE INDEX idx_classrooms_created_at ON public.classrooms(created_at);

-- Classroom memberships indexes
CREATE INDEX idx_classroom_memberships_classroom ON public.classroom_memberships(classroom_id);
CREATE INDEX idx_classroom_memberships_user ON public.classroom_memberships(user_id);
CREATE INDEX idx_classroom_memberships_role ON public.classroom_memberships(role);
CREATE INDEX idx_classroom_memberships_active ON public.classroom_memberships(last_active_at);

-- Classroom assignments indexes
CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments(classroom_id);
CREATE INDEX idx_classroom_assignments_creator ON public.classroom_assignments(created_by);
CREATE INDEX idx_classroom_assignments_published ON public.classroom_assignments(is_published) WHERE is_published = true;
CREATE INDEX idx_classroom_assignments_due_date ON public.classroom_assignments(default_due_date);

-- Assignment nodes indexes
CREATE INDEX idx_assignment_nodes_assignment ON public.assignment_nodes(assignment_id);
CREATE INDEX idx_assignment_nodes_node ON public.assignment_nodes(node_id);
CREATE INDEX idx_assignment_nodes_sequence ON public.assignment_nodes(assignment_id, sequence_order);
CREATE INDEX idx_assignment_nodes_required ON public.assignment_nodes(is_required) WHERE is_required = true;

-- Assignment enrollments indexes
CREATE INDEX idx_assignment_enrollments_assignment ON public.assignment_enrollments(assignment_id);
CREATE INDEX idx_assignment_enrollments_user ON public.assignment_enrollments(user_id);
CREATE INDEX idx_assignment_enrollments_status ON public.assignment_enrollments(status);
CREATE INDEX idx_assignment_enrollments_due_date ON public.assignment_enrollments(due_date);
CREATE INDEX idx_assignment_enrollments_completion ON public.assignment_enrollments(completed_at);

-- ========================================
-- TRIGGERS
-- ========================================

-- Updated_at triggers
CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classroom_assignments_updated_at
    BEFORE UPDATE ON public.classroom_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update last_active_at when membership is accessed
CREATE OR REPLACE FUNCTION public.update_membership_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_membership_activity
    BEFORE UPDATE ON public.classroom_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.update_membership_activity();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_enrollments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES - CLASSROOMS
-- ========================================

-- Instructors can manage their own classrooms
CREATE POLICY "instructors_manage_own_classrooms" ON public.classrooms
    FOR ALL 
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- Students and members can view classrooms they belong to OR find active classrooms by join code
CREATE POLICY "users_access_classrooms" ON public.classrooms
    FOR SELECT 
    USING (
        -- Allow finding active classrooms (for joining)
        is_active = true OR
        -- Allow accessing classrooms user is a member of
        public.is_classroom_member(id, auth.uid())
    );

-- ========================================
-- RLS POLICIES - CLASSROOM MEMBERSHIPS
-- ========================================

-- Users can view their own memberships
CREATE POLICY "users_view_own_memberships" ON public.classroom_memberships
    FOR SELECT 
    USING (user_id = auth.uid());

-- Students can join classrooms (insert their own membership)
CREATE POLICY "students_join_classrooms" ON public.classroom_memberships
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

-- Users can leave classrooms (delete their own membership)
CREATE POLICY "users_leave_classrooms" ON public.classroom_memberships
    FOR DELETE 
    USING (user_id = auth.uid());

-- Instructors can manage all memberships in their classrooms
CREATE POLICY "instructors_manage_classroom_memberships" ON public.classroom_memberships
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

-- ========================================
-- RLS POLICIES - CLASSROOM ASSIGNMENTS
-- ========================================

-- Assignment creators can manage their assignments
CREATE POLICY "creators_manage_assignments" ON public.classroom_assignments
    FOR ALL 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Students can view published assignments in classrooms they're members of
CREATE POLICY "students_view_published_assignments" ON public.classroom_assignments
    FOR SELECT 
    USING (
        is_published = true AND
        public.is_classroom_member(classroom_id, auth.uid())
    );

-- ========================================
-- RLS POLICIES - ASSIGNMENT NODES
-- ========================================

-- Assignment creators can manage nodes in their assignments
CREATE POLICY "creators_manage_assignment_nodes" ON public.assignment_nodes
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

-- Students can view nodes for assignments they're enrolled in
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

-- ========================================
-- RLS POLICIES - ASSIGNMENT ENROLLMENTS
-- ========================================

-- Assignment creators can manage all enrollments for their assignments
CREATE POLICY "creators_manage_enrollments" ON public.assignment_enrollments
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

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to get classroom statistics
CREATE OR REPLACE FUNCTION public.get_classroom_stats(classroom_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this classroom
    IF NOT (
        EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_uuid AND instructor_id = auth.uid()) OR
        public.is_classroom_member(classroom_uuid, auth.uid())
    ) THEN
        RAISE EXCEPTION 'Access denied to classroom statistics';
    END IF;

    SELECT json_build_object(
        'total_members', (
            SELECT COUNT(*) FROM public.classroom_memberships 
            WHERE classroom_id = classroom_uuid
        ),
        'total_students', (
            SELECT COUNT(*) FROM public.classroom_memberships 
            WHERE classroom_id = classroom_uuid AND role = 'student'
        ),
        'total_assignments', (
            SELECT COUNT(*) FROM public.classroom_assignments 
            WHERE classroom_id = classroom_uuid
        ),
        'published_assignments', (
            SELECT COUNT(*) FROM public.classroom_assignments 
            WHERE classroom_id = classroom_uuid AND is_published = true
        ),
        'active_enrollments', (
            SELECT COUNT(*) FROM public.assignment_enrollments ae
            JOIN public.classroom_assignments ca ON ae.assignment_id = ca.id
            WHERE ca.classroom_id = classroom_uuid 
            AND ae.status IN ('assigned', 'in_progress', 'submitted')
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_classroom_stats(UUID) TO authenticated;

-- ========================================
-- GRANTS AND PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.classrooms IS 'Virtual classrooms for organizing students and assignments with unique join codes';
COMMENT ON COLUMN public.classrooms.join_code IS 'Unique 6-character alphanumeric code for students to join classroom';
COMMENT ON COLUMN public.classrooms.max_students IS 'Maximum number of students allowed in classroom (1-1000)';
COMMENT ON COLUMN public.classrooms.is_active IS 'Whether classroom accepts new members and assignments';

COMMENT ON TABLE public.classroom_memberships IS 'Tracks user membership in classrooms with roles (student, ta, instructor)';
COMMENT ON COLUMN public.classroom_memberships.role IS 'User role: student, ta, or instructor';
COMMENT ON COLUMN public.classroom_memberships.last_active_at IS 'Last time user was active in this classroom';

COMMENT ON TABLE public.classroom_assignments IS 'Custom assignments created by instructors containing specific learning nodes';
COMMENT ON COLUMN public.classroom_assignments.is_published IS 'Whether assignment is visible to students';
COMMENT ON COLUMN public.classroom_assignments.default_due_date IS 'Default due date (can be overridden per student)';

COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific nodes from learning maps with sequence and requirements';
COMMENT ON COLUMN public.assignment_nodes.sequence_order IS 'Order in which nodes should be completed';
COMMENT ON COLUMN public.assignment_nodes.is_required IS 'Whether node completion is required for assignment completion';
COMMENT ON COLUMN public.assignment_nodes.points_possible IS 'Maximum points available for this node in this assignment';

COMMENT ON TABLE public.assignment_enrollments IS 'Tracks individual student progress and scores on assignments';
COMMENT ON COLUMN public.assignment_enrollments.status IS 'Current status: assigned, in_progress, submitted, completed, overdue';
COMMENT ON COLUMN public.assignment_enrollments.completion_percentage IS 'Percentage of required nodes completed (0-100)';
COMMENT ON COLUMN public.assignment_enrollments.total_points_earned IS 'Total points earned across all nodes';
COMMENT ON COLUMN public.assignment_enrollments.total_points_possible IS 'Total points possible across all nodes';

COMMENT ON FUNCTION public.is_classroom_member(UUID, UUID) IS 'Security definer function to check classroom membership without RLS recursion';
COMMENT ON FUNCTION public.generate_join_code() IS 'Generates unique 6-character alphanumeric join codes';
COMMENT ON FUNCTION public.get_classroom_stats(UUID) IS 'Returns comprehensive statistics for a classroom';

-- ========================================
-- VALIDATION AND VERIFICATION
-- ========================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('classrooms', 'classroom_memberships', 'classroom_assignments', 'assignment_nodes', 'assignment_enrollments');
    
    IF table_count != 5 THEN
        RAISE EXCEPTION 'Not all classroom tables were created successfully. Expected 5, got %', table_count;
    END IF;
    
    RAISE NOTICE 'Classroom system migration completed successfully. Created % tables with RLS policies and helper functions.', table_count;
END$$;
