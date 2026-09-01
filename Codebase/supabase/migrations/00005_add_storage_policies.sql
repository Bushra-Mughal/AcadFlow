-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Public can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete files" ON storage.objects;

-- Create public storage policies for user-files bucket
CREATE POLICY "Public can upload files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'user-files');

CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'user-files');

CREATE POLICY "Public can delete files"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'user-files');

CREATE POLICY "Public can update files"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'user-files')
WITH CHECK (bucket_id = 'user-files');


