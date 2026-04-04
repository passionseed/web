ALTER TABLE hackathon_team_invites ADD COLUMN IF NOT EXISTS used_by UUID REFERENCES hackathon_participants(id);
