-- =====================================================
-- PATHLAB VIDEOS STORAGE BUCKET
-- Storage bucket for PathLab activity videos
-- =====================================================

-- Create bucket for pathlab videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pathlab-videos',
  'pathlab-videos',
  true, -- Public for easy video playback
  52428800, -- 50MB limit (50 * 1024 * 1024 bytes) for free tier
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES FOR PATHLAB VIDEOS
-- =====================================================

-- Allow authenticated users to upload videos
DROP POLICY IF EXISTS "Authenticated users can upload pathlab videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload pathlab videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pathlab-videos');

-- Allow authenticated users to update their own videos
DROP POLICY IF EXISTS "Users can update their own pathlab videos" ON storage.objects;
CREATE POLICY "Users can update their own pathlab videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pathlab-videos' AND auth.uid() = owner);

-- Allow authenticated users to delete their own videos
DROP POLICY IF EXISTS "Users can delete their own pathlab videos" ON storage.objects;
CREATE POLICY "Users can delete their own pathlab videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pathlab-videos' AND auth.uid() = owner);

-- Allow public read access to all pathlab videos
DROP POLICY IF EXISTS "Public can view pathlab videos" ON storage.objects;
CREATE POLICY "Public can view pathlab videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pathlab-videos');
