-- Fix type mismatch in team progress trigger function
-- The issue is that highest_status was declared as TEXT but being used to store INTEGER

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS trigger_update_team_progress ON student_node_progress;
DROP FUNCTION IF EXISTS update_team_progress_from_individual();

-- Create corrected function with proper type handling
CREATE OR REPLACE FUNCTION update_team_progress_from_individual()
RETURNS TRIGGER AS $$
DECLARE
  team_id_val UUID;
  highest_status_num INTEGER;
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

-- Recreate trigger
CREATE OR REPLACE TRIGGER trigger_update_team_progress
  AFTER INSERT OR UPDATE OR DELETE ON student_node_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_team_progress_from_individual();

-- Add comment for documentation
COMMENT ON FUNCTION update_team_progress_from_individual() IS 'Automatically updates team progress when individual team member progress changes, handling type conversions properly';