-- Create user_role enum
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create helper function to check roles
CREATE OR REPLACE FUNCTION has_role(uid uuid, role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = uid AND p.role = role_name::user_role
  );
$$;

-- Profiles policies
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- Create public view for shareable profile info
CREATE VIEW public_profiles AS
  SELECT id, username, role, created_at FROM profiles;

-- Create trigger function to sync new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    'user'::public.user_role
  );
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update existing RLS policies to use authenticated users
DROP POLICY IF EXISTS "Public can view all assignments" ON assignments;
DROP POLICY IF EXISTS "Public can create assignments" ON assignments;
DROP POLICY IF EXISTS "Public can update assignments" ON assignments;
DROP POLICY IF EXISTS "Public can delete assignments" ON assignments;

CREATE POLICY "Users can view their own assignments" ON assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own assignments" ON assignments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own assignments" ON assignments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own assignments" ON assignments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Update projects policies
DROP POLICY IF EXISTS "Public can view all projects" ON projects;
DROP POLICY IF EXISTS "Public can create projects" ON projects;
DROP POLICY IF EXISTS "Public can update projects" ON projects;
DROP POLICY IF EXISTS "Public can delete projects" ON projects;

CREATE POLICY "Users can view their own projects or projects they are members of" ON projects
  FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Project creators and members can update projects" ON projects
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Only project creators can delete projects" ON projects
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Update project_members policies
DROP POLICY IF EXISTS "Public can view all project members" ON project_members;
DROP POLICY IF EXISTS "Public can add project members" ON project_members;
DROP POLICY IF EXISTS "Public can remove project members" ON project_members;

CREATE POLICY "Users can view members of their projects" ON project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND (projects.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members pm2
        WHERE pm2.project_id = projects.id
        AND pm2.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project creators can add members" ON project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.creator_id = auth.uid()
    )
  );

CREATE POLICY "Project creators can remove members" ON project_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.creator_id = auth.uid()
    )
  );

-- Update files policies
DROP POLICY IF EXISTS "Public can view all files" ON files;
DROP POLICY IF EXISTS "Public can upload files" ON files;
DROP POLICY IF EXISTS "Public can delete files" ON files;

CREATE POLICY "Users can view their own files or project files" ON files
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
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

CREATE POLICY "Users can upload files" ON files
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Update activities policies
DROP POLICY IF EXISTS "Public can view all activities" ON activities;
DROP POLICY IF EXISTS "Public can create activities" ON activities;

CREATE POLICY "Users can view activities for their items or shared projects" ON activities
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.id = activities.assignment_id
      AND assignments.user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = activities.project_id
      AND (projects.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      ))
    ))
  );

CREATE POLICY "Users can create activities" ON activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update chat_messages policies
DROP POLICY IF EXISTS "Public can view all chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Public can create chat messages" ON chat_messages;

CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create chat messages" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


