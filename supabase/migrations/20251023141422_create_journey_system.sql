-- Migration: Journey Map System Creation
-- Created: 2025-10-23 14:14:22
-- Description: Creates a comprehensive personal journey map system for tracking
--              user goals, projects, milestones, and progress. Supports both
--              short-term projects and long-term North Star goals with visual
--              mapping, journaling, and reflection capabilities.

-- ========================================
-- EXTENSIONS AND PREREQUISITES
-- ========================================

-- Ensure we have required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- CORE TABLES
-- ========================================

-- 1. JOURNEY PROJECTS TABLE
-- Represents individual projects or goals in a user's journey
CREATE TABLE IF NOT EXISTS public.journey_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    why TEXT,
    project_type TEXT NOT NULL DEFAULT 'short_term',
    north_star_id UUID REFERENCES public.journey_projects(id) ON DELETE SET NULL,
    is_main_quest BOOLEAN DEFAULT false,
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'not_started',
    color_theme TEXT DEFAULT '#6366f1',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT journey_projects_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
    CONSTRAINT journey_projects_description_length CHECK (char_length(description) <= 5000),
    CONSTRAINT journey_projects_goal_length CHECK (char_length(goal) <= 2000),
    CONSTRAINT journey_projects_why_length CHECK (char_length(why) <= 2000),
    CONSTRAINT journey_projects_valid_type CHECK (project_type IN ('short_term', 'north_star')),
    CONSTRAINT journey_projects_valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
    CONSTRAINT journey_projects_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    ),
    CONSTRAINT journey_projects_north_star_logic CHECK (
        (project_type = 'north_star' AND north_star_id IS NULL) OR
        (project_type = 'short_term')
    ),
    CONSTRAINT journey_projects_color_format CHECK (color_theme ~ '^#[0-9a-fA-F]{6}$')
);

-- 2. PROJECT MILESTONES TABLE
-- Individual steps or milestones within a project
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.journey_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    details TEXT,
    order_index INTEGER NOT NULL,
    progress_percentage INTEGER DEFAULT 0,
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'not_started',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT project_milestones_title_length CHECK (char_length(title) >= 1 AND char_length(title) <= 500),
    CONSTRAINT project_milestones_description_length CHECK (char_length(description) <= 2000),
    CONSTRAINT project_milestones_details_length CHECK (char_length(details) <= 10000),
    CONSTRAINT project_milestones_order_positive CHECK (order_index >= 0),
    CONSTRAINT project_milestones_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT project_milestones_valid_status CHECK (status IN ('not_started', 'in_progress', 'completed')),
    CONSTRAINT project_milestones_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed')
    ),
    CONSTRAINT project_milestones_unique_project_order UNIQUE(project_id, order_index)
);

-- 3. MILESTONE PATHS TABLE
-- Defines relationships and dependencies between milestones
CREATE TABLE IF NOT EXISTS public.milestone_paths (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
    destination_milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
    path_type TEXT DEFAULT 'linear',

    -- Constraints
    CONSTRAINT milestone_paths_unique_connection UNIQUE(source_milestone_id, destination_milestone_id),
    CONSTRAINT milestone_paths_no_self_reference CHECK (source_milestone_id != destination_milestone_id),
    CONSTRAINT milestone_paths_valid_type CHECK (path_type IN ('linear', 'conditional', 'parallel'))
);

-- 4. MILESTONE JOURNALS TABLE
-- Progress logs and reflections for individual milestones
CREATE TABLE IF NOT EXISTS public.milestone_journals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    progress_percentage INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT milestone_journals_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
    CONSTRAINT milestone_journals_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- 5. PROJECT REFLECTIONS TABLE
-- High-level reflections on projects and achievements
CREATE TABLE IF NOT EXISTS public.project_reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.journey_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reflection_type TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Constraints
    CONSTRAINT project_reflections_content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
    CONSTRAINT project_reflections_valid_type CHECK (reflection_type IN ('milestone_complete', 'project_complete', 'general'))
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Journey projects indexes
CREATE INDEX IF NOT EXISTS idx_journey_projects_user ON public.journey_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_projects_status ON public.journey_projects(status);
CREATE INDEX IF NOT EXISTS idx_journey_projects_type ON public.journey_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_journey_projects_north_star ON public.journey_projects(north_star_id) WHERE north_star_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_projects_created_at ON public.journey_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journey_projects_main_quest ON public.journey_projects(user_id, is_main_quest) WHERE is_main_quest = true;
CREATE INDEX IF NOT EXISTS idx_journey_projects_user_status ON public.journey_projects(user_id, status);

