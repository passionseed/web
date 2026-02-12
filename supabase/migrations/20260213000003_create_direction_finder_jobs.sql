-- Direction Finder Jobs Table
-- Purpose: Track async background processing for AI-generated direction profiles
-- Each job has 3 steps: core, programs, commitments

CREATE TABLE IF NOT EXISTS direction_finder_jobs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Overall status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Input data (assessment answers + conversation history)
  input_data JSONB NOT NULL,

  -- Step tracking (each step is independent and resumable)
  step_core TEXT NOT NULL DEFAULT 'pending' CHECK (step_core IN ('pending', 'processing', 'completed', 'failed')),
  step_programs TEXT NOT NULL DEFAULT 'pending' CHECK (step_programs IN ('pending', 'processing', 'completed', 'failed')),
  step_commitments TEXT NOT NULL DEFAULT 'pending' CHECK (step_commitments IN ('pending', 'processing', 'completed', 'failed')),

  -- Results per step (stored separately for partial results)
  result_core JSONB, -- { profile, vectors }
  result_programs JSONB, -- { programs }
  result_commitments JSONB, -- { commitments }

  -- Error tracking
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Worker coordination (prevents double-processing)
  processing_started_at TIMESTAMPTZ,
  processed_by TEXT, -- worker instance identifier

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Language preference
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'th'))
);

-- Indexes for efficient queries
CREATE INDEX idx_direction_jobs_status ON direction_finder_jobs(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_direction_jobs_user ON direction_finder_jobs(user_id);
CREATE INDEX idx_direction_jobs_created ON direction_finder_jobs(created_at DESC);
CREATE INDEX idx_direction_jobs_stale ON direction_finder_jobs(processing_started_at) WHERE status = 'processing';

-- RLS Policies
ALTER TABLE direction_finder_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs"
  ON direction_finder_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create own jobs"
  ON direction_finder_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update jobs (worker process)
CREATE POLICY "Service role can update jobs"
  ON direction_finder_jobs
  FOR UPDATE
  USING (true);

-- Function to automatically update overall status based on step statuses
CREATE OR REPLACE FUNCTION update_direction_job_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If any step failed, mark job as failed
  IF NEW.step_core = 'failed' OR NEW.step_programs = 'failed' OR NEW.step_commitments = 'failed' THEN
    NEW.status := 'failed';
    NEW.completed_at := NOW();

  -- If all steps completed, mark job as completed
  ELSIF NEW.step_core = 'completed' AND NEW.step_programs = 'completed' AND NEW.step_commitments = 'completed' THEN
    NEW.status := 'completed';
    NEW.completed_at := NOW();

  -- If any step is processing, mark job as processing
  ELSIF NEW.step_core = 'processing' OR NEW.step_programs = 'processing' OR NEW.step_commitments = 'processing' THEN
    NEW.status := 'processing';

  -- Otherwise, job is pending
  ELSE
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status
CREATE TRIGGER trigger_update_direction_job_status
  BEFORE UPDATE ON direction_finder_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_direction_job_status();

-- Function to clean up old completed jobs (>30 days)
CREATE OR REPLACE FUNCTION cleanup_old_direction_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM direction_finder_jobs
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset stuck jobs (processing for >10 minutes)
CREATE OR REPLACE FUNCTION reset_stuck_direction_jobs()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE direction_finder_jobs
  SET
    status = 'pending',
    step_core = CASE WHEN step_core = 'processing' THEN 'pending' ELSE step_core END,
    step_programs = CASE WHEN step_programs = 'processing' THEN 'pending' ELSE step_programs END,
    step_commitments = CASE WHEN step_commitments = 'processing' THEN 'pending' ELSE step_commitments END,
    processing_started_at = NULL,
    processed_by = NULL,
    retry_count = retry_count + 1
  WHERE status = 'processing'
    AND processing_started_at < NOW() - INTERVAL '10 minutes'
    AND retry_count < max_retries;

  GET DIAGNOSTICS reset_count = ROW_COUNT;
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE direction_finder_jobs IS 'Background job queue for direction profile generation. Each job has 3 steps to stay under Vercel 60s timeout.';

-- Function to atomically grab the next job to process
-- Uses SELECT FOR UPDATE SKIP LOCKED to prevent race conditions
CREATE OR REPLACE FUNCTION get_next_direction_job()
RETURNS SETOF direction_finder_jobs AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM direction_finder_jobs
  WHERE status IN ('pending', 'processing')
    AND (
      step_core = 'pending' OR
      (step_core = 'completed' AND step_programs = 'pending') OR
      (step_programs = 'completed' AND step_commitments = 'pending')
    )
    AND retry_count < max_retries
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;
