ALTER TABLE hackathon_participants
ADD COLUMN track TEXT,
ADD COLUMN grade_level TEXT,
ADD COLUMN experience_level INTEGER DEFAULT 1,
ADD COLUMN referral_source TEXT,
ADD COLUMN bio TEXT;
