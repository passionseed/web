-- Fix classroom_maps access for grading interface
-- Users need to be able to see classroom maps to grade submissions

-- Allow authenticated users to view classroom maps
CREATE POLICY "authenticated_users_can_view_classroom_maps" ON public.classroom_maps
FOR SELECT TO authenticated USING (true);

-- Also allow anon users to view classroom maps for public access
CREATE POLICY "anon_users_can_view_classroom_maps" ON public.classroom_maps  
FOR SELECT TO anon USING (true);