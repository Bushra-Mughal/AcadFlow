-- Drop existing policies that cause circular dependency
DROP POLICY IF EXISTS "Users can view their own projects or projects they are members " ON projects;
DROP POLICY IF EXISTS "Project creators and members can update projects" ON projects;
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project creators can add members" ON project_members;
DROP POLICY IF EXISTS "Project creators can remove members" ON project_members;

-- Create helper functions with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION can_view_project(project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND (
      creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION is_project_creator(project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND creator_id = auth.uid()
  );
$$;

-- Recreate projects policies using helper functions
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project creators and members can update" ON projects
  FOR UPDATE
  TO authenticated
  USING (can_view_project(id))
  WITH CHECK (can_view_project(id));

-- Recreate project_members policies using helper functions
CREATE POLICY "Users can view project members" ON project_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_project_creator(project_id)
  );

CREATE POLICY "Creators can add members" ON project_members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_project_creator(project_id));

CREATE POLICY "Creators can remove members" ON project_members
  FOR DELETE
  TO authenticated
  USING (is_project_creator(project_id));


