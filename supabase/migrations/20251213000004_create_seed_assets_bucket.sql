-- Create storage bucket for seed assets (certificates, badges, etc.)

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('seed-assets', 'seed-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket

-- Allow admins to upload files
CREATE POLICY "Admins can upload seed assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'seed-assets'
    AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Allow admins to update files
CREATE POLICY "Admins can update seed assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'seed-assets'
    AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Allow admins to delete files
CREATE POLICY "Admins can delete seed assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'seed-assets'
    AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Allow public read access (for certificate images, badge images, etc.)
CREATE POLICY "Anyone can view seed assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'seed-assets');
