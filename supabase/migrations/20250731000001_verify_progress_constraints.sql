-- Verify and fix the student_node_progress status constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_node_progress_status_check' 
        AND table_name = 'student_node_progress'
    ) THEN
        ALTER TABLE public.student_node_progress 
        DROP CONSTRAINT student_node_progress_status_check;
    END IF;
    
    -- Add the correct constraint
    ALTER TABLE public.student_node_progress 
    ADD CONSTRAINT student_node_progress_status_check 
    CHECK (status IN ('not_started', 'in_progress', 'submitted', 'passed', 'failed'));
    
    RAISE NOTICE 'Progress status constraint verified and updated';
END $$;

-- Verify the submission_grades constraint as well
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'submission_grades_grade_check' 
        AND table_name = 'submission_grades'
    ) THEN
        ALTER TABLE public.submission_grades 
        DROP CONSTRAINT submission_grades_grade_check;
    END IF;
    
    -- Add the correct constraint
    ALTER TABLE public.submission_grades 
    ADD CONSTRAINT submission_grades_grade_check 
    CHECK (grade IN ('pass', 'fail'));
    
    RAISE NOTICE 'Submission grades constraint verified and updated';
END $$;

-- Add helpful comments
COMMENT ON CONSTRAINT student_node_progress_status_check ON public.student_node_progress 
IS 'Valid status values: not_started, in_progress, submitted, passed, failed';

COMMENT ON CONSTRAINT submission_grades_grade_check ON public.submission_grades 
IS 'Valid grade values: pass, fail (mapped to passed/failed in progress by trigger)';
