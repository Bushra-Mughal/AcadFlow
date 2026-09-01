-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own files or project files" ON files;

-- Create a new policy that includes assignment files
CREATE POLICY "Users can view their own files or project/assignment files" ON files
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = files.assignment_id
      AND assignments.user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = files.project_id
      AND (projects.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    ))
  );


