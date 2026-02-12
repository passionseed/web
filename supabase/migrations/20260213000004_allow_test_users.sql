-- Allow NULL user_id for test data (local development only)
ALTER TABLE direction_finder_jobs
  ALTER COLUMN user_id DROP NOT NULL;

-- Update the foreign key to allow NULL
ALTER TABLE direction_finder_jobs
  DROP CONSTRAINT direction_finder_jobs_user_id_fkey;

ALTER TABLE direction_finder_jobs
  ADD CONSTRAINT direction_finder_jobs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMENT ON COLUMN direction_finder_jobs.user_id IS 'User ID (nullable for test data in development)';
