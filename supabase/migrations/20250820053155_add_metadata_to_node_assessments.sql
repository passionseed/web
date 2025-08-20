-- Add metadata column to node_assessments table to store checklist items and other assessment metadata
ALTER TABLE public.node_assessments
ADD COLUMN IF NOT EXISTS metadata jsonb NULL;
