-- Create view for team members with profile information
CREATE OR REPLACE VIEW team_members_with_profiles AS
SELECT 
  tm.*,
  p.username,
  p.full_name,
  p.avatar_url
FROM team_memberships tm
JOIN profiles p ON tm.user_id = p.id;