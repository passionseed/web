-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Members can view project requests" ON ps_requests;

-- Create a new policy allowing all authenticated users to view requests
CREATE POLICY "Authenticated users can view all requests"
  ON ps_requests FOR SELECT
  USING (auth.role() = 'authenticated');
