-- Add research report dimensions to jobs table
-- Safe: all nullable, no existing data touched, idempotent

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS rank           integer,
  ADD COLUMN IF NOT EXISTS growth_rate    text,
  ADD COLUMN IF NOT EXISTS evolution_2035 text;
