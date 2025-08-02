# Learning Map Database Schema

This document outlines the database schema for the learning map feature, combining information from various migration files.

## Table: `user_roles`
-- To manage different user roles within the platform
```sql
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text])),
  PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  UNIQUE (user_id, role)
);
```

## Table: `cohorts`
-- To group students into batches or cohorts
```sql
CREATE TABLE public.cohorts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);
```

## Table: `learning_maps`
-- The top-level learning maps (e.g., AI, 3D, Unity)
```sql
CREATE TABLE public.learning_maps (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  creator_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT learning_maps_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id)
);
```

### `learning_maps` Metadata Fields (from `20250725162654_add_map_metadata.sql`)
```sql
ALTER TABLE public.learning_maps 
ADD COLUMN difficulty integer DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
ADD COLUMN category text CHECK (category = ANY (ARRAY['ai'::text, '3d'::text, 'unity'::text, 'hacking'::text, 'custom'::text])),
ADD COLUMN total_students integer DEFAULT 0,
ADD COLUMN finished_students integer DEFAULT 0,
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS learning_maps_category_idx ON public.learning_maps(category);
CREATE INDEX IF NOT EXISTS learning_maps_difficulty_idx ON public.learning_maps(difficulty);

-- Add comments for documentation
COMMENT ON COLUMN public.learning_maps.difficulty IS 'Overall difficulty of the learning map (1-10)';
COMMENT ON COLUMN public.learning_maps.category IS 'Category of the learning map (ai, 3d, unity, hacking, custom)';
COMMENT ON COLUMN public.learning_maps.total_students IS 'Cached count of total students enrolled in this map';
COMMENT ON COLUMN public.learning_maps.finished_students IS 'Cached count of students who completed this map';
COMMENT ON COLUMN public.learning_maps.metadata IS 'Additional metadata in JSON format for extensibility';
```

## Table: `map_nodes`
-- Individual nodes within a learning map
```sql
CREATE TABLE public.map_nodes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  map_id uuid NOT NULL,
  title character varying NOT NULL,
  instructions text,
  difficulty integer NOT NULL DEFAULT 1,
  sprite_url text, -- For gamification (boss/sprite image)
  metadata jsonb, -- For extra data like total students, finished students
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT map_nodes_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id)
);
```

## Table: `node_paths`
-- Defines the connections and paths between nodes
```sql
CREATE TABLE public.node_paths (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source_node_id uuid NOT NULL,
  destination_node_id uuid NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT node_paths_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.map_nodes(id),
  CONSTRAINT node_paths_destination_node_id_fkey FOREIGN KEY (destination_node_id) REFERENCES public.map_nodes(id)
);
```

## Table: `cohort_map_enrollments`
-- To assign users from a cohort to a specific learning map
```sql
CREATE TABLE public.cohort_map_enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  cohort_id uuid NOT NULL,
  map_id uuid NOT NULL,
  enrolled_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT cohort_map_enrollments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES public.cohorts(id),
  CONSTRAINT cohort_map_enrollments_map_id_fkey FOREIGN KEY (map_id) REFERENCES public.learning_maps(id)
);
```

## Table: `node_content`
-- Content for each map node (video, slides, text)
```sql
CREATE TABLE public.node_content (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type = ANY (ARRAY['video'::text, 'canva_slide'::text, 'text_with_images'::text])),
  content_url text, -- For video links, canva links
  content_body text, -- For text-based content
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT node_content_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id)
);
```

## Table: `node_assessments`
-- Defines the assessment for a node
```sql
CREATE TABLE public.node_assessments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type = ANY (ARRAY['quiz'::text, 'text_answer'::text, 'image_upload'::text, 'file_upload'::text])),
  PRIMARY KEY (id),
  CONSTRAINT node_assessments_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id)
);
```

## Table: `quiz_questions`
-- For quiz-type assessments
```sql
CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assessment_id uuid NOT NULL,
  question_text text NOT NULL,
  options jsonb, -- e.g., [{"option": "A", "text": "Answer A"}, {"option": "B", "text": "Answer B"}]
  correct_option character varying,
  PRIMARY KEY (id),
  CONSTRAINT quiz_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id)
);
```

## Table: `student_node_progress`
-- Tracks a student's progress at each node
```sql
CREATE TABLE public.student_node_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  node_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started'::text CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'submitted'::text, 'passed'::text, 'failed'::text])),
  arrived_at timestamp with time zone,
  started_at timestamp with time zone,
  submitted_at timestamp with time zone,
  PRIMARY KEY (id),
  CONSTRAINT student_node_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT student_node_progress_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id),
  UNIQUE(user_id, node_id)
);
```

## Table: `assessment_submissions`
-- Stores student submissions for assessments
```sql
CREATE TABLE public.assessment_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  progress_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  -- For different submission types
  text_answer text,
  file_url text,
  image_url text,
  quiz_answers jsonb, -- e.g., {"question_id": "A", "question_id_2": "C"}
  submitted_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT assessment_submissions_progress_id_fkey FOREIGN KEY (progress_id) REFERENCES public.student_node_progress(id),
  CONSTRAINT assessment_submissions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id)
);
```

## Table: `submission_grades`
-- For TA/Instructor grading and feedback
```sql
CREATE TABLE public.submission_grades (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  submission_id uuid NOT NULL,
  graded_by uuid NOT NULL,
  grade text NOT NULL CHECK (grade = ANY (ARRAY['pass'::text, 'fail'::text])),
  rating integer, -- Optional numeric rating
  comments text,
  graded_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT submission_grades_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id),
  CONSTRAINT submission_grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.profiles(id)
);
```

### Trigger: `on_new_grade_update_progress` (from `20250726120000_add_grade_trigger.sql`)
-- Function to update student_node_progress status based on a new grade
```sql
CREATE OR REPLACE FUNCTION public.update_progress_on_grade() 
RETURNS TRIGGER AS $$
DECLARE
    submission_progress_id uuid;
BEGIN
    -- Get the progress_id from the submission that was just graded
    SELECT progress_id INTO submission_progress_id
    FROM public.assessment_submissions
    WHERE id = NEW.submission_id;

    -- Update the status in the student_node_progress table
    UPDATE public.student_node_progress
    SET status = NEW.grade -- NEW.grade will be 'pass' or 'fail'
    WHERE id = submission_progress_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new grade is inserted
CREATE TRIGGER on_new_grade_update_progress
AFTER INSERT ON public.submission_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_progress_on_grade();
```

## Table: `node_leaderboard`
-- Leaderboard for students who have passed a node
```sql
CREATE TABLE public.node_leaderboard (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  grade_rating integer,
  completion_speed_seconds bigint, -- Time from started_at to submitted_at
  ranked_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT node_leaderboard_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id),
  CONSTRAINT node_leaderboard_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
```