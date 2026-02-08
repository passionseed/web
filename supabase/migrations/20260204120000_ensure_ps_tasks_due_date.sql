-- Ensure ps_tasks.due_date exists (backfill from scheduled_date if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ps_tasks'
      AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.ps_tasks ADD COLUMN due_date DATE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ps_tasks'
      AND column_name = 'scheduled_date'
  ) THEN
    UPDATE public.ps_tasks
      SET due_date = scheduled_date
      WHERE due_date IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ps_tasks_due_date ON public.ps_tasks(due_date);
