-- Create team matching waitlist table
CREATE TABLE hackathon_team_matching_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  matched_team_id UUID REFERENCES hackathon_teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_team_matching_waitlist_participant ON hackathon_team_matching_waitlist(participant_id);
CREATE INDEX idx_team_matching_waitlist_status ON hackathon_team_matching_waitlist(status);

-- Ensure a participant can only have one active waitlist entry
CREATE UNIQUE INDEX idx_team_matching_waitlist_active_participant
ON hackathon_team_matching_waitlist(participant_id)
WHERE status = 'waiting';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_matching_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_team_matching_waitlist_updated_at
  BEFORE UPDATE ON hackathon_team_matching_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_team_matching_waitlist_updated_at();
