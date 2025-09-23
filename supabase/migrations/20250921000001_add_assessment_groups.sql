-- Migration: Add assessment group functionality
-- This adds support for group assessments at the individual node assessment level
-- Completely separate from the existing assignment_groups system

BEGIN;

-- ========================================
-- 1. EXTEND NODE_ASSESSMENTS TABLE
-- ========================================

-- Add group assessment configuration to node_assessments
ALTER TABLE public.node_assessments 
ADD COLUMN IF NOT EXISTS is_group_assessment BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS group_formation_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS target_group_size INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS allow_uneven_groups BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS groups_config JSONB DEFAULT '{}';

-- Add constraints for group assessment settings
ALTER TABLE public.node_assessments 
ADD CONSTRAINT node_assessments_group_formation_method_check 
CHECK (group_formation_method IN ('manual', 'shuffle'));

ALTER TABLE public.node_assessments 
ADD CONSTRAINT node_assessments_target_group_size_check 
CHECK (target_group_size >= 2 AND target_group_size <= 20);

-- Add index for group assessments
CREATE INDEX IF NOT EXISTS idx_node_assessments_group_assessment 
ON public.node_assessments(is_group_assessment) WHERE is_group_assessment = true;

-- ========================================
-- 2. CREATE ASSESSMENT_GROUPS TABLE
-- ========================================

-- Table to store groups for specific assessments
CREATE TABLE IF NOT EXISTS public.assessment_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES public.node_assessments(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    group_number INTEGER NOT NULL, -- For ordering: Group 1, Group 2, etc.
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT assessment_groups_group_name_length CHECK (char_length(group_name) >= 1),
    CONSTRAINT assessment_groups_group_number_positive CHECK (group_number > 0),
    
    -- Ensure unique group numbers per assessment
    UNIQUE(assessment_id, group_number)
);

-- Add indexes for assessment_groups
CREATE INDEX IF NOT EXISTS idx_assessment_groups_assessment_id 
ON public.assessment_groups(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_groups_created_by 
ON public.assessment_groups(created_by);

-- ========================================
-- 3. CREATE ASSESSMENT_GROUP_MEMBERS TABLE
-- ========================================

-- Table to store which users are in which assessment groups
CREATE TABLE IF NOT EXISTS public.assessment_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.assessment_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Ensure a user can only be in one group per assessment
    UNIQUE(group_id, user_id)
);

