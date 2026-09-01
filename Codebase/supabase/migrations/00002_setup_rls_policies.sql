-- Enable RLS on all tables
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is project creator
CREATE OR REPLACE FUNCTION is_project_creator(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_uuid AND creator_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assignments policies
CREATE POLICY "Users can view their own assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own assignments"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own assignments"
  ON assignments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Projects policies
CREATE POLICY "Users can view projects they created or are members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    creator_id = auth.uid() OR 
    is_project_member(id, auth.uid())
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Project creators and members can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() OR 
    is_project_member(id, auth.uid())
  );

CREATE POLICY "Only project creators can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Project members policies
CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    is_project_creator(project_id, auth.uid()) OR
    is_project_member(project_id, auth.uid())
  );

CREATE POLICY "Project creators can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (is_project_creator(project_id, auth.uid()));

CREATE POLICY "Project creators can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (is_project_creator(project_id, auth.uid()));

-- Files policies
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upload files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Activities policies
CREATE POLICY "Users can view activities for their assignments"
  ON activities FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM assignments WHERE id = activities.assignment_id AND user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND (
      is_project_creator(project_id, auth.uid()) OR
      is_project_member(project_id, auth.uid())
    ))
  );

CREATE POLICY "Users can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Users can view their own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

