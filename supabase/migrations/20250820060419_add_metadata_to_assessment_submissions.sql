-- Add metadata column to assessment_submissions table to store checklist completion data and other submission metadata
ALTER TABLE public.assessment_submissions
ADD COLUMN IF NOT EXISTS metadata jsonb NULL;