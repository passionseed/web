-- Allow request creators to update their own requests (needed for cancellation)
CREATE POLICY "Creators can update their own requests"
  ON ps_requests FOR UPDATE
  USING (
    created_by = auth.uid()
  );
