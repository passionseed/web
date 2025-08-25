-- Create team_node_progress table
CREATE TABLE IF NOT EXISTS public.team_node_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES classroom_teams(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'submitted', 'passed', 'failed')
  ),
  best_submission_id UUID NULL REFERENCES assessment_submissions(id),
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, node_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_node_progress_team ON team_node_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_team_node_progress_node ON team_node_progress(node_id);
CREATE INDEX IF NOT EXISTS idx_team_node_progress_status ON team_node_progress(status);
CREATE INDEX IF NOT EXISTS idx_team_node_progress_team_node ON team_node_progress(team_id, node_id);

-- Function to update team progress when individual progress changes
CREATE OR REPLACE FUNCTION update_team_progress_from_individual()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val UUID;
  team_member_count INTEGER;
  highest_status TEXT;
  best_submission_id_val UUID;
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

  IF team_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get the highest status achieved by any team member for this node
  SELECT 
    MAX(
      CASE 
        WHEN snp.status = 'passed' THEN 5
        WHEN snp.status = 'submitted' THEN 4
        WHEN snp.status = 'in_progress' THEN 3
        WHEN snp.status = 'failed' THEN 2
        ELSE 1
      END
    )
  INTO highest_status
  FROM student_node_progress snp
  JOIN team_memberships tm ON tm.user_id = snp.user_id
  WHERE tm.team_id = team_id_val
    AND snp.node_id = COALESCE(NEW.node_id, OLD.node_id)
    AND tm.left_at IS NULL;

  -- Convert numeric value back to status
  highest_status := CASE
    WHEN highest_status = 5 THEN 'passed'
    WHEN highest_status = 4 THEN 'submitted'
    WHEN highest_status = 3 THEN 'in_progress'
    WHEN highest_status = 2 THEN 'failed'
    ELSE 'not_started'
  END;

  -- Get the best submission (most recent passed or submitted)
  SELECT asub.id INTO best_submission_id_val
  FROM assessment_submissions asub
  JOIN student_node_progress snp ON snp.id = asub.progress_id
  JOIN team_memberships tm ON tm.user_id = snp.user_id
  WHERE tm.team_id = team_id_val
    AND snp.node_id = COALESCE(NEW.node_id, OLD.node_id)
    AND tm.left_at IS NULL
    AND asub.grade_status IN ('passed', 'submitted')
  ORDER BY 
    CASE WHEN asub.grade_status = 'passed' THEN 1 ELSE 2 END,
    asub.submitted_at DESC
  LIMIT 1;

  -- Insert or update team progress
  INSERT INTO team_node_progress (team_id, node_id, status, best_submission_id, completed_at)
  VALUES (
    team_id_val, 
    COALESCE(NEW.node_id, OLD.node_id), 
    highest_status,
    best_submission_id_val,
    CASE WHEN highest_status IN ('passed', 'failed') THEN NOW() ELSE NULL END
  )
  ON CONFLICT (team_id, node_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    best_submission_id = EXCLUDED.best_submission_id,
    completed_at = EXCLUDED.completed_at,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update team progress on individual progress changes
CREATE OR REPLACE TRIGGER trigger_update_team_progress
  AFTER INSERT OR UPDATE OR DELETE ON student_node_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_team_progress_from_individual();

-- Function to handle team membership changes (recalculate progress when members join/leave)
CREATE OR REPLACE FUNCTION recalc_team_progress_on_membership_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate team progress for all nodes when team membership changes
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.left_at IS NULL THEN
    PERFORM update_team_progress_from_individual();
  ELSIF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.left_at IS NULL AND NEW.left_at IS NOT NULL)) THEN
    PERFORM update_team_progress_from_individual();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate team progress when team memberships change
CREATE OR REPLACE TRIGGER trigger_recalc_team_progress_on_membership
  AFTER INSERT OR UPDATE OR DELETE ON team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION recalc_team_progress_on_membership_change();

-- Enable RLS
ALTER TABLE team_node_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view their team's progress" ON team_node_progress
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Instructors can view all team progress" ON team_node_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_teams ct
      JOIN classroom_memberships cm ON cm.classroom_id = ct.classroom_id
      WHERE ct.id = team_node_progress.team_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('instructor', 'ta')
    )
  );