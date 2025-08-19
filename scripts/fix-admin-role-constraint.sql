-- Fix for admin role constraint issue
-- Run this in Supabase SQL Editor to fix the check constraint

-- First, let's check the current constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'user_roles_role_check';

-- Drop the existing constraint
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add the new constraint with admin role included
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_role_check 
CHECK (role = ANY (ARRAY['student'::text, 'TA'::text, 'instructor'::text, 'admin'::text]));

-- Verify the constraint was updated
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'user_roles_role_check';

-- Now you can add the admin role
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('YOUR_USER_ID_HERE', 'admin');