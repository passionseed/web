-- Migration: Create Classroom System Core Tables
-- Created: 2025-08-05
-- Description: Creates the foundational tables for the classroom system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create classrooms table
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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
    CONSTRAINT classrooms_join_code_format CHECK (join_code ~ '^[A-Z0-9]{6,8}$'),
    CONSTRAINT classrooms_max_students_positive CHECK (max_students > 0)
);

-- Create classroom_memberships table
CREATE TABLE IF NOT EXISTS public.classroom_memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'student' NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classroom_memberships_unique_membership UNIQUE(classroom_id, user_id),
    CONSTRAINT classroom_memberships_valid_role CHECK (role IN ('student', 'ta', 'instructor'))
);

-- Create classroom_assignments table
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_due_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT classroom_assignments_title_length CHECK (char_length(title) >= 1),
    CONSTRAINT classroom_assignments_due_date_future CHECK (default_due_date IS NULL OR default_due_date > created_at)
);

-- Create assignment_nodes table (many-to-many: assignments -> nodes)
CREATE TABLE IF NOT EXISTS public.assignment_nodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT assignment_nodes_unique_assignment_node UNIQUE(assignment_id, node_id),
    CONSTRAINT assignment_nodes_unique_sequence UNIQUE(assignment_id, sequence_order),
    CONSTRAINT assignment_nodes_sequence_positive CHECK (sequence_order > 0)
);

-- Create assignment_enrollments table (many-to-many: assignments -> students)
CREATE TABLE IF NOT EXISTS public.assignment_enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    due_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'assigned' NOT NULL,
    completed_at TIMESTAMPTZ,
    completion_percentage INTEGER DEFAULT 0,
    notes TEXT,
    
    -- Constraints
    CONSTRAINT assignment_enrollments_unique_enrollment UNIQUE(assignment_id, user_id),
    CONSTRAINT assignment_enrollments_valid_status CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue')),
    CONSTRAINT assignment_enrollments_percentage_range CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT assignment_enrollments_completed_at_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_classrooms_instructor_id ON public.classrooms(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON public.classrooms(join_code);
CREATE INDEX IF NOT EXISTS idx_classrooms_is_active ON public.classrooms(is_active);

CREATE INDEX IF NOT EXISTS idx_classroom_memberships_classroom_id ON public.classroom_memberships(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_user_id ON public.classroom_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_memberships_role ON public.classroom_memberships(role);

CREATE INDEX IF NOT EXISTS idx_classroom_assignments_classroom_id ON public.classroom_assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_created_by ON public.classroom_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_is_active ON public.classroom_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_classroom_assignments_due_date ON public.classroom_assignments(default_due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_nodes_assignment_id ON public.assignment_nodes(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_nodes_node_id ON public.assignment_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_assignment_nodes_sequence ON public.assignment_nodes(assignment_id, sequence_order);

CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_assignment_id ON public.assignment_enrollments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_user_id ON public.assignment_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_status ON public.assignment_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_enrollments_due_date ON public.assignment_enrollments(due_date);

-- Create updated_at triggers
CREATE OR REPLACE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON public.classrooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_classroom_assignments_updated_at
    BEFORE UPDATE ON public.classroom_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.classrooms IS 'Virtual classrooms created by instructors with unique join codes';
COMMENT ON COLUMN public.classrooms.join_code IS 'Unique 6-8 character code for students to join classroom';
COMMENT ON COLUMN public.classrooms.max_students IS 'Maximum number of students allowed in classroom';

COMMENT ON TABLE public.classroom_memberships IS 'Tracks which users belong to which classrooms and their roles';
COMMENT ON TABLE public.classroom_assignments IS 'Custom assignments created by instructors containing specific nodes';
COMMENT ON TABLE public.assignment_nodes IS 'Links assignments to specific nodes from learning maps with sequence order';
COMMENT ON TABLE public.assignment_enrollments IS 'Tracks individual student progress on assignments';

COMMENT ON COLUMN public.assignment_enrollments.completion_percentage IS 'Percentage of required nodes completed (0-100)';
COMMENT ON COLUMN public.assignment_enrollments.status IS 'Current status: assigned, in_progress, completed, overdue';
