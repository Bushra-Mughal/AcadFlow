-- Simplify the INSERT policy - just check user_id matches
DROP POLICY IF EXISTS "Users can upload files" ON files;

CREATE POLICY "Users can upload files" ON files
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also make user_id NOT NULL again since we're explicitly setting it
ALTER TABLE files 
ALTER COLUMN user_id SET NOT NULL;


