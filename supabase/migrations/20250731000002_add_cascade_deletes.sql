-- Drop and recreate foreign key constraints with CASCADE delete options

-- First, let's drop existing foreign key constraints
ALTER TABLE IF EXISTS public.node_assessments 
DROP CONSTRAINT IF EXISTS node_assessments_node_id_fkey;

ALTER TABLE IF EXISTS public.node_content 
DROP CONSTRAINT IF EXISTS node_content_node_id_fkey;

ALTER TABLE IF EXISTS public.student_node_progress 
DROP CONSTRAINT IF EXISTS student_node_progress_node_id_fkey;

ALTER TABLE IF EXISTS public.quiz_questions 
DROP CONSTRAINT IF EXISTS quiz_questions_assessment_id_fkey;

ALTER TABLE IF EXISTS public.assessment_submissions 
DROP CONSTRAINT IF EXISTS assessment_submissions_assessment_id_fkey,
DROP CONSTRAINT IF EXISTS assessment_submissions_progress_id_fkey;

ALTER TABLE IF EXISTS public.submission_grades 
DROP CONSTRAINT IF EXISTS submission_grades_submission_id_fkey;

ALTER TABLE IF EXISTS public.node_leaderboard 
DROP CONSTRAINT IF EXISTS node_leaderboard_node_id_fkey;

ALTER TABLE IF EXISTS public.node_paths 
DROP CONSTRAINT IF EXISTS node_paths_source_node_id_fkey,
DROP CONSTRAINT IF EXISTS node_paths_destination_node_id_fkey;

-- Now add them back with CASCADE options where appropriate

-- Node-related cascades (when a node is deleted, delete related data)
ALTER TABLE public.node_assessments 
ADD CONSTRAINT node_assessments_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.node_content 
ADD CONSTRAINT node_content_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.student_node_progress 
ADD CONSTRAINT student_node_progress_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.node_leaderboard 
ADD CONSTRAINT node_leaderboard_node_id_fkey 
FOREIGN KEY (node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

ALTER TABLE public.node_paths 
ADD CONSTRAINT node_paths_source_node_id_fkey 
FOREIGN KEY (source_node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE,
ADD CONSTRAINT node_paths_destination_node_id_fkey 
FOREIGN KEY (destination_node_id) REFERENCES public.map_nodes(id) ON DELETE CASCADE;

-- Assessment-related cascades (when an assessment is deleted, delete related data)
ALTER TABLE public.quiz_questions 
ADD CONSTRAINT quiz_questions_assessment_id_fkey 
FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;

ALTER TABLE public.assessment_submissions 
ADD CONSTRAINT assessment_submissions_assessment_id_fkey 
FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id) ON DELETE CASCADE;

-- Progress-related cascades (when progress is deleted, delete submissions)
ALTER TABLE public.assessment_submissions 
ADD CONSTRAINT assessment_submissions_progress_id_fkey 
FOREIGN KEY (progress_id) REFERENCES public.student_node_progress(id) ON DELETE CASCADE;

-- Submission-related cascades (when submission is deleted, delete grades)
ALTER TABLE public.submission_grades 
ADD CONSTRAINT submission_grades_submission_id_fkey 
FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id) ON DELETE CASCADE;

-- Add helpful comments
COMMENT ON CONSTRAINT node_assessments_node_id_fkey ON public.node_assessments 
IS 'Cascade delete assessments when node is deleted';

COMMENT ON CONSTRAINT node_content_node_id_fkey ON public.node_content 
IS 'Cascade delete content when node is deleted';

COMMENT ON CONSTRAINT student_node_progress_node_id_fkey ON public.student_node_progress 
IS 'Cascade delete progress when node is deleted';

COMMENT ON CONSTRAINT quiz_questions_assessment_id_fkey ON public.quiz_questions 
IS 'Cascade delete quiz questions when assessment is deleted';

COMMENT ON CONSTRAINT assessment_submissions_assessment_id_fkey ON public.assessment_submissions 
IS 'Cascade delete submissions when assessment is deleted';

COMMENT ON CONSTRAINT assessment_submissions_progress_id_fkey ON public.assessment_submissions 
IS 'Cascade delete submissions when progress is deleted';

COMMENT ON CONSTRAINT submission_grades_submission_id_fkey ON public.submission_grades 
IS 'Cascade delete grades when submission is deleted';
