-- Rename scheduled_date to due_date in ps_tasks table
ALTER TABLE public.ps_tasks 
RENAME COLUMN scheduled_date TO due_date;
