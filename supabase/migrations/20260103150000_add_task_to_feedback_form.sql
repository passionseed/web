-- Add task_id to ps_feedback_forms
ALTER TABLE public.ps_feedback_forms
ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.ps_tasks(id) ON DELETE SET NULL;
