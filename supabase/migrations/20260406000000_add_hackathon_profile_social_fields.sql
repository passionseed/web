-- Add social media fields and team emoji to hackathon participants
-- Add team avatar to hackathon teams

-- 1. Add fields to hackathon_participants
ALTER TABLE hackathon_participants
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS discord_username TEXT,
ADD COLUMN IF NOT EXISTS team_emoji TEXT,
ADD COLUMN IF NOT EXISTS emoji_roll_count INTEGER DEFAULT 0;

-- 2. Add team avatar to hackathon_teams
ALTER TABLE hackathon_teams
ADD COLUMN IF NOT EXISTS team_avatar_url TEXT;

-- 3. Create storage bucket for team avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('hackathon-team-avatars', 'hackathon-team-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS policy: Participants can update their own social fields and emoji
CREATE POLICY hackathon_participants_update_own_profile
ON hackathon_participants
FOR UPDATE
USING (
  id IN (
    SELECT participant_id 
    FROM hackathon_sessions 
    WHERE token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
  )
)
WITH CHECK (
  id IN (
    SELECT participant_id 
    FROM hackathon_sessions 
    WHERE token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
  )
);

-- 5. RLS policy: Team members can update team avatar
CREATE POLICY hackathon_teams_members_update_avatar
ON hackathon_teams
FOR UPDATE
USING (
  id IN (
    SELECT tm.team_id
    FROM hackathon_team_members tm
    JOIN hackathon_sessions hs ON hs.participant_id = tm.participant_id
    WHERE hs.token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
  )
)
WITH CHECK (
  id IN (
    SELECT tm.team_id
    FROM hackathon_team_members tm
    JOIN hackathon_sessions hs ON hs.participant_id = tm.participant_id
    WHERE hs.token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
  )
);

-- 6. Storage policies for team avatars
CREATE POLICY hackathon_team_avatars_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'hackathon-team-avatars');

CREATE POLICY hackathon_team_avatars_insert
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hackathon-team-avatars'
  AND (
    -- Extract team_id from path (format: {team_id}/avatar.jpg)
    EXISTS (
      SELECT 1
      FROM hackathon_team_members tm
      JOIN hackathon_sessions hs ON hs.participant_id = tm.participant_id
      WHERE hs.token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
      AND tm.team_id::text = split_part(name, '/', 1)
    )
  )
);

CREATE POLICY hackathon_team_avatars_update
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'hackathon-team-avatars'
  AND (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members tm
      JOIN hackathon_sessions hs ON hs.participant_id = tm.participant_id
      WHERE hs.token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
      AND tm.team_id::text = split_part(name, '/', 1)
    )
  )
)
WITH CHECK (
  bucket_id = 'hackathon-team-avatars'
  AND (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members tm
      JOIN hackathon_sessions hs ON hs.participant_id = tm.participant_id
      WHERE hs.token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
      AND tm.team_id::text = split_part(name, '/', 1)
    )
  )
);

CREATE POLICY hackathon_team_avatars_delete
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'hackathon-team-avatars'
  AND (
    EXISTS (
      SELECT 1
      FROM hackathon_team_members tm
      JOIN hackathon_sessions hs ON hs.participant_id = tm.participant_id
      WHERE hs.token = current_setting('request.jwt.claims', true)::json->>'hackathon_token'
      AND tm.team_id::text = split_part(name, '/', 1)
    )
  )
);

-- 7. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_hackathon_participants_team_emoji
ON hackathon_participants(team_emoji);

COMMENT ON COLUMN hackathon_participants.instagram_handle IS 'Instagram username/handle (without @)';
COMMENT ON COLUMN hackathon_participants.discord_username IS 'Discord username';
COMMENT ON COLUMN hackathon_participants.team_emoji IS 'Emoji character for team identity (animals/food/objects)';
COMMENT ON COLUMN hackathon_participants.emoji_roll_count IS 'Number of times participant has rolled for team emoji';
COMMENT ON COLUMN hackathon_teams.team_avatar_url IS 'URL to team avatar image in storage bucket';