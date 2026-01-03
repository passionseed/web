-- Create tables for Project Management System

-- ps_projects table
CREATE TABLE IF NOT EXISTS public.ps_projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    goal text,
    why text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ps_tasks table
CREATE TABLE IF NOT EXISTS public.ps_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.ps_projects(id) ON DELETE CASCADE,
    goal text NOT NULL,
    status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    difficulty integer DEFAULT 1,
    notes text,
    user_id uuid REFERENCES auth.users(id), -- Assignee/Owner
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ps_focus_sessions table
CREATE TABLE IF NOT EXISTS public.ps_focus_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid REFERENCES public.ps_tasks(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id),
    duration_minutes integer NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ps_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ps_focus_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for ps_projects
CREATE POLICY "Enable read access for passion-seed-team" ON public.ps_projects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable insert access for passion-seed-team" ON public.ps_projects
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable update access for passion-seed-team" ON public.ps_projects
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable delete access for passion-seed-team" ON public.ps_projects
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

-- Policies for ps_tasks
CREATE POLICY "Enable read access for passion-seed-team" ON public.ps_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable insert access for passion-seed-team" ON public.ps_tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable update access for passion-seed-team" ON public.ps_tasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable delete access for passion-seed-team" ON public.ps_tasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

-- Policies for ps_focus_sessions
CREATE POLICY "Enable read access for passion-seed-team" ON public.ps_focus_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable insert access for passion-seed-team" ON public.ps_focus_sessions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable update access for passion-seed-team" ON public.ps_focus_sessions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

CREATE POLICY "Enable delete access for passion-seed-team" ON public.ps_focus_sessions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'passion-seed-team'
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER update_ps_projects_updated_at
    BEFORE UPDATE ON public.ps_projects
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_ps_tasks_updated_at
    BEFORE UPDATE ON public.ps_tasks
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
