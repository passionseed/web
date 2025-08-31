-- Migration: Add classroom settings
-- Created: 2025-08-31
-- Description: Adds settings columns to classrooms table for customizable features

-- Add settings columns to classrooms table
ALTER TABLE public.classrooms 
ADD COLUMN IF NOT EXISTS enable_assignments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Update the constraint to allow for longer names if needed
ALTER TABLE public.classrooms 
DROP CONSTRAINT IF EXISTS classrooms_name_length;

ALTER TABLE public.classrooms 
ADD CONSTRAINT classrooms_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 500);

-- Add comment for the new columns
COMMENT ON COLUMN public.classrooms.enable_assignments IS 'Toggle to enable/disable assignment features for this classroom';
COMMENT ON COLUMN public.classrooms.settings IS 'JSON object for storing additional classroom settings';

-- Add index for faster queries on enabled assignments
CREATE INDEX IF NOT EXISTS idx_classrooms_enable_assignments ON public.classrooms(enable_assignments) WHERE enable_assignments = true;