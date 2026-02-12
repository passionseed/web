-- Revert test mode changes - make user_id required again
-- Delete any test data (rows with NULL user_id)
DELETE FROM direction_finder_jobs WHERE user_id IS NULL;

-- Make user_id NOT NULL again
ALTER TABLE direction_finder_jobs
  ALTER COLUMN user_id SET NOT NULL;

COMMENT ON COLUMN direction_finder_jobs.user_id IS 'User ID (required)';
