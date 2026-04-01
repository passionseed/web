-- Hackathon Phase Activities Schema
-- First phase: Ideation

-- ============================================================================
-- TABLES
-- ============================================================================

-- Phases within a hackathon program
CREATE TABLE IF NOT EXISTS hackathon_program_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES hackathon_programs(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  phase_number int NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(program_id, phase_number),
  UNIQUE(program_id, slug)
);

-- Activities within a phase
CREATE TABLE IF NOT EXISTS hackathon_phase_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES hackathon_program_phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  display_order int NOT NULL DEFAULT 0,
  estimated_minutes int,
  is_required bool DEFAULT true,
  is_draft bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content items for each activity (video, text, ai_chat, etc.)
CREATE TABLE IF NOT EXISTS hackathon_phase_activity_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES hackathon_phase_activities(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN (
    'video', 'short_video', 'canva_slide', 'text', 'image', 'pdf', 'ai_chat', 'npc_chat'
  )),
  content_title text,
  content_url text,
  content_body text,
  display_order int NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Assessments for each activity (one per activity)
CREATE TABLE IF NOT EXISTS hackathon_phase_activity_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES hackathon_phase_activities(id) ON DELETE CASCADE,
  assessment_type text NOT NULL CHECK (assessment_type IN (
    'text_answer', 'file_upload', 'image_upload'
  )),
  points_possible int DEFAULT 0,
  is_graded bool DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(activity_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hackathon_phases_program ON hackathon_program_phases(program_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_phases_number ON hackathon_program_phases(program_id, phase_number);
CREATE INDEX IF NOT EXISTS idx_hackathon_activities_phase ON hackathon_phase_activities(phase_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_activity_content ON hackathon_phase_activity_content(activity_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_activity_assessments ON hackathon_phase_activity_assessments(activity_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE hackathon_program_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_phase_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_phase_activity_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_phase_activity_assessments ENABLE ROW LEVEL SECURITY;

-- Phases: authenticated users can view; service role can modify (admin UI)
CREATE POLICY "Phases viewable by authenticated users"
  ON hackathon_program_phases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Phases modifiable by service role"
  ON hackathon_program_phases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Activities: authenticated users can view; service role can modify
CREATE POLICY "Activities viewable by authenticated users"
  ON hackathon_phase_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Activities modifiable by service role"
  ON hackathon_phase_activities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Content: authenticated users can view; service role can modify
CREATE POLICY "Content viewable by authenticated users"
  ON hackathon_phase_activity_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Content modifiable by service role"
  ON hackathon_phase_activity_content FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Assessments: authenticated users can view; service role can modify
CREATE POLICY "Assessments viewable by authenticated users"
  ON hackathon_phase_activity_assessments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Assessments modifiable by service role"
  ON hackathon_phase_activity_assessments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS FOR ADMIN UI
-- ============================================================================

-- Function to create a phase (called from admin UI)
CREATE OR REPLACE FUNCTION create_hackathon_phase(
  p_program_id uuid,
  p_slug text,
  p_title text,
  p_description text DEFAULT NULL,
  p_phase_number int,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_due_at timestamptz DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_phase_id uuid;
BEGIN
  INSERT INTO hackathon_program_phases (
    program_id, slug, title, description, phase_number, starts_at, ends_at, due_at
  ) VALUES (
    p_program_id, p_slug, p_title, p_description, p_phase_number, p_starts_at, p_ends_at, p_due_at
  ) RETURNING id INTO v_phase_id;
  
  RETURN v_phase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create an activity
CREATE OR REPLACE FUNCTION create_hackathon_activity(
  p_phase_id uuid,
  p_title text,
  p_instructions text DEFAULT NULL,
  p_display_order int DEFAULT 0,
  p_estimated_minutes int DEFAULT NULL,
  p_is_required bool DEFAULT true,
  p_is_draft bool DEFAULT false
)
RETURNS uuid AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO hackathon_phase_activities (
    phase_id, title, instructions, display_order, estimated_minutes, is_required, is_draft
  ) VALUES (
    p_phase_id, p_title, p_instructions, p_display_order, p_estimated_minutes, p_is_required, p_is_draft
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add content to an activity
CREATE OR REPLACE FUNCTION add_hackathon_activity_content(
  p_activity_id uuid,
  p_content_type text,
  p_content_title text DEFAULT NULL,
  p_content_url text DEFAULT NULL,
  p_content_body text DEFAULT NULL,
  p_display_order int DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_content_id uuid;
BEGIN
  INSERT INTO hackathon_phase_activity_content (
    activity_id, content_type, content_title, content_url, content_body, display_order, metadata
  ) VALUES (
    p_activity_id, p_content_type, p_content_title, p_content_url, p_content_body, p_display_order, p_metadata
  ) RETURNING id INTO v_content_id;
  
  RETURN v_content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add assessment to an activity
CREATE OR REPLACE FUNCTION add_hackathon_activity_assessment(
  p_activity_id uuid,
  p_assessment_type text,
  p_points_possible int DEFAULT 0,
  p_is_graded bool DEFAULT false,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_assessment_id uuid;
BEGIN
  INSERT INTO hackathon_phase_activity_assessments (
    activity_id, assessment_type, points_possible, is_graded, metadata
  ) VALUES (
    p_activity_id, p_assessment_type, p_points_possible, p_is_graded, p_metadata
  ) RETURNING id INTO v_assessment_id;
  
  RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hackathon_program_phases_updated
  BEFORE UPDATE ON hackathon_program_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hackathon_phase_activities_updated
  BEFORE UPDATE ON hackathon_phase_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_hackathon_phase_activity_assessments_updated
  BEFORE UPDATE ON hackathon_phase_activity_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
