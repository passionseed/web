-- Add audio_features column to song_of_the_day table
ALTER TABLE song_of_the_day
ADD COLUMN IF NOT EXISTS audio_features JSONB;
