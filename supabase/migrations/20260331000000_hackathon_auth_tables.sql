-- Hackathon auth tables (participants use their own auth, not Supabase auth)

CREATE TABLE IF NOT EXISTS hackathon_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  university TEXT NOT NULL,
  role TEXT NOT NULL,
  team_name TEXT,
  track TEXT,
  grade_level TEXT,
  experience_level INTEGER,
  referral_source TEXT,
  bio TEXT,
  phone TEXT,
  line_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hackathon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hackathon_sessions_token ON hackathon_sessions(token);
CREATE INDEX IF NOT EXISTS idx_hackathon_sessions_participant ON hackathon_sessions(participant_id);

CREATE TABLE IF NOT EXISTS hackathon_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hackathon_password_resets_token ON hackathon_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_hackathon_password_resets_participant ON hackathon_password_resets(participant_id);
