-- =====================================================
-- ACTIVITY TEMPLATES TABLE
-- Reusable activity blueprints for the page builder
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'learning'
    CHECK (activity_type IN ('learning', 'reflection', 'milestone', 'checkpoint', 'journal_prompt')),

  -- Template data (JSON structure defining content/assessment)
  content_template JSONB,
  assessment_template JSONB,

  -- Metadata
  estimated_minutes INT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  use_count INT NOT NULL DEFAULT 0, -- Track template popularity

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_activity_templates_created_by ON public.activity_templates(created_by);
CREATE INDEX idx_activity_templates_public ON public.activity_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_activity_templates_type ON public.activity_templates(activity_type);
CREATE INDEX idx_activity_templates_popular ON public.activity_templates(use_count DESC);

-- Full-text search index
CREATE INDEX idx_activity_templates_search ON public.activity_templates
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Row Level Security
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates + public templates
CREATE POLICY "Users can view own and public templates"
  ON public.activity_templates
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_public = true
  );

-- Policy: Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON public.activity_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.activity_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.activity_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Policy: Admins can manage all templates (including making public)
CREATE POLICY "Admins can manage all templates"
  ON public.activity_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update timestamp trigger
CREATE TRIGGER activity_templates_updated_at
  BEFORE UPDATE ON public.activity_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();

-- Comments
COMMENT ON TABLE public.activity_templates IS 'Reusable activity blueprints for page builder library';
COMMENT ON COLUMN public.activity_templates.content_template IS 'JSON structure: {content_type, content_url, content_body, metadata}';
COMMENT ON COLUMN public.activity_templates.assessment_template IS 'JSON structure: {assessment_type, points_possible, is_graded, metadata, quiz_questions}';
COMMENT ON COLUMN public.activity_templates.use_count IS 'Number of times this template has been used (for popularity ranking)';
