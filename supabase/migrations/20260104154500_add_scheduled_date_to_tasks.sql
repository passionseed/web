-- Add scheduled_date column to ps_tasks table
ALTER TABLE ps_tasks ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_ps_tasks_scheduled_date ON ps_tasks(scheduled_date);
