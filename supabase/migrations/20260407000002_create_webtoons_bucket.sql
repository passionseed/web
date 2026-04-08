-- Create webtoons storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('webtoons', 'webtoons', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read access
DROP POLICY IF EXISTS "Public read access for webtoons" ON storage.objects;
CREATE POLICY "Public read access for webtoons" ON storage.objects
  FOR SELECT USING (bucket_id = 'webtoons');

-- Grant service role write access
DROP POLICY IF EXISTS "Service role can upload webtoons" ON storage.objects;
CREATE POLICY "Service role can upload webtoons" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'webtoons' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update webtoons" ON storage.objects;
CREATE POLICY "Service role can update webtoons" ON storage.objects
  FOR UPDATE USING (bucket_id = 'webtoons' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can delete webtoons" ON storage.objects;
CREATE POLICY "Service role can delete webtoons" ON storage.objects
  FOR DELETE USING (bucket_id = 'webtoons' AND auth.role() = 'service_role');