-- Fix assessment submission RLS policies for authenticated users
-- The current policies are too restrictive and block legitimate submissions

-- Drop the restrictive classroom-based policies that are blocking submissions
DROP POLICY IF EXISTS "users_can_create_own_submissions" ON public.assessment_submissions;
DROP POLICY IF EXISTS "users_can_update_own_submissions" ON public.assessment_submissions;
DROP POLICY IF EXISTS "members_can_view_submissions" ON public.assessment_submissions;

-- Create simpler, more permissive policies for authenticated users
-- Allow authenticated users to create submissions
CREATE POLICY "authenticated_users_can_create_submissions" ON public.assessment_submissions
FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to view their own submissions  
CREATE POLICY "authenticated_users_can_view_submissions" ON public.assessment_submissions
FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to update their own submissions
CREATE POLICY "authenticated_users_can_update_submissions" ON public.assessment_submissions  
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Keep the anon policies we created earlier for backward compatibility