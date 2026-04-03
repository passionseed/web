-- mentor-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-photos', 'mentor-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
DROP POLICY IF EXISTS "Mentor photos are public" ON storage.objects;
CREATE POLICY "Mentor photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'mentor-photos');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Mentors can upload own photo" ON storage.objects;
CREATE POLICY "Mentors can upload own photo" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mentor-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update/replace
DROP POLICY IF EXISTS "Mentors can update own photo" ON storage.objects;
CREATE POLICY "Mentors can update own photo" ON storage.objects
  FOR UPDATE USING (bucket_id = 'mentor-photos' AND auth.role() = 'authenticated');
