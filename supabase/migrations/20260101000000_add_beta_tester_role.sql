-- Migration: support beta-tester role
-- Description: Updates the user_roles check constraint to allow 'beta-tester' role

-- Update the user_roles table to include beta-tester role
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new check constraint with admin role AND beta-tester
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text, 'admin'::text, 'beta-tester'::text]));

-- Re-apply any missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
ON public.user_roles USING btree (user_id, role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role_grading 
ON public.user_roles USING btree (user_id, role)
WHERE (role = ANY (ARRAY['instructor'::text, 'admin'::text, 'TA'::text, 'beta-tester'::text]));
