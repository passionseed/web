-- Create team_node_assignments table to support multiple assignments per node
CREATE TABLE IF NOT EXISTS public.team_node_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id uuid NOT NULL REFERENCES public.classroom_teams(id) ON DELETE CASCADE,
    node_id uuid NOT NULL REFERENCES public.map_nodes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    
    -- Ensure unique assignments per team/node/user combination
    UNIQUE(team_id, node_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_team_node_assignments_team_node ON public.team_node_assignments(team_id, node_id);
CREATE INDEX idx_team_node_assignments_user ON public.team_node_assignments(user_id);
CREATE INDEX idx_team_node_assignments_node ON public.team_node_assignments(node_id);

-- RLS policies
ALTER TABLE public.team_node_assignments ENABLE ROW LEVEL SECURITY;

-- Team leaders can manage assignments
CREATE POLICY "Team leaders can manage assignments" ON public.team_node_assignments
    USING (
        team_id IN (
            SELECT team_id FROM team_memberships 
            WHERE user_id = auth.uid() 
            AND is_leader = true 
            AND left_at IS NULL
        )
    );

-- Team members can view assignments in their team
CREATE POLICY "Team members can view assignments" ON public.team_node_assignments
    FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM team_memberships 
            WHERE user_id = auth.uid() 
            AND left_at IS NULL
        )
    );

-- Instructors and TAs can manage all assignments in their classrooms
CREATE POLICY "Instructors can manage assignments" ON public.team_node_assignments
    USING (
        team_id IN (
            SELECT ct.id FROM classroom_teams ct
            JOIN classroom_memberships cm ON ct.classroom_id = cm.classroom_id
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('instructor', 'ta')
        )
    );

-- Migrate existing single assignments from team_node_progress to new table
INSERT INTO public.team_node_assignments (team_id, node_id, user_id, assigned_at, created_at)
SELECT 
    team_id, 
    node_id, 
    assigned_to as user_id,
    updated_at as assigned_at,
    created_at
FROM public.team_node_progress 
WHERE assigned_to IS NOT NULL
ON CONFLICT (team_id, node_id, user_id) DO NOTHING;

-- Add comment explaining the new table
COMMENT ON TABLE public.team_node_assignments IS 'Tracks multiple team member assignments to specific nodes, replacing the single assigned_to field in team_node_progress';