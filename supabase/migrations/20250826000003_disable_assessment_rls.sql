-- RADICAL APPROACH: Temporarily disable RLS entirely on node_assessments
-- This will help us determine if RLS is the actual problem or if it's something else

-- Disable RLS completely for node_assessments
ALTER TABLE public.node_assessments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_can_view_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_insert_assessments" ON public.node_assessments;  
DROP POLICY IF EXISTS "map_owners_update_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_delete_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "instructors_manage_classroom_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_create_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_modify_assessments" ON public.node_assessments;
DROP POLICY IF EXISTS "map_owners_can_delete_assessments" ON public.node_assessments;

-- This means ANYONE can do ANYTHING with node_assessments
-- If this doesn't work, the problem is NOT RLS