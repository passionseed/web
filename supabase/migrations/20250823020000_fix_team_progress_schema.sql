-- Fix team_node_progress table schema
-- Remove best_submission_id and add submitted_by, assigned_to, help_requested fields

-- First, drop existing constraints and columns
ALTER TABLE public.team_node_progress 
  DROP CONSTRAINT IF EXISTS team_node_progress_best_submission_id_fkey,
  DROP COLUMN IF EXISTS best_submission_id;

-- Add new columns for better team progress tracking
ALTER TABLE public.team_node_progress 
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS help_requested BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS help_request_message TEXT,
  ADD COLUMN IF NOT EXISTS help_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_meeting_id UUID;

-- Update status enum to include more granular team statuses
ALTER TABLE public.team_node_progress 
  DROP CONSTRAINT IF EXISTS team_node_progress_status_check;

ALTER TABLE public.team_node_progress
  ADD CONSTRAINT team_node_progress_status_check 
  CHECK (status IN ('not_started', 'assigned', 'in_progress', 'submitted', 'passed', 'passed_late', 'passed_zero_grade', 'failed'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_team_node_progress_submitted_by ON team_node_progress(submitted_by);
CREATE INDEX IF NOT EXISTS idx_team_node_progress_assigned_to ON team_node_progress(assigned_to);
CREATE INDEX IF NOT EXISTS idx_team_node_progress_help_requested ON team_node_progress(help_requested) WHERE help_requested = true;

-- Drop old triggers and functions
DROP TRIGGER IF EXISTS trigger_update_team_progress ON student_node_progress;
DROP TRIGGER IF EXISTS trigger_recalc_team_progress_on_membership ON team_memberships;
DROP FUNCTION IF EXISTS update_team_progress_from_individual();
DROP FUNCTION IF EXISTS recalc_team_progress_on_membership_change();

-- Create improved function to update team progress
CREATE OR REPLACE FUNCTION update_team_progress_from_individual()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val UUID;
  highest_status_val TEXT;
  submitted_by_val UUID;
  team_node_exists BOOLEAN := FALSE;
BEGIN
  -- Get the user's team for this map node (if any)
  SELECT tm.team_id INTO team_id_val
  FROM team_memberships tm
  JOIN classroom_team_maps ctm ON ctm.team_id = tm.team_id
  JOIN map_nodes mn ON mn.map_id = ctm.map_id
  WHERE tm.user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND mn.id = COALESCE(NEW.node_id, OLD.node_id)
    AND tm.left_at IS NULL
  LIMIT 1;

  -- Exit if this user is not in a team for this map
  IF team_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if team progress record already exists
  SELECT EXISTS(
    SELECT 1 FROM team_node_progress 
    WHERE team_id = team_id_val 
    AND node_id = COALESCE(NEW.node_id, OLD.node_id)
  ) INTO team_node_exists;

  -- Determine the highest status achieved by any team member for this node
  WITH team_member_progress AS (
    SELECT 
      snp.status,
      snp.user_id,
      snp.submitted_at,
      CASE 
        WHEN snp.status = 'passed' THEN 6
        WHEN snp.status = 'submitted' THEN 5
        WHEN snp.status = 'in_progress' THEN 4
        WHEN snp.status = 'failed' THEN 3
        WHEN snp.status = 'not_started' THEN 2
        ELSE 1
      END as status_priority
    FROM student_node_progress snp
    JOIN team_memberships tm ON tm.user_id = snp.user_id
    WHERE tm.team_id = team_id_val
      AND snp.node_id = COALESCE(NEW.node_id, OLD.node_id)
      AND tm.left_at IS NULL
  ),
  highest_progress AS (
    SELECT 
      status,
      user_id,
      submitted_at,
      ROW_NUMBER() OVER (
        ORDER BY status_priority DESC, submitted_at DESC NULLS LAST
      ) as rn
    FROM team_member_progress
  )
  SELECT status, user_id INTO highest_status_val, submitted_by_val
  FROM highest_progress 
  WHERE rn = 1;

  -- Default to not_started if no progress found
  IF highest_status_val IS NULL THEN
    highest_status_val := 'not_started';
    submitted_by_val := NULL;
  END IF;

  -- Insert or update team progress
  INSERT INTO team_node_progress (
    team_id, 
    node_id, 
    status, 
    submitted_by, 
    completed_at,
    created_at,
    updated_at
  )
  VALUES (
    team_id_val, 
    COALESCE(NEW.node_id, OLD.node_id), 
    highest_status_val,
    submitted_by_val,
    CASE WHEN highest_status_val IN ('passed', 'passed_late', 'passed_zero_grade', 'failed') THEN NOW() ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (team_id, node_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    submitted_by = EXCLUDED.submitted_by,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update team progress on individual progress changes
CREATE OR REPLACE TRIGGER trigger_update_team_progress
  AFTER INSERT OR UPDATE OR DELETE ON student_node_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_team_progress_from_individual();

-- Add RLS policies for new columns
CREATE POLICY "Team leaders can update assignments" ON team_node_progress
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND is_leader = true 
      AND left_at IS NULL
    )
  );

CREATE POLICY "Team members can update help requests" ON team_node_progress
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() 
      AND left_at IS NULL
    )
  );

CREATE POLICY "Instructors can update team progress" ON team_node_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classroom_teams ct
      JOIN classroom_memberships cm ON cm.classroom_id = ct.classroom_id
      WHERE ct.id = team_node_progress.team_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('instructor', 'ta')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE team_node_progress IS 'Tracks progress of teams through learning map nodes, aggregated from individual team member progress';
COMMENT ON COLUMN team_node_progress.submitted_by IS 'User ID of the team member who made the best/latest submission for this node';
COMMENT ON COLUMN team_node_progress.assigned_to IS 'User ID of the team member assigned to work on this node';
COMMENT ON COLUMN team_node_progress.help_requested IS 'Whether the team has requested help from instructors for this node';
COMMENT ON COLUMN team_node_progress.help_request_message IS 'Message describing what help the team needs';