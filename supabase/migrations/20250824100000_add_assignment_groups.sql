-- Add assignment groups system
-- This migration adds support for group assignments where instructors can create groups and assign students

-- Create assignment_groups table
CREATE TABLE IF NOT EXISTS public.assignment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI display
    max_members INTEGER DEFAULT NULL, -- NULL means unlimited
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT assignment_groups_name_length CHECK (char_length(name) >= 1),
    CONSTRAINT assignment_groups_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT assignment_groups_max_members_positive CHECK (max_members IS NULL OR max_members > 0)
);

-- Create assignment_group_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.assignment_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'leader' or 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    added_by UUID REFERENCES public.profiles(id), -- Who added this user to the group
    
    -- Ensure a user can only be in a group once
    UNIQUE(group_id, user_id),
    CONSTRAINT assignment_group_members_role_check CHECK (role IN ('leader', 'member'))
);

-- Create assignment_group_assignments table (which assignments are assigned to which groups)
CREATE TABLE IF NOT EXISTS public.assignment_group_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    instructions TEXT, -- Group-specific instructions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    
    -- Ensure an assignment can only be assigned to a group once
    UNIQUE(assignment_id, group_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignment_groups_classroom ON public.assignment_groups(classroom_id);
CREATE INDEX IF NOT EXISTS idx_assignment_groups_active ON public.assignment_groups(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_assignment_group_members_group ON public.assignment_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_assignment_group_members_user ON public.assignment_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_group_members_role ON public.assignment_group_members(role);
CREATE INDEX IF NOT EXISTS idx_assignment_group_assignments_assignment ON public.assignment_group_assignments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_group_assignments_group ON public.assignment_group_assignments(group_id);

-- Add updated_at triggers
CREATE OR REPLACE TRIGGER update_assignment_groups_updated_at
    BEFORE UPDATE ON public.assignment_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_group_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignment_groups
-- RLS Policies for assignment_groups

-- Ensure idempotency: drop policies if they exist
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_groups' AND policyname = 'Instructors can manage assignment groups') THEN
       EXECUTE 'DROP POLICY "Instructors can manage assignment groups" ON public.assignment_groups';
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_groups' AND policyname = 'Students can view assignment groups') THEN
       EXECUTE 'DROP POLICY "Students can view assignment groups" ON public.assignment_groups';
   END IF;
END$$;

-- Instructors and TAs can manage groups in their classrooms
CREATE POLICY "Instructors can manage assignment groups" ON public.assignment_groups
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classroom_memberships cm
        WHERE cm.classroom_id = assignment_groups.classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
);

-- Students can view groups in their classrooms
CREATE POLICY "Students can view assignment groups" ON public.assignment_groups
FOR SELECT USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM public.classroom_memberships cm
        WHERE cm.classroom_id = assignment_groups.classroom_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
    )
);

-- RLS Policies for assignment_group_members
-- RLS Policies for assignment_group_members

-- Ensure idempotency: drop policies if they exist
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_group_members' AND policyname = 'Group members can view group membership') THEN
       EXECUTE 'DROP POLICY "Group members can view group membership" ON public.assignment_group_members';
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_group_members' AND policyname = 'Instructors can manage group membership') THEN
       EXECUTE 'DROP POLICY "Instructors can manage group membership" ON public.assignment_group_members';
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_group_members' AND policyname = 'Students can join assignment groups') THEN
       EXECUTE 'DROP POLICY "Students can join assignment groups" ON public.assignment_group_members';
   END IF;
END$$;

-- Allow all operations - permissions handled at application level
CREATE POLICY "Allow all operations with app-level permissions" ON public.assignment_group_members
FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for assignment_group_assignments
-- RLS Policies for assignment_group_assignments

-- Ensure idempotency: drop policies if they exist
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_group_assignments' AND policyname = 'Instructors can manage group assignments') THEN
       EXECUTE 'DROP POLICY "Instructors can manage group assignments" ON public.assignment_group_assignments';
   END IF;
   IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'assignment_group_assignments' AND policyname = 'Group members can view group assignments') THEN
       EXECUTE 'DROP POLICY "Group members can view group assignments" ON public.assignment_group_assignments';
   END IF;
