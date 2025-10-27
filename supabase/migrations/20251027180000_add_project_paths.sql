-- Migration: Add project_paths table for project-to-project linking
-- Pattern: Following milestone_paths structure
-- Created: 2025-10-27

-- ========================================
-- CREATE PROJECT_PATHS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS public.project_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_project_id UUID NOT NULL REFERENCES public.journey_projects(id) ON DELETE CASCADE,
    destination_project_id UUID NOT NULL REFERENCES public.journey_projects(id) ON DELETE CASCADE,
    path_type VARCHAR(50) NOT NULL CHECK (path_type IN ('dependency', 'relates_to', 'leads_to')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Constraints
    CONSTRAINT project_paths_no_self_reference CHECK (source_project_id != destination_project_id),
    CONSTRAINT project_paths_unique_connection UNIQUE (source_project_id, destination_project_id)
);

-- ========================================
-- INDEXES
-- ========================================

-- Index for efficient lookup by source project
CREATE INDEX IF NOT EXISTS idx_project_paths_source
    ON public.project_paths(source_project_id);

-- Index for efficient lookup by destination project
CREATE INDEX IF NOT EXISTS idx_project_paths_destination
    ON public.project_paths(destination_project_id);

-- Composite index for bidirectional queries
CREATE INDEX IF NOT EXISTS idx_project_paths_both
    ON public.project_paths(source_project_id, destination_project_id);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS
ALTER TABLE public.project_paths ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view paths between their own projects
CREATE POLICY "Users can view their project paths"
    ON public.project_paths
    FOR SELECT
    USING (
        source_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can create paths between their own projects
CREATE POLICY "Users can create paths in their projects"
    ON public.project_paths
    FOR INSERT
    WITH CHECK (
        source_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
        AND
        destination_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update paths in their projects
CREATE POLICY "Users can update their project paths"
    ON public.project_paths
    FOR UPDATE
    USING (
        source_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        source_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
        AND
        destination_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete paths in their projects
CREATE POLICY "Users can delete their project paths"
    ON public.project_paths
    FOR DELETE
    USING (
        source_project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    );

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE public.project_paths IS 'Stores relationships and dependencies between journey projects';
COMMENT ON COLUMN public.project_paths.source_project_id IS 'The originating project in the relationship';
COMMENT ON COLUMN public.project_paths.destination_project_id IS 'The target project in the relationship';
COMMENT ON COLUMN public.project_paths.path_type IS 'Type of relationship: dependency (required before), relates_to (thematically connected), leads_to (natural progression)';

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_paths TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
