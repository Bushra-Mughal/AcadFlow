-- AcadFlow Complete Database Setup Script
-- Copy-paste this entire script into Supabase SQL Editor and run it
-- This creates all tables, RLS policies, functions, and badge data

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================
-- 2. CREATE ENUM TYPES
-- ============================================
CREATE TYPE public.user_role AS ENUM ('user', 'admin');
CREATE TYPE public.user_action AS ENUM ('viewed', 'opened', 'edited', 'created', 'deleted', 'status_changed');

-- ============================================
-- 3. CREATE PROFILES TABLE & AUTH TRIGGER
-- ============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  gmail text,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user'::public.user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. USER_STATS TABLE
-- ============================================
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 1,
  on_time_submissions integer NOT NULL DEFAULT 0,
  total_submissions integer NOT NULL DEFAULT 0,
  file_edits integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_submission_date date,
  projects_completed integer NOT NULL DEFAULT 0,
  assignments_completed integer NOT NULL DEFAULT 0,
  team_members_invited integer NOT NULL DEFAULT 0,
  files_uploaded integer NOT NULL DEFAULT 0,
  ai_sessions integer NOT NULL DEFAULT 0,
  on_time_projects integer NOT NULL DEFAULT 0,
  last_rank_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- 5. BADGES & USER_BADGES
-- ============================================
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- 6. ASSIGNMENTS
-- ============================================
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  course text,
  due_date timestamptz,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  weightage integer CHECK (weightage >= 0 AND weightage <= 100),
  status text CHECK (status IN ('queue', 'in_progress', 'review', 'completed')) DEFAULT 'queue',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 7. PROJECTS
-- ============================================
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  course text,
  due_date timestamptz,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status text CHECK (status IN ('queue', 'in_progress', 'review', 'completed')) DEFAULT 'queue',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 8. PROJECT_MEMBERS
-- ============================================
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ============================================
-- 9. FILE_FOLDERS
-- ============================================
CREATE TABLE public.file_folders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.file_folders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 10. FILES
-- ============================================
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES public.file_folders(id) ON DELETE SET NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- ============================================
-- 11. ACTIVITIES
-- ============================================
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  action_type public.user_action NOT NULL,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 12. CHAT_MESSAGES
-- ============================================
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 13. ANALYSIS_HISTORY
-- ============================================
CREATE TABLE public.analysis_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_preview text NOT NULL,
  overall_score integer NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 14. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 15. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = uid; $$;

CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_creator(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND creator_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(p_username)
  ) INTO v_exists;
  RETURN NOT v_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE lower(email) = lower(p_email) OR lower(gmail) = lower(p_email)
  LIMIT 1;
  RETURN v_user_id;
END;
$$;

-- ============================================
-- 16. RLS POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Admins full access on profiles" ON public.profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- USER_STATS
CREATE POLICY "Users own their stats" ON public.user_stats
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- BADGES
CREATE POLICY "Anyone can view badges" ON public.badges
  FOR SELECT USING (true);

-- USER_BADGES
CREATE POLICY "Users view own badges" ON public.user_badges
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ASSIGNMENTS
CREATE POLICY "Users own their assignments" ON public.assignments
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- PROJECTS
CREATE POLICY "Creators and members can view projects" ON public.projects
  FOR SELECT TO authenticated USING (
    creator_id = auth.uid() OR is_project_member(id, auth.uid())
  );
CREATE POLICY "Creators and members can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (
    creator_id = auth.uid() OR is_project_member(id, auth.uid())
  );
CREATE POLICY "Only creators can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- PROJECT_MEMBERS
CREATE POLICY "Creators can manage members" ON public.project_members
  FOR ALL TO authenticated USING (
    is_project_creator(project_id, auth.uid())
  )
  WITH CHECK (
    is_project_creator(project_id, auth.uid())
  );
CREATE POLICY "Members can view membership" ON public.project_members
  FOR SELECT TO authenticated USING (
    is_project_member(project_id, auth.uid()) OR is_project_creator(project_id, auth.uid())
  );

-- FILES
CREATE POLICY "Users own their files" ON public.files
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- FILE_FOLDERS
CREATE POLICY "Users own their folders" ON public.file_folders
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ACTIVITIES
CREATE POLICY "Users view own activities" ON public.activities
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert activities" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CHAT_MESSAGES
CREATE POLICY "Users own their chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ANALYSIS_HISTORY
CREATE POLICY "Users own their analysis history" ON public.analysis_history
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 17. AUTO-UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 18. RPC FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.award_points(p_user_id uuid, p_points integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_points integer;
  v_new_rank integer;
BEGIN
  UPDATE public.user_stats
  SET points = points + p_points
  WHERE user_id = p_user_id
  RETURNING points INTO v_new_points;

  v_new_rank := CASE
    WHEN v_new_points < 100 THEN 1
    WHEN v_new_points < 250 THEN 2
    WHEN v_new_points < 500 THEN 3
    WHEN v_new_points < 1000 THEN 4
    WHEN v_new_points < 2000 THEN 5
    WHEN v_new_points < 5000 THEN 6
    ELSE 7
  END;

  UPDATE public.user_stats
  SET rank = v_new_rank, last_rank_update = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object('points', v_new_points, 'rank', v_new_rank);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_points TO authenticated;

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE(badge_id uuid, badge_name text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r badges%rowtype;
  v_current integer;
BEGIN
  FOR r IN SELECT * FROM public.badges LOOP
    IF EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = r.id
    ) THEN
      CONTINUE;
    END IF;

    SELECT CASE r.criteria_type
      WHEN 'on_time_submissions' THEN on_time_submissions
      WHEN 'rank' THEN rank
      WHEN 'file_edits' THEN file_edits
      WHEN 'streak' THEN current_streak
      WHEN 'total_submissions' THEN total_submissions
      ELSE 0
    END INTO v_current
    FROM public.user_stats WHERE user_id = p_user_id;

    IF v_current >= r.criteria_value THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, r.id);
      RETURN QUERY SELECT r.id, r.name;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_award_badges TO authenticated;

-- ============================================
-- 19. SEED BADGES
-- ============================================
INSERT INTO public.badges (name, description, icon, criteria_type, criteria_value, display_order) VALUES
('First Steps', 'Submit your first assignment on time', 'award', 'on_time_submissions', 1, 1),
('Consistent Scholar', 'Submit 5 assignments on time', 'award', 'on_time_submissions', 5, 2),
('Deadline Master', 'Submit 10 assignments on time', 'trophy', 'on_time_submissions', 10, 3),
('Unstoppable', 'Submit 25 assignments on time', 'crown', 'on_time_submissions', 25, 4),
('Rising Star', 'Reach Achiever rank', 'star', 'rank', 3, 5),
('Expert Mind', 'Reach Expert rank', 'star', 'rank', 5, 6),
('Legendary', 'Reach Legend rank', 'crown', 'rank', 10, 7),
('File Tinkerer', 'Edit files 10 times', 'file-edit', 'file_edits', 10, 8),
('File Organizer', 'Edit files 50 times', 'file-edit', 'file_edits', 50, 9),
('File Wizard', 'Edit files 100 times', 'file-edit', 'file_edits', 100, 10),
('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak', 7, 11),
('Month Master', 'Maintain a 30-day streak', 'flame', 'streak', 30, 12),
('Century Club', 'Complete 50 total submissions', 'check-circle', 'total_submissions', 50, 13),
('Grand Scholar', 'Complete 100 total submissions', 'check-circle', 'total_submissions', 100, 14);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- All tables, RLS policies, and functions are now ready.
-- Your AcadFlow database is configured!
