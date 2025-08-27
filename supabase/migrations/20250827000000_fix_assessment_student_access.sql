-- Fix assessment access for students
-- The issue is conflicting RLS policies where the restrictive one blocks student access

-- Drop the restrictive policy that's causing issues
DROP POLICY IF EXISTS "members_can_view_assessments" ON public.node_assessments;

-- Keep only the permissive authenticated policy
-- This ensures all authenticated users can access assessments
-- (The authenticated_users_full_access_assessments policy already exists and works)

-- Verify the policy exists (it should from the previous migration)
-- CREATE POLICY "authenticated_users_full_access_assessments" ON public.node_assessments
-- FOR ALL TO authenticated 
-- USING (true) 
-- WITH CHECK (true);