-- =====================================================
-- PATHLAB CONTENT SYSTEM MIGRATION
-- Creates tables for PathLab-specific content system
-- Separates PathLab from maps/nodes system
-- =====================================================

-- =====================================================
-- PATH ACTIVITIES TABLE
-- Core container for PathLab learning activities within a day
-- Replaces node selection with direct activity creation
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_day_id UUID NOT NULL REFERENCES public.path_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  activity_type TEXT NOT NULL DEFAULT 'learning'
    CHECK (activity_type IN ('learning', 'reflection', 'milestone', 'checkpoint', 'journal_prompt')),
  display_order INT NOT NULL DEFAULT 0,
  estimated_minutes INT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique ordering within a day
  UNIQUE(path_day_id, display_order)
);

CREATE INDEX idx_path_activities_day ON public.path_activities(path_day_id);
CREATE INDEX idx_path_activities_order ON public.path_activities(path_day_id, display_order);

COMMENT ON TABLE public.path_activities IS 'Learning activities within PathLab days';
COMMENT ON COLUMN public.path_activities.activity_type IS 'Type of activity: learning (standard), reflection (self-assessment), milestone (checkpoint), checkpoint (progress check), journal_prompt (writing exercise)';

-- =====================================================
-- PATH CONTENT TABLE
-- Replicates node_content functionality for PathLab
-- Supports both inherited and PathLab-specific content types
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.path_activities(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN (
    -- Inherited from nodes
    'video', 'canva_slide', 'text', 'image', 'pdf', 'resource_link', 'order_code',
    -- PathLab-specific content types
    'daily_prompt', 'reflection_card', 'emotion_check', 'progress_snapshot'
  )),
  content_title TEXT,
  content_url TEXT,
  content_body TEXT,
  display_order INT NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(activity_id, display_order)
);

CREATE INDEX idx_path_content_activity ON public.path_content(activity_id);
CREATE INDEX idx_path_content_type ON public.path_content(content_type);
CREATE INDEX idx_path_content_order ON public.path_content(activity_id, display_order);

COMMENT ON TABLE public.path_content IS 'Learning materials for PathLab activities';
COMMENT ON COLUMN public.path_content.content_type IS 'Type of content: inherited from nodes (video, canva_slide, text, image, pdf, resource_link, order_code) or PathLab-specific (daily_prompt, reflection_card, emotion_check, progress_snapshot)';

-- =====================================================
-- PATH ASSESSMENTS TABLE
-- Replicates node_assessments functionality for PathLab
-- Supports both inherited and PathLab-specific assessment types
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.path_activities(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN (
    -- Inherited from nodes
    'quiz', 'text_answer', 'file_upload', 'image_upload', 'checklist',
    -- PathLab-specific assessment types
    'daily_reflection', 'interest_rating', 'energy_check'
  )),
  points_possible INT,
  is_graded BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One assessment per activity
  UNIQUE(activity_id)
);

CREATE INDEX idx_path_assessments_activity ON public.path_assessments(activity_id);
CREATE INDEX idx_path_assessments_type ON public.path_assessments(assessment_type);

COMMENT ON TABLE public.path_assessments IS 'Assessments for PathLab activities';
COMMENT ON COLUMN public.path_assessments.assessment_type IS 'Type of assessment: inherited from nodes (quiz, text_answer, file_upload, image_upload, checklist) or PathLab-specific (daily_reflection, interest_rating, energy_check)';
COMMENT ON COLUMN public.path_assessments.metadata IS 'Additional data: quiz questions, checklist items, rating scales, etc.';

-- =====================================================
-- PATH QUIZ QUESTIONS TABLE
-- Replicates quiz_questions functionality for PathLab
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.path_assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_option TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_path_quiz_questions_assessment ON public.path_quiz_questions(assessment_id);

COMMENT ON TABLE public.path_quiz_questions IS 'Quiz questions for PathLab quiz assessments';
COMMENT ON COLUMN public.path_quiz_questions.options IS 'Array of {option: "A", text: "Answer text"} objects';

-- =====================================================
-- PATH ACTIVITY PROGRESS TABLE
-- Track user progress through PathLab activities
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_activity_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.path_enrollments(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.path_activities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(enrollment_id, activity_id)
);

CREATE INDEX idx_path_activity_progress_enrollment ON public.path_activity_progress(enrollment_id);
CREATE INDEX idx_path_activity_progress_activity ON public.path_activity_progress(activity_id);
CREATE INDEX idx_path_activity_progress_status ON public.path_activity_progress(status);

COMMENT ON TABLE public.path_activity_progress IS 'User progress tracking for PathLab activities';
COMMENT ON COLUMN public.path_activity_progress.status IS 'Progress status: not_started, in_progress, completed, skipped';

-- =====================================================
-- PATH ASSESSMENT SUBMISSIONS TABLE
-- Store user responses to PathLab assessments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.path_assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES public.path_activity_progress(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.path_assessments(id) ON DELETE CASCADE,
  text_answer TEXT,
  file_urls TEXT[],
  image_url TEXT,
  quiz_answers JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(progress_id, assessment_id)
);

CREATE INDEX idx_path_submissions_progress ON public.path_assessment_submissions(progress_id);
CREATE INDEX idx_path_submissions_assessment ON public.path_assessment_submissions(assessment_id);

COMMENT ON TABLE public.path_assessment_submissions IS 'User responses to PathLab assessments';
COMMENT ON COLUMN public.path_assessment_submissions.quiz_answers IS 'Object mapping question_id to selected option';
COMMENT ON COLUMN public.path_assessment_submissions.metadata IS 'Additional submission data: checklist checks, emotion data, ratings, etc.';

-- =====================================================
-- UPDATE PATH_DAYS TABLE
-- Add fields for migration tracking and optional titles
-- =====================================================
ALTER TABLE public.path_days
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS migrated_from_nodes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_completed_at TIMESTAMPTZ;

-- Index for migration tracking
CREATE INDEX IF NOT EXISTS idx_path_days_migrated ON public.path_days(migrated_from_nodes);

COMMENT ON COLUMN public.path_days.title IS 'Optional title for the day (e.g., "Day 1: Introduction")';
COMMENT ON COLUMN public.path_days.migrated_from_nodes IS 'Tracks whether this day has been migrated from node_ids to path_activities';
COMMENT ON COLUMN public.path_days.migration_completed_at IS 'Timestamp when migration completed for this day';

-- =====================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- =====================================================
CREATE OR REPLACE FUNCTION update_path_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER path_activities_updated_at
  BEFORE UPDATE ON public.path_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();

CREATE TRIGGER path_assessments_updated_at
  BEFORE UPDATE ON public.path_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();

CREATE TRIGGER path_activity_progress_updated_at
  BEFORE UPDATE ON public.path_activity_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();
