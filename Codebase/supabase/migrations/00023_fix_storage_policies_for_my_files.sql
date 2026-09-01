-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Create new policies that work with my-files/{user_id}/ structure
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = 'my-files' AND
    (storage.foldername(name))[2] = (auth.uid())::text
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = 'my-files' AND
    (storage.foldername(name))[2] = (auth.uid())::text
  );

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = 'my-files' AND
    (storage.foldername(name))[2] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = 'my-files' AND
    (storage.foldername(name))[2] = (auth.uid())::text
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = 'my-files' AND
    (storage.foldername(name))[2] = (auth.uid())::text
  );


