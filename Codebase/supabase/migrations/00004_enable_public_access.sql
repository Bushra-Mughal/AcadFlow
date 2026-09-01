-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can create their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can update their own assignments" ON assignments;
DROP POLICY IF EXISTS "Users can delete their own assignments" ON assignments;

DROP POLICY IF EXISTS "Users can view projects they created or are members of" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project creators and members can update projects" ON projects;
DROP POLICY IF EXISTS "Only project creators can delete projects" ON projects;

DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project creators can add members" ON project_members;
DROP POLICY IF EXISTS "Project creators can remove members" ON project_members;

DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can upload files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

DROP POLICY IF EXISTS "Users can view activities for their assignments" ON activities;
DROP POLICY IF EXISTS "Users can create activities" ON activities;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON chat_messages;

-- Create new public access policies for assignments
CREATE POLICY "Public can view all assignments" ON assignments
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can create assignments" ON assignments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update assignments" ON assignments
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete assignments" ON assignments
  FOR DELETE TO anon, authenticated
  USING (true);

-- Create new public access policies for projects
CREATE POLICY "Public can view all projects" ON projects
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can create projects" ON projects
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can update projects" ON projects
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete projects" ON projects
  FOR DELETE TO anon, authenticated
  USING (true);

-- Create new public access policies for project_members
CREATE POLICY "Public can view all project members" ON project_members
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can add project members" ON project_members
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can remove project members" ON project_members
  FOR DELETE TO anon, authenticated
  USING (true);

-- Create new public access policies for files
CREATE POLICY "Public can view all files" ON files
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can upload files" ON files
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can delete files" ON files
  FOR DELETE TO anon, authenticated
  USING (true);

-- Create new public access policies for activities
CREATE POLICY "Public can view all activities" ON activities
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can create activities" ON activities
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Create new public access policies for chat_messages
CREATE POLICY "Public can view all chat messages" ON chat_messages
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Public can create chat messages" ON chat_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Update storage bucket policy for public access
UPDATE storage.buckets
SET public = true
WHERE name = 'user-files';


