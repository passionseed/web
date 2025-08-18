-- Create a view to efficiently query students without teams
-- This solves the Supabase relationship issue when joining classroom_memberships with profiles

CREATE OR REPLACE VIEW students_without_teams AS
SELECT 
  cm.classroom_id,
  cm.user_id,
  p.username,
  p.full_name,
  p.avatar_url
FROM classroom_memberships cm
JOIN profiles p ON cm.user_id = p.id
WHERE cm.role = 'student'
AND NOT EXISTS (
  SELECT 1
  FROM team_memberships tm
  JOIN classroom_teams ct ON tm.team_id = ct.id
  WHERE tm.user_id = cm.user_id
  AND ct.classroom_id = cm.classroom_id
  AND ct.is_active = TRUE
  AND tm.left_at IS NULL
);

-- Add helpful comment
COMMENT ON VIEW students_without_teams IS 'Pre-joined view of students who are not currently in any active team within their classroom';
