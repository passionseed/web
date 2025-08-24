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

-- Group members can view other members in their groups
CREATE POLICY "Group members can view group membership" ON public.assignment_group_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.assignment_group_members agm
        WHERE agm.group_id = assignment_group_members.group_id
        AND agm.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.assignment_groups ag
        JOIN public.classroom_memberships cm ON ag.classroom_id = cm.classroom_id
        WHERE ag.id = assignment_group_members.group_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
);

-- Instructors and TAs can manage group membership
CREATE POLICY "Instructors can manage group membership" ON public.assignment_group_members
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.assignment_groups ag
        JOIN public.classroom_memberships cm ON ag.classroom_id = cm.classroom_id
        WHERE ag.id = assignment_group_members.group_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('instructor', 'ta')
    )
);

-- Students can join/leave groups if allowed
CREATE POLICY "Students can join assignment groups" ON public.assignment_group_members
FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.assignment_groups ag
        JOIN public.classroom_memberships cm ON ag.classroom_id = cm.classroom_id
        WHERE ag.id = assignment_group_members.group_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'student'
        AND ag.is_active = true
        AND (ag.max_members IS NULL OR 
             (SELECT COUNT(*) FROM public.assignment_group_members 
              WHERE group_id = ag.id) < ag.max_members)
    )
);

-- RLS Policies for assignment_group_assignments

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

-- Create trigger for automatic enrollment
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
CREATE TRIGGER trigger_enroll_new_group_member_in_assignments
    AFTER INSERT ON public.assignment_group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.enroll_new_group_member_in_assignments();