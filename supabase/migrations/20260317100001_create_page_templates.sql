-- =====================================================
-- PAGE TEMPLATES TABLE
-- Pre-built page structures with multiple activities
-- =====================================================

CREATE TABLE IF NOT EXISTS public.page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  -- Template data (array of activity specs)
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Page-level metadata
  context_text TEXT,
  reflection_prompts TEXT[] DEFAULT ARRAY[]::TEXT[],
  estimated_total_minutes INT,

  -- Sharing/visibility
  visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'organization', 'public')),

  -- Metadata
  use_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_page_templates_created_by ON public.page_templates(created_by);
CREATE INDEX idx_page_templates_visibility ON public.page_templates(visibility, created_by);
CREATE INDEX idx_page_templates_popular ON public.page_templates(use_count DESC);

-- Full-text search
CREATE INDEX idx_page_templates_search ON public.page_templates
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Row Level Security
ALTER TABLE public.page_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own + organization/public templates
CREATE POLICY "Users can view accessible templates"
  ON public.page_templates
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'organization' AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
    ))
  );

-- Policy: Users can create their own templates
CREATE POLICY "Users can create own page templates"
  ON public.page_templates
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own page templates"
  ON public.page_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own page templates"
  ON public.page_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- Policy: Admins can manage all templates
CREATE POLICY "Admins can manage all page templates"
  ON public.page_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update timestamp trigger
CREATE TRIGGER page_templates_updated_at
  BEFORE UPDATE ON public.page_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_path_content_updated_at();

-- Comments
COMMENT ON TABLE public.page_templates IS 'Pre-built page structures for rapid page creation';
COMMENT ON COLUMN public.page_templates.activities IS 'Array of activity specs: [{title, activity_type, content_template, assessment_template}, ...]';
COMMENT ON COLUMN public.page_templates.visibility IS 'private (owner only), organization (all instructors), public (everyone)';
