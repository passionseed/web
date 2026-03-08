CREATE TABLE hackathon_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hackathon_password_resets_token ON hackathon_password_resets(token);
CREATE INDEX idx_hackathon_password_resets_participant ON hackathon_password_resets(participant_id);
