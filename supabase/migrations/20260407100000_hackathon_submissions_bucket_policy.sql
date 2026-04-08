-- Create the hackathon_submissions bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hackathon_submissions', 'hackathon_submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "hackathon_submissions_insert" ON storage.objects;
DROP POLICY IF EXISTS "hackathon_submissions_select" ON storage.objects;
DROP POLICY IF EXISTS "hackathon_submissions_update" ON storage.objects;
DROP POLICY IF EXISTS "hackathon_submissions_delete" ON storage.objects;

-- Allow anyone (including anon) to upload to hackathon_submissions
-- Hackathon participants use custom token auth, not Supabase Auth
CREATE POLICY "hackathon_submissions_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'hackathon_submissions');

-- Allow anyone to read (bucket is public anyway)
CREATE POLICY "hackathon_submissions_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'hackathon_submissions');

-- Allow updates and deletes as well
CREATE POLICY "hackathon_submissions_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'hackathon_submissions');

CREATE POLICY "hackathon_submissions_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'hackathon_submissions');
