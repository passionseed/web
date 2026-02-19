CREATE TABLE hackathon_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  university TEXT NOT NULL,
  role TEXT NOT NULL,
  team_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hackathon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hackathon_sessions_token ON hackathon_sessions(token);
CREATE INDEX idx_hackathon_sessions_participant ON hackathon_sessions(participant_id);
