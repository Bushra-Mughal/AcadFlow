-- Drop the existing complex SELECT policy
DROP POLICY IF EXISTS "Users can view their own files or project/assignment files" ON files;

-- Create a simpler, more permissive SELECT policy
-- Users can view:
-- 1. Their own files (user_id matches)
-- 2. Files in assignments they own
-- 3. Files in projects they created or are members of
CREATE POLICY "Users can view files" ON files
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.id = files.assignment_id 
      AND assignments.user_id = auth.uid()
    ))
    OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = files.project_id 
      AND (
        projects.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members 
          WHERE project_members.project_id = projects.id 
          AND project_members.user_id = auth.uid()
        )
      )
    ))
  );

-- Add UPDATE policy for file linking feature
CREATE POLICY "Users can update their own files" ON files
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


