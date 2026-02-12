-- Improve Direction Finder write/read behavior under concurrent usage.
ALTER TABLE direction_finder_results
ADD COLUMN IF NOT EXISTS generation_session_id TEXT;

-- Prevent duplicate insertions for the same generation session per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_direction_finder_user_generation_session
ON direction_finder_results(user_id, generation_session_id)
WHERE generation_session_id IS NOT NULL;

-- Speed up "latest result by user" queries.
CREATE INDEX IF NOT EXISTS idx_direction_finder_user_created_at
ON direction_finder_results(user_id, created_at DESC);

COMMENT ON COLUMN direction_finder_results.generation_session_id
IS 'Client-generated id used to make finish-save idempotent for retries/double-submit.';
