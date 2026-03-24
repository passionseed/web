-- Add onboarding fields to hackathon_pre_questionnaires
-- Adds loves, good_at, school_level columns and makes ideal_success_scenario and ikigai_items nullable

-- Add new columns for onboarding
ALTER TABLE hackathon_pre_questionnaires
ADD COLUMN IF NOT EXISTS loves JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS good_at JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('university', 'high_school'));

-- Make ideal_success_scenario nullable (being removed from form)
ALTER TABLE hackathon_pre_questionnaires
ALTER COLUMN ideal_success_scenario DROP NOT NULL;

-- Make ikigai_items nullable (being replaced by loves + good_at)
ALTER TABLE hackathon_pre_questionnaires
ALTER COLUMN ikigai_items DROP NOT NULL;
