-- Add default value for user_id to automatically set it to the authenticated user
ALTER TABLE files 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Also recreate the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Users can upload files" ON files;

CREATE POLICY "Users can upload files" ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );


