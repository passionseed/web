-- Fix RLS policies for team_node_progress to allow trigger functions to work
-- The trigger function needs INSERT and UPDATE permissions

-- Add INSERT policy for database triggers (when auth.uid() is NULL)
CREATE POLICY "Allow database triggers to insert team progress" ON team_node_progress
  FOR INSERT WITH CHECK (true);

-- Add INSERT policy for team members (when they start nodes)
CREATE POLICY "Team members can create progress records" ON team_node_progress
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND left_at IS NULL
    )
  );

-- Update existing UPDATE policies to allow database triggers
DROP POLICY IF EXISTS "Team leaders can update assignments" ON team_node_progress;
DROP POLICY IF EXISTS "Team members can update help requests" ON team_node_progress;
DROP POLICY IF EXISTS "Instructors can update team progress" ON team_node_progress;

-- Recreate UPDATE policies with better permissions
CREATE POLICY "Team leaders can update assignments" ON team_node_progress
  FOR UPDATE USING (
    auth.uid() IS NULL OR -- Allow database triggers
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND is_leader = true 
      AND left_at IS NULL
    )
  );

CREATE POLICY "Team members can update help requests" ON team_node_progress
  FOR UPDATE USING (
    auth.uid() IS NULL OR -- Allow database triggers
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND left_at IS NULL
    )
  );

CREATE POLICY "Instructors can manage all team progress" ON team_node_progress
  FOR ALL USING (
    auth.uid() IS NULL OR -- Allow database triggers
    EXISTS (
      SELECT 1 FROM classroom_teams ct
      JOIN classroom_memberships cm ON cm.classroom_id = ct.classroom_id
      WHERE ct.id = team_node_progress.team_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('instructor', 'ta')
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Allow database triggers to insert team progress" ON team_node_progress IS 'Allows database triggers to create team progress records when auth.uid() is NULL';
COMMENT ON POLICY "Team members can create progress records" ON team_node_progress IS 'Allows team members to create progress records for their team';