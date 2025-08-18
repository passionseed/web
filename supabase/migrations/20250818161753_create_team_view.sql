-- Drop the existing view first (if it exists)
DROP VIEW IF EXISTS team_members_with_profiles;

-- Create the new view for team members with profile information
CREATE VIEW team_members_with_profiles AS
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.is_leader,
  tm.joined_at,
  tm.left_at,
  tm.member_metadata,
  p.username,
  p.full_name,
  p.avatar_url
FROM team_memberships tm
JOIN profiles p ON tm.user_id = p.id
WHERE tm.left_at IS NULL;

-- Ensure students_without_teams view exists (you can keep your existing one)
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