END$$;

-- Instructors and TAs can manage group assignments
CREATE POLICY "Instructors can manage group assignments" ON public.assignment_group_assignments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.classroom_assignments ca
        JOIN public.classroom_memberships cm ON ca.classroom_id = cm.classroom_id
        WHERE ca.id = assignment_group_assignments.assignment_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
);

-- Group members can view their group assignments
CREATE POLICY "Group members can view group assignments" ON public.assignment_group_assignments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.assignment_group_members agm
        WHERE agm.group_id = assignment_group_assignments.group_id
        AND agm.user_id = auth.uid()
    )
);

-- Add comments for documentation
COMMENT ON TABLE public.assignment_groups IS 'Groups for collaborative assignments within classrooms';
COMMENT ON TABLE public.assignment_group_members IS 'Membership records for assignment groups';
COMMENT ON TABLE public.assignment_group_assignments IS 'Assignments assigned to specific groups';

COMMENT ON COLUMN public.assignment_groups.color IS 'Hex color code for UI display of the group';
COMMENT ON COLUMN public.assignment_groups.max_members IS 'Maximum number of members allowed in the group (NULL = unlimited)';
COMMENT ON COLUMN public.assignment_group_members.role IS 'Role of the user in the group (leader or member)';
COMMENT ON COLUMN public.assignment_group_members.added_by IS 'User ID of who added this member to the group';
COMMENT ON COLUMN public.assignment_group_assignments.instructions IS 'Group-specific instructions for the assignment';

-- Create a function to automatically assign group assignments to group members
CREATE OR REPLACE FUNCTION public.assign_group_assignment_to_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- When a group assignment is created, automatically enroll all group members
    INSERT INTO public.assignment_enrollments (assignment_id, user_id, due_date, status)
    SELECT 
        NEW.assignment_id,
        agm.user_id,
        NEW.due_date,
        'assigned'
    FROM public.assignment_group_members agm
    WHERE agm.group_id = NEW.group_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN NEW;
END;
$$;