-- Add indexes for assessment_group_members
CREATE INDEX IF NOT EXISTS idx_assessment_group_members_group_id 
ON public.assessment_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_assessment_group_members_user_id 
ON public.assessment_group_members(user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_group_members_assigned_by 
ON public.assessment_group_members(assigned_by);

-- ========================================
-- 4. UPDATE ASSESSMENT_SUBMISSIONS TABLE
-- ========================================

-- Add group submission tracking to assessment_submissions
ALTER TABLE public.assessment_submissions 
ADD COLUMN IF NOT EXISTS assessment_group_id UUID REFERENCES public.assessment_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS submitted_for_group BOOLEAN DEFAULT false NOT NULL;

-- Add index for group submissions
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_group 
ON public.assessment_submissions(assessment_group_id) WHERE assessment_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_group_flag 
ON public.assessment_submissions(submitted_for_group) WHERE submitted_for_group = true;

-- ========================================
-- 5. CREATE CONSTRAINT TO PREVENT DUPLICATE GROUP MEMBERSHIPS
-- ========================================

-- Note: We'll enforce one group per user per assessment via application logic and RLS
-- Complex unique constraints with subqueries are not supported in PostgreSQL indexes

-- ========================================
-- 6. CREATE FUNCTIONS FOR GROUP MANAGEMENT
-- ========================================

-- Function to create groups for an assessment (auto-shuffle)
CREATE OR REPLACE FUNCTION public.create_assessment_groups_shuffle(
    p_assessment_id UUID,
    p_target_group_size INTEGER DEFAULT 3,
    p_allow_uneven_groups BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    classroom_students RECORD;
    student_count INTEGER;
    group_count INTEGER;
    current_group INTEGER := 1;
    current_group_size INTEGER := 0;
    current_group_id UUID;
    result JSON;
    student_record RECORD;
BEGIN
    -- Verify the assessment exists and is a group assessment
    IF NOT EXISTS (
        SELECT 1 FROM public.node_assessments 
        WHERE id = p_assessment_id AND is_group_assessment = true
    ) THEN
        RAISE EXCEPTION 'Assessment not found or not configured for group assessment';
    END IF;
    
    -- Check permissions (user must be instructor/TA in the classroom containing this assessment)
    IF NOT EXISTS (
        SELECT 1 FROM public.node_assessments na
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
        WHERE na.id = p_assessment_id 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('instructor', 'ta')
        AND lm.map_type = 'classroom_exclusive'
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to manage assessment groups';
    END IF;
    
    -- Delete existing groups for this assessment
    DELETE FROM public.assessment_groups WHERE assessment_id = p_assessment_id;
    
    -- Get all students in the classroom for this assessment
    CREATE TEMP TABLE temp_students AS
    SELECT cm.user_id, p.full_name, p.username
    FROM public.node_assessments na
    JOIN public.map_nodes mn ON na.node_id = mn.id
    JOIN public.learning_maps lm ON mn.map_id = lm.id
    JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
    JOIN public.profiles p ON cm.user_id = p.id
    WHERE na.id = p_assessment_id 
    AND cm.role = 'student'
    GROUP BY cm.user_id, p.full_name, p.username -- Use GROUP BY instead of DISTINCT to avoid ORDER BY issue
    ORDER BY RANDOM(); -- Shuffle students
    
    SELECT COUNT(*) INTO student_count FROM temp_students;
    
    IF student_count = 0 THEN
        RAISE EXCEPTION 'No students found in classroom for this assessment';
    END IF;
    
    -- Calculate number of groups needed
    group_count := CEILING(student_count::FLOAT / p_target_group_size::FLOAT);
    
    -- If uneven groups not allowed, adjust group count
    IF NOT p_allow_uneven_groups AND student_count % p_target_group_size != 0 THEN
        group_count := student_count / p_target_group_size;
    END IF;
    
    -- Create groups and assign students
    FOR student_record IN SELECT * FROM temp_students LOOP
        -- Create new group if needed
        IF current_group_size = 0 THEN
            INSERT INTO public.assessment_groups (assessment_id, group_name, group_number, created_by)
            VALUES (p_assessment_id, 'Group ' || current_group, current_group, auth.uid())
            RETURNING id INTO current_group_id;
        END IF;
        
        -- Add student to current group
        INSERT INTO public.assessment_group_members (group_id, user_id, assigned_by)
        VALUES (current_group_id, student_record.user_id, auth.uid());
        
        current_group_size := current_group_size + 1;
        
        -- Move to next group if current one is full
        IF current_group_size >= p_target_group_size THEN
            current_group := current_group + 1;
            current_group_size := 0;
        END IF;
    END LOOP;
    
    -- Clean up temp table
    DROP TABLE temp_students;
    
    -- Return created groups
    SELECT json_agg(
        json_build_object(
            'id', ag.id,
            'group_name', ag.group_name,
            'group_number', ag.group_number,
            'member_count', (
                SELECT COUNT(*) FROM public.assessment_group_members 
                WHERE group_id = ag.id
            )
        ) ORDER BY ag.group_number
    ) INTO result
    FROM public.assessment_groups ag
    WHERE ag.assessment_id = p_assessment_id;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get assessment groups with members
CREATE OR REPLACE FUNCTION public.get_assessment_groups(p_assessment_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this assessment
    IF NOT EXISTS (
        SELECT 1 FROM public.node_assessments na
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
        WHERE na.id = p_assessment_id 
        AND cm.user_id = auth.uid()
        AND lm.map_type = 'classroom_exclusive'
    ) THEN
        RAISE EXCEPTION 'Access denied to assessment groups';
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'id', ag.id,
            'group_name', ag.group_name,
            'group_number', ag.group_number,
            'created_at', ag.created_at,
            'members', ag.members
        ) ORDER BY ag.group_number
    ) INTO result
    FROM (
        SELECT 
            ag.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', agm.user_id,
                        'full_name', p.full_name,
                        'username', p.username,
                        'assigned_at', agm.assigned_at
                    ) ORDER BY p.full_name
                ) FILTER (WHERE agm.user_id IS NOT NULL),
                '[]'::json
            ) as members
        FROM public.assessment_groups ag
        LEFT JOIN public.assessment_group_members agm ON ag.id = agm.group_id
        LEFT JOIN public.profiles p ON agm.user_id = p.id
        WHERE ag.assessment_id = p_assessment_id
        GROUP BY ag.id, ag.group_name, ag.group_number, ag.created_at
    ) ag;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. CREATE TRIGGER FOR GROUP SUBMISSIONS
