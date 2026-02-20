CREATE TABLE hackathon_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lobby_code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hackathon_team_members (
  team_id UUID NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, participant_id)
);

CREATE INDEX idx_hackathon_team_members_participant ON hackathon_team_members(participant_id);
