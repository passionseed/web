-- Hackathon Phase Activities
-- Adds direct activity content to hackathon phases (PathLab without the day layer)

-- 1. Add due_at to phases
ALTER TABLE public.hackathon_program_phases
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

COMMENT ON COLUMN public.hackathon_program_phases.due_at IS 'Deadline for completing this phase';

-- 2. Phase activities (mirrors path_activities, references phase instead of path_day)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.hackathon_program_phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  display_order int NOT NULL DEFAULT 0,
  estimated_minutes int,
  is_required boolean NOT NULL DEFAULT true,
  is_draft boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (phase_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_activities_phase
  ON public.hackathon_phase_activities(phase_id, display_order);

COMMENT ON TABLE public.hackathon_phase_activities IS 'Activities within a hackathon phase, analogous to path_activities without the day layer';

-- 3. Activity content (mirrors path_content)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN (
    'video', 'short_video', 'canva_slide', 'text', 'image', 'pdf', 'ai_chat', 'npc_chat'
  )),
  content_title text,
  content_url text,
  content_body text,
  display_order int NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (activity_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_activity_content_activity
  ON public.hackathon_phase_activity_content(activity_id, display_order);

COMMENT ON TABLE public.hackathon_phase_activity_content IS 'Content items for hackathon phase activities. For video/short_video, URL goes in content_url.';

-- 4. Activity assessments (mirrors path_assessments)
CREATE TABLE IF NOT EXISTS public.hackathon_phase_activity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'text_answer', 'file_upload', 'image_upload'
  )),
  points_possible int,
  is_graded boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One assessment per activity
  UNIQUE (activity_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_phase_activity_assessments_activity
  ON public.hackathon_phase_activity_assessments(activity_id);

COMMENT ON TABLE public.hackathon_phase_activity_assessments IS 'Submission definitions for hackathon phase activities. One per activity max.';

-- 5. Updated_at triggers
DROP TRIGGER IF EXISTS hackathon_phase_activities_handle_updated_at ON public.hackathon_phase_activities;
CREATE TRIGGER hackathon_phase_activities_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS hackathon_phase_activity_assessments_handle_updated_at ON public.hackathon_phase_activity_assessments;
CREATE TRIGGER hackathon_phase_activity_assessments_handle_updated_at
  BEFORE UPDATE ON public.hackathon_phase_activity_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Extend individual submissions to also reference phase activities
--    (nullable — existing rows reference hackathon_phase_modules, new rows reference hackathon_phase_activities)
ALTER TABLE public.hackathon_activity_individual_submissions
  ADD COLUMN IF NOT EXISTS phase_activity_id uuid REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE;

ALTER TABLE public.hackathon_activity_team_submissions
  ADD COLUMN IF NOT EXISTS phase_activity_id uuid REFERENCES public.hackathon_phase_activities(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hackathon_individual_submissions_phase_activity
  ON public.hackathon_activity_individual_submissions(phase_activity_id);

CREATE INDEX IF NOT EXISTS idx_hackathon_team_submissions_phase_activity
  ON public.hackathon_activity_team_submissions(phase_activity_id);
