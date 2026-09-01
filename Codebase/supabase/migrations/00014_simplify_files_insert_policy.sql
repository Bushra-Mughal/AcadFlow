-- Simplify the INSERT policy - just check that user_id matches auth.uid()
DROP POLICY IF EXISTS "Users can upload files" ON files;

CREATE POLICY "Users can upload files" ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


