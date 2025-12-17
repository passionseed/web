-- Add is_seen column to user_badges table
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS is_seen BOOLEAN DEFAULT FALSE;