-- Project milestones indexes
CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON public.project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_order ON public.project_milestones(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_project_milestones_created_at ON public.project_milestones(created_at DESC);

-- Milestone paths indexes
CREATE INDEX IF NOT EXISTS idx_milestone_paths_source ON public.milestone_paths(source_milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_paths_destination ON public.milestone_paths(destination_milestone_id);

-- Milestone journals indexes
CREATE INDEX IF NOT EXISTS idx_milestone_journals_milestone ON public.milestone_journals(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_journals_user ON public.milestone_journals(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_journals_created_at ON public.milestone_journals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestone_journals_user_milestone ON public.milestone_journals(user_id, milestone_id);

-- Project reflections indexes
CREATE INDEX IF NOT EXISTS idx_project_reflections_project ON public.project_reflections(project_id);
CREATE INDEX IF NOT EXISTS idx_project_reflections_user ON public.project_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_project_reflections_type ON public.project_reflections(reflection_type);
CREATE INDEX IF NOT EXISTS idx_project_reflections_created_at ON public.project_reflections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_reflections_user_project ON public.project_reflections(user_id, project_id);

-- ========================================
-- TRIGGERS
-- ========================================

-- Updated_at triggers
CREATE TRIGGER update_journey_projects_updated_at
    BEFORE UPDATE ON public.journey_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at
    BEFORE UPDATE ON public.project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update project status based on milestone completion
CREATE OR REPLACE FUNCTION public.update_project_status_from_milestones()
RETURNS TRIGGER AS $$
DECLARE
    total_milestones INTEGER;
    completed_milestones INTEGER;
    in_progress_milestones INTEGER;
    new_status TEXT;
BEGIN
    -- Count milestone statuses for the project
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'in_progress')
    INTO total_milestones, completed_milestones, in_progress_milestones
    FROM public.project_milestones
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);

    -- Determine new project status
    IF total_milestones = 0 THEN
        new_status := 'not_started';
    ELSIF completed_milestones = total_milestones THEN
        new_status := 'completed';
    ELSIF in_progress_milestones > 0 OR completed_milestones > 0 THEN
        new_status := 'in_progress';
    ELSE
        new_status := 'not_started';
    END IF;

    -- Update the project status
    UPDATE public.journey_projects
    SET
        status = new_status,
        completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE NULL END
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_status
    AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.update_project_status_from_milestones();

-- Update milestone progress percentage when journals are added
CREATE OR REPLACE FUNCTION public.update_milestone_progress_from_journal()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the milestone's progress to match the latest journal entry
    UPDATE public.project_milestones
    SET progress_percentage = NEW.progress_percentage
    WHERE id = NEW.milestone_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_milestone_progress
    AFTER INSERT ON public.milestone_journals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_milestone_progress_from_journal();

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.journey_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reflections ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES - JOURNEY PROJECTS
-- ========================================

CREATE POLICY "Users can manage their own journey projects" ON public.journey_projects
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ========================================
-- RLS POLICIES - PROJECT MILESTONES
-- ========================================

CREATE POLICY "Users can manage milestones in their projects" ON public.project_milestones
    FOR ALL
    USING (
        project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    );

-- ========================================
-- RLS POLICIES - MILESTONE PATHS
-- ========================================

CREATE POLICY "Users can manage paths in their projects" ON public.milestone_paths
    FOR ALL
    USING (
        source_milestone_id IN (
            SELECT pm.id FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        source_milestone_id IN (
            SELECT pm.id FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = auth.uid()
        )
        AND destination_milestone_id IN (
            SELECT pm.id FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = auth.uid()
        )
    );

-- ========================================
-- RLS POLICIES - MILESTONE JOURNALS
-- ========================================

CREATE POLICY "Users can manage their own milestone journals" ON public.milestone_journals
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND milestone_id IN (
            SELECT pm.id FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = auth.uid()
        )
    );

-- ========================================
-- RLS POLICIES - PROJECT REFLECTIONS
-- ========================================

CREATE POLICY "Users can manage their own project reflections" ON public.project_reflections
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND project_id IN (
            SELECT id FROM public.journey_projects
            WHERE user_id = auth.uid()
        )
    );

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to get project statistics
CREATE OR REPLACE FUNCTION public.get_project_stats(project_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user has access to this project
    IF NOT EXISTS (
        SELECT 1 FROM public.journey_projects
        WHERE id = project_uuid AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to project statistics';
    END IF;

    SELECT json_build_object(
        'total_milestones', (
            SELECT COUNT(*) FROM public.project_milestones
            WHERE project_id = project_uuid
        ),
        'completed_milestones', (
            SELECT COUNT(*) FROM public.project_milestones
            WHERE project_id = project_uuid AND status = 'completed'
        ),
        'in_progress_milestones', (
            SELECT COUNT(*) FROM public.project_milestones
            WHERE project_id = project_uuid AND status = 'in_progress'
        ),
        'average_progress', (
            SELECT COALESCE(AVG(progress_percentage), 0)::INTEGER
            FROM public.project_milestones
            WHERE project_id = project_uuid
        ),
        'total_journal_entries', (
            SELECT COUNT(*) FROM public.milestone_journals mj
            JOIN public.project_milestones pm ON pm.id = mj.milestone_id
            WHERE pm.project_id = project_uuid
        ),
        'total_reflections', (
            SELECT COUNT(*) FROM public.project_reflections
            WHERE project_id = project_uuid
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user journey overview
CREATE OR REPLACE FUNCTION public.get_journey_overview(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is requesting their own data
    IF user_uuid != auth.uid() THEN
        RAISE EXCEPTION 'Access denied to user journey overview';
    END IF;

    SELECT json_build_object(
        'total_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid
        ),
        'active_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND status = 'in_progress'
        ),
        'completed_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND status = 'completed'
        ),
        'north_star_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND project_type = 'north_star'
        ),
        'short_term_projects', (
            SELECT COUNT(*) FROM public.journey_projects
            WHERE user_id = user_uuid AND project_type = 'short_term'
        ),
        'total_milestones', (
            SELECT COUNT(*) FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = user_uuid
        ),
        'completed_milestones', (
            SELECT COUNT(*) FROM public.project_milestones pm
            JOIN public.journey_projects jp ON jp.id = pm.project_id
            WHERE jp.user_id = user_uuid AND pm.status = 'completed'
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANTS AND PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.journey_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.milestone_paths TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.milestone_journals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_reflections TO authenticated;

-- Grant execute permissions for utility functions
GRANT EXECUTE ON FUNCTION public.get_project_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_journey_overview(UUID) TO authenticated;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.journey_projects IS 'Personal journey projects and goals with visual mapping support';
COMMENT ON COLUMN public.journey_projects.project_type IS 'Type of project: short_term (tactical) or north_star (long-term vision)';
COMMENT ON COLUMN public.journey_projects.north_star_id IS 'Links short-term projects to their associated North Star goal';
COMMENT ON COLUMN public.journey_projects.is_main_quest IS 'Indicates if this is the user''s primary current focus';
COMMENT ON COLUMN public.journey_projects.position_x IS 'X coordinate for visual map positioning';
COMMENT ON COLUMN public.journey_projects.position_y IS 'Y coordinate for visual map positioning';
COMMENT ON COLUMN public.journey_projects.color_theme IS 'Hex color code for visual theming';
COMMENT ON COLUMN public.journey_projects.metadata IS 'Flexible JSON storage for additional project data';
COMMENT ON COLUMN public.journey_projects.why IS 'User''s motivation and purpose for this project';

COMMENT ON TABLE public.project_milestones IS 'Individual milestones and steps within journey projects';
COMMENT ON COLUMN public.project_milestones.order_index IS 'Sequential ordering of milestones within project';
COMMENT ON COLUMN public.project_milestones.progress_percentage IS 'Current progress on milestone (0-100)';
COMMENT ON COLUMN public.project_milestones.details IS 'Combined detailed description and action items';

COMMENT ON TABLE public.milestone_paths IS 'Defines dependencies and relationships between milestones';
COMMENT ON COLUMN public.milestone_paths.path_type IS 'Type of connection: linear (sequential), conditional, or parallel';

COMMENT ON TABLE public.milestone_journals IS 'Progress logs and journal entries for milestones';
COMMENT ON COLUMN public.milestone_journals.progress_percentage IS 'Progress level at time of journal entry (0-100)';

COMMENT ON TABLE public.project_reflections IS 'High-level reflections on projects and achievements';
COMMENT ON COLUMN public.project_reflections.reflection_type IS 'Type of reflection: milestone_complete, project_complete, or general';

COMMENT ON FUNCTION public.get_project_stats(UUID) IS 'Returns comprehensive statistics for a specific project';
COMMENT ON FUNCTION public.get_journey_overview(UUID) IS 'Returns overview statistics for a user''s entire journey';

-- ========================================
-- VALIDATION AND VERIFICATION
-- ========================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'journey_projects',
        'project_milestones',
        'milestone_paths',
        'milestone_journals',
        'project_reflections'
    );

    IF table_count != 5 THEN
        RAISE EXCEPTION 'Not all journey system tables were created successfully. Expected 5, got %', table_count;
    END IF;

    RAISE NOTICE 'Journey system migration completed successfully. Created % tables with RLS policies, triggers, and utility functions.', table_count;
END$$;
