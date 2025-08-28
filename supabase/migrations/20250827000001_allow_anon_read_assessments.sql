-- Allow anonymous users to read assessments
-- Students need to see assessments even if they're not logged in

-- Add a policy for anon users to read assessments
CREATE POLICY "anon_users_can_read_assessments" ON public.node_assessments
FOR SELECT TO anon
USING (true);

-- Keep the existing authenticated policy for full access