-- hackathon_pre_questionnaires
-- Stores the pre-questionnaire responses for hackathon participants.
-- Linked to hackathon_participants (custom auth, not Supabase Auth).
-- problem_preferences stores an array of problem IDs (e.g. ['P1', 'P4', 'P7'])
-- used for team interest matching shown on the team dashboard.

CREATE TABLE IF NOT EXISTS hackathon_pre_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dream_faculty TEXT NOT NULL,
  confidence_level INTEGER NOT NULL CHECK (confidence_level BETWEEN 1 AND 5),
  family_support_level INTEGER NOT NULL CHECK (family_support_level BETWEEN 1 AND 5),
  ideal_success_scenario TEXT NOT NULL,
  why_hackathon TEXT NOT NULL,
  team_role_preference TEXT NOT NULL,
  ai_proficiency TEXT NOT NULL,
  ikigai_items JSONB NOT NULL DEFAULT '[]',
  problem_preferences TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathon_pre_q_participant
  ON hackathon_pre_questionnaires(participant_id);
