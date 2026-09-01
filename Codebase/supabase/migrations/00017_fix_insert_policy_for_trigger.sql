-- Update the INSERT policy to allow NULL user_id (the trigger will set it)
DROP POLICY IF EXISTS "Users can upload files" ON files;

CREATE POLICY "Users can upload files" ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );


