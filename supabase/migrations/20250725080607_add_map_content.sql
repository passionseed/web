-- Content for each map node (video, slides, text)
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

-- Defines the assessment for a node
CREATE TABLE public.node_assessments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  node_id uuid NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type = ANY (ARRAY['quiz'::text, 'text_answer'::text, 'image_upload'::text, 'file_upload'::text])),
  PRIMARY KEY (id),
  CONSTRAINT node_assessments_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.map_nodes(id)
);

-- For quiz-type assessments
CREATE TABLE public.quiz_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assessment_id uuid NOT NULL,
  question_text text NOT NULL,
  options jsonb, -- e.g., [{"option": "A", "text": "Answer A"}, {"option": "B", "text": "Answer B"}]
  correct_option character varying,
  PRIMARY KEY (id),
  CONSTRAINT quiz_questions_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.node_assessments(id)
);

-- Tracks a student's progress at each node
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

-- Stores student submissions for assessments
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

-- For TA/Instructor grading and feedback
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

-- Leaderboard for students who have passed a node
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