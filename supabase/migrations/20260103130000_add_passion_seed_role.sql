-- Migration: support passion-seed-team role
-- Description: Updates the user_roles check constraint to allow 'passion-seed-team' role

-- Update the user_roles table to include passion-seed-team role
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new check constraint with all roles including passion-seed-team
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text, 'admin'::text, 'beta-tester'::text, 'passion-seed-team'::text]));

-- Re-apply any missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles USING btree (user_id, role);

-- Drop old partial index to update it with new role
DROP INDEX IF EXISTS idx_user_roles_user_id_role_grading;

-- Recreate partial index with new role included
CREATE INDEX idx_user_roles_user_id_role_grading 
ON public.user_roles USING btree (user_id, role)
WHERE (role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text, 'beta-tester'::text, 'passion-seed-team'::text]));