-- ========================================

-- Function to handle group submissions (when one member submits, create submissions for all)
CREATE OR REPLACE FUNCTION public.handle_group_submission()
RETURNS TRIGGER AS $$
DECLARE
    group_member RECORD;
    assessment_id_var UUID;
BEGIN
    -- Only process if this is a group submission
    IF NEW.submitted_for_group = true AND NEW.assessment_group_id IS NOT NULL THEN
        
        -- Get the assessment ID for this submission
        SELECT NEW.assessment_id INTO assessment_id_var;
        
        -- Create submissions for all other group members who haven't submitted yet
        FOR group_member IN 
            SELECT agm.user_id
            FROM public.assessment_group_members agm
            WHERE agm.group_id = NEW.assessment_group_id
            AND agm.user_id != NEW.user_id
            AND NOT EXISTS (
                SELECT 1 FROM public.assessment_submissions asub
                WHERE asub.assessment_id = NEW.assessment_id 
                AND asub.user_id = agm.user_id
            )
        LOOP
            -- Create a copy of the submission for each group member
            INSERT INTO public.assessment_submissions (
                assessment_id,
                user_id,
                text_answer,
                file_urls,
                image_url,
                quiz_answers,
                assessment_group_id,
                submitted_for_group,
                submitted_at,
                metadata
            ) VALUES (
                NEW.assessment_id,
                group_member.user_id,
                NEW.text_answer,
                NEW.file_urls,
                NEW.image_url,
                NEW.quiz_answers,
                NEW.assessment_group_id,
                true,
                NEW.submitted_at,
                NEW.metadata
            );
        END LOOP;
        
        -- Update progress for all group members (if student_node_progress table exists)
        -- Note: This will depend on your progress tracking system
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for group submissions
DROP TRIGGER IF EXISTS trigger_handle_group_submission ON public.assessment_submissions;
CREATE TRIGGER trigger_handle_group_submission
    AFTER INSERT ON public.assessment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_group_submission();

-- ========================================
-- 8. ENABLE RLS ON NEW TABLES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE public.assessment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_groups
CREATE POLICY "assessment_groups_classroom_access" ON public.assessment_groups
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.node_assessments na
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
            WHERE na.id = assessment_groups.assessment_id
            AND cm.user_id = auth.uid()
            AND lm.map_type = 'classroom_exclusive'
        )
    );

-- RLS Policies for assessment_group_members  
CREATE POLICY "assessment_group_members_classroom_access" ON public.assessment_group_members
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_groups ag
            JOIN public.node_assessments na ON ag.assessment_id = na.id
            JOIN public.map_nodes mn ON na.node_id = mn.id
            JOIN public.learning_maps lm ON mn.map_id = lm.id
            JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
            WHERE ag.id = assessment_group_members.group_id
            AND cm.user_id = auth.uid()
            AND lm.map_type = 'classroom_exclusive'
        )
    );

-- ========================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON COLUMN public.node_assessments.is_group_assessment IS 'Whether this assessment should be completed in groups';
COMMENT ON COLUMN public.node_assessments.group_formation_method IS 'How groups are formed: manual assignment or auto shuffle';
COMMENT ON COLUMN public.node_assessments.target_group_size IS 'Target number of students per group (used for shuffle)';
COMMENT ON COLUMN public.node_assessments.allow_uneven_groups IS 'Whether to allow groups with different sizes';
COMMENT ON COLUMN public.node_assessments.groups_config IS 'Additional JSON configuration for group settings';

COMMENT ON TABLE public.assessment_groups IS 'Groups created for specific node assessments (separate from assignment_groups)';
COMMENT ON TABLE public.assessment_group_members IS 'Students assigned to assessment groups';

COMMENT ON COLUMN public.assessment_submissions.assessment_group_id IS 'If this submission was made as part of a group assessment';
COMMENT ON COLUMN public.assessment_submissions.submitted_for_group IS 'Whether this submission applies to all group members';

COMMIT;