-- Create function to get group map submissions for grading
CREATE OR REPLACE FUNCTION public.get_group_map_submissions(
    p_group_id UUID,
    p_map_id UUID
)
RETURNS TABLE (
    submission_id UUID,
    user_id UUID,
    username TEXT,
    full_name TEXT,
    node_id UUID,
    node_title TEXT,
    assessment_type TEXT,
    submitted_at TIMESTAMPTZ,
    text_answer TEXT,
    file_urls TEXT[],
    quiz_answers JSONB,
    grade TEXT,
    points_awarded INTEGER,
    comments TEXT,
    graded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as submission_id,
        p.user_id,
        prof.username,
        prof.full_name,
        n.id as node_id,
        n.title as node_title,
        na.assessment_type,
        s.submitted_at,
        s.text_answer,
        s.file_urls,
        s.quiz_answers,
        sg.grade,
        sg.points_awarded,
        sg.comments,
        sg.graded_at
    FROM public.assignment_group_members agm
    JOIN public.profiles prof ON agm.user_id = prof.id
    JOIN public.student_node_progress p ON agm.user_id = p.user_id
    JOIN public.assessment_submissions s ON p.id = s.progress_id
    JOIN public.node_assessments na ON s.assessment_id = na.id
    JOIN public.map_nodes n ON na.node_id = n.id
    LEFT JOIN public.submission_grades sg ON s.id = sg.submission_id
    WHERE agm.group_id = p_group_id
    AND n.map_id = p_map_id
    AND p.status IN ('submitted', 'passed', 'failed')
    ORDER BY s.submitted_at DESC;
END;
$$;

-- Create function to bulk grade group submissions
CREATE OR REPLACE FUNCTION public.bulk_grade_group_submissions(
    p_group_id UUID,
    p_map_id UUID,
    p_grader_id UUID,
    p_default_grade TEXT DEFAULT NULL,
    p_default_points INTEGER DEFAULT NULL,
    p_default_comments TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_submission RECORD;
BEGIN
    -- Get all ungraded submissions for the group and map
    FOR v_submission IN (
        SELECT s.id as submission_id, p.user_id
        FROM public.assignment_group_members agm
        JOIN public.student_node_progress p ON agm.user_id = p.user_id
        JOIN public.assessment_submissions s ON p.id = s.progress_id
        JOIN public.node_assessments na ON s.assessment_id = na.id
        JOIN public.map_nodes n ON na.node_id = n.id
        LEFT JOIN public.submission_grades sg ON s.id = sg.submission_id
        WHERE agm.group_id = p_group_id
        AND n.map_id = p_map_id
        AND p.status = 'submitted'
        AND sg.id IS NULL
    ) LOOP
        
        -- Insert grade for this submission
        INSERT INTO public.submission_grades (
            submission_id,
            graded_by,
            grade,
            points_awarded,
            comments
        ) VALUES (
            v_submission.submission_id,
            p_grader_id,
            p_default_grade,
            p_default_points,
            p_default_comments
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- Create trigger for automatic enrollment
-- Ensure idempotency for triggers: drop if they exist
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_assign_group_assignment_to_members') THEN
       EXECUTE 'DROP TRIGGER "trigger_assign_group_assignment_to_members" ON public.assignment_group_assignments';
   END IF;
END$$;

CREATE TRIGGER trigger_assign_group_assignment_to_members
    AFTER INSERT ON public.assignment_group_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_group_assignment_to_members();

-- Create function to handle new group member enrollment in existing assignments
CREATE OR REPLACE FUNCTION public.enroll_new_group_member_in_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- When a new member joins a group, enroll them in all group assignments
    INSERT INTO public.assignment_enrollments (assignment_id, user_id, due_date, status)
    SELECT 
        aga.assignment_id,
        NEW.user_id,
        aga.due_date,
        'assigned'
    FROM public.assignment_group_assignments aga
    WHERE aga.group_id = NEW.group_id
    ON CONFLICT (assignment_id, user_id) DO NOTHING; -- Avoid duplicates
    
    RETURN NEW;
END;
$$;

-- Create trigger for new member enrollment
-- Ensure idempotency for triggers: drop if they exist
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_enroll_new_group_member_in_assignments') THEN
       EXECUTE 'DROP TRIGGER "trigger_enroll_new_group_member_in_assignments" ON public.assignment_group_members';
   END IF;
END$$;

CREATE TRIGGER trigger_enroll_new_group_member_in_assignments
    AFTER INSERT ON public.assignment_group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.enroll_new_group_member_in_assignments();

-- Create function to grade individual submissions (used by both group and team grading)
CREATE OR REPLACE FUNCTION public.grade_individual_submission(
    p_submission_id UUID,
    p_grade TEXT,
    p_comments TEXT,
    p_grader_id UUID,
    p_progress_id UUID,
    p_points_awarded INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update the grade for this submission
    INSERT INTO public.submission_grades (
        submission_id,
        graded_by,
        grade,
        points_awarded,
        comments,
        graded_at
    ) VALUES (
        p_submission_id,
        p_grader_id,
        p_grade,
        p_points_awarded,
        p_comments,
        now()
    )
    ON CONFLICT (submission_id) DO UPDATE SET
        graded_by = EXCLUDED.graded_by,
        grade = EXCLUDED.grade,
        points_awarded = EXCLUDED.points_awarded,
        comments = EXCLUDED.comments,
        graded_at = EXCLUDED.graded_at;
        
    -- Update student progress status based on grade
    UPDATE public.student_node_progress 
    SET 
        status = CASE 
            WHEN p_grade = 'pass' THEN 'passed'::progress_status
            WHEN p_grade = 'fail' THEN 'failed'::progress_status
            ELSE status
        END,
        completion_percentage = CASE 
            WHEN p_grade = 'pass' THEN COALESCE(p_points_awarded, 100)
            WHEN p_grade = 'fail' THEN 0
            ELSE completion_percentage
        END,
        completed_at = CASE 
            WHEN p_grade = 'pass' THEN now()
            ELSE completed_at
        END
    WHERE id = p_progress_id;
END;
$$;