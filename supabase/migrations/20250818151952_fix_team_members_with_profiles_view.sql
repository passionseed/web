-- Create view for team members with profile information and classroom context
CREATE OR REPLACE VIEW team_members_with_profiles AS
SELECT 
  tm.*,
  p.username,
  p.full_name,
  p.avatar_url,
  ct.classroom_id
FROM team_memberships tm
JOIN profiles p ON tm.user_id = p.id
JOIN classroom_teams ct ON tm.team_id = ct.id
WHERE ct.is_active = TRUE;