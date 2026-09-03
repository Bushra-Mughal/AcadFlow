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
RETURNS TABLE(id uuid, email text, username text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE lower(p.username) = lower(trim(p_email))
    AND trim(p_email) ~ '^[A-Za-z0-9_]+$'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

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
-- Own files, plus files linked to a team project you created or joined,
-- plus files linked to your own assignments.
CREATE POLICY "files_select" ON public.files
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      is_project_creator(project_id, auth.uid()) OR is_project_member(project_id, auth.uid())
    ))
    OR (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = files.assignment_id AND a.user_id = auth.uid()
    ))
  );
CREATE POLICY "files_insert" ON public.files
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "files_update" ON public.files
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      is_project_creator(project_id, auth.uid()) OR is_project_member(project_id, auth.uid())
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      is_project_creator(project_id, auth.uid()) OR is_project_member(project_id, auth.uid())
    ))
  );
CREATE POLICY "files_delete" ON public.files
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      is_project_creator(project_id, auth.uid()) OR is_project_member(project_id, auth.uid())
    ))
  );

-- FILE_FOLDERS
CREATE POLICY "Users own their folders" ON public.file_folders
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ACTIVITIES
-- Team log sharing: activities recorded against a team project (project_id
-- set) are visible to the project creator and every member, so the whole
-- team sees the same log.
CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = activities.assignment_id AND a.user_id = auth.uid()
    ))
    OR (project_id IS NOT NULL AND (
      is_project_creator(project_id, auth.uid()) OR is_project_member(project_id, auth.uid())
    ))
  );
CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CHAT_MESSAGES
CREATE POLICY "Users own their chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ANALYSIS_HISTORY
CREATE POLICY "Users own their analysis history" ON public.analysis_history
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================
-- 16.5 STORAGE BUCKET (user-files) & POLICIES
-- ============================================
-- The app uploads to this bucket under my-files/<user_id>/<file> and opens
-- files with getPublicUrl(), so the bucket must be public. No MIME-type
-- restrictions (the app detects code/text/video types itself).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-files', 'user-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 52428800,
      allowed_mime_types = NULL;

-- True when a storage object belongs to a file linked to a project the given
-- user created or joined. SECURITY DEFINER so team members can open, edit
-- and download each other's shared project files.
CREATE OR REPLACE FUNCTION public.storage_object_accessible(p_object_name text, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.files f
    WHERE f.file_path = p_object_name
      AND f.project_id IS NOT NULL
      AND (
        is_project_creator(f.project_id, p_user)
        OR is_project_member(f.project_id, p_user)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.storage_object_accessible(text, uuid) TO authenticated;

CREATE POLICY "user_files_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-files'
    AND (storage.foldername(name))[1] = 'my-files'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "user_files_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR public.storage_object_accessible(name, auth.uid())
    )
  );

CREATE POLICY "user_files_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'user-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR public.storage_object_accessible(name, auth.uid())
    )
  )
  WITH CHECK (
    bucket_id = 'user-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR public.storage_object_accessible(name, auth.uid())
    )
  );

CREATE POLICY "user_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR public.storage_object_accessible(name, auth.uid())
    )
  );

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
-- Progressive ranks: 1 Beginner .. 7 Legend
CREATE OR REPLACE FUNCTION public.get_rank_from_points(p_points integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 4000 THEN 7
    WHEN p_points >= 2000 THEN 6
    WHEN p_points >= 1000 THEN 5
    WHEN p_points >= 500  THEN 4
    WHEN p_points >= 250  THEN 3
    WHEN p_points >= 100  THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_points_for_rank(p_rank integer)
RETURNS integer
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_rank <= 1 THEN 0
    WHEN p_rank = 2  THEN 100
    WHEN p_rank = 3  THEN 250
    WHEN p_rank = 4  THEN 500
    WHEN p_rank = 5  THEN 1000
    WHEN p_rank = 6  THEN 2000
    ELSE 4000
  END;
$$;

CREATE OR REPLACE FUNCTION public.update_rank_from_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.rank := public.get_rank_from_points(NEW.points);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_rank_on_points
  BEFORE UPDATE OF points ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_rank_from_points();

-- award_points(p_user_id, p_action) — the signature the frontend calls.
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_action  text,
  p_points  integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pts      integer;
  v_old_rank integer;
  v_new_rank integer;
BEGIN
  v_pts := COALESCE(p_points,
    CASE p_action
      WHEN 'assignment_completed_ontime'   THEN 50
      WHEN 'assignment_completed_onday'    THEN 30
      WHEN 'assignment_completed_late'     THEN 10
      WHEN 'assignment_status_progress'    THEN 5
      WHEN 'assignment_status_review'      THEN 10
      WHEN 'project_completed_ontime'      THEN 70
      WHEN 'project_completed_onday'       THEN 50
      WHEN 'project_completed_late'        THEN 15
      WHEN 'project_status_progress'       THEN 5
      WHEN 'project_status_review'         THEN 10
      WHEN 'team_member_invited'           THEN 15
      WHEN 'file_uploaded'                 THEN 5
      WHEN 'file_edited'                   THEN 5
      WHEN 'ai_session'                    THEN 10
      ELSE 5
    END
  );

  INSERT INTO public.user_stats (user_id, points, coins, rank)
  VALUES (p_user_id, v_pts, GREATEST(1, v_pts / 10), public.get_rank_from_points(v_pts))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT rank INTO v_old_rank FROM public.user_stats WHERE user_id = p_user_id;

  UPDATE public.user_stats
  SET
    points = points + v_pts,
    coins  = coins + GREATEST(1, v_pts / 10),
    on_time_submissions = on_time_submissions +
      CASE WHEN p_action IN ('assignment_completed_ontime','assignment_completed_onday') THEN 1 ELSE 0 END,
    total_submissions = total_submissions +
      CASE WHEN p_action LIKE 'assignment_completed%' THEN 1 ELSE 0 END,
    assignments_completed = assignments_completed +
      CASE WHEN p_action LIKE 'assignment_completed%' THEN 1 ELSE 0 END,
    projects_completed = projects_completed +
      CASE WHEN p_action LIKE 'project_completed%' THEN 1 ELSE 0 END,
    on_time_projects = on_time_projects +
      CASE WHEN p_action IN ('project_completed_ontime','project_completed_onday') THEN 1 ELSE 0 END,
    team_members_invited = team_members_invited +
      CASE WHEN p_action = 'team_member_invited' THEN 1 ELSE 0 END,
    files_uploaded = files_uploaded +
      CASE WHEN p_action = 'file_uploaded' THEN 1 ELSE 0 END,
    ai_sessions = ai_sessions +
      CASE WHEN p_action = 'ai_session' THEN 1 ELSE 0 END,
    file_edits = file_edits +
      CASE WHEN p_action = 'file_edited' THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE user_id = p_user_id;

  SELECT rank INTO v_new_rank FROM public.user_stats WHERE user_id = p_user_id;

  RETURN json_build_object(
    'points_awarded', v_pts,
    'rank_changed',   v_new_rank <> v_old_rank,
    'old_rank',       v_old_rank,
    'new_rank',       v_new_rank
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_points(uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.award_coins_for_submission(
  p_user_id      uuid,
  p_is_on_time   boolean,
  p_coins_amount integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  v_action := CASE WHEN p_is_on_time THEN 'assignment_completed_ontime' ELSE 'assignment_completed_late' END;
  PERFORM public.award_points(p_user_id, v_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_coins_for_file_edit(
  p_user_id      uuid,
  p_coins_amount integer DEFAULT 2
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.award_points(p_user_id, 'file_edited');
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_coins_for_submission(uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins_for_file_edit(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_submission_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  last_date  date;
  today_date date;
  new_streak integer;
BEGIN
  today_date := CURRENT_DATE;

  SELECT last_submission_date INTO last_date
  FROM public.user_stats
  WHERE user_id = p_user_id;

  IF last_date IS NULL THEN
    new_streak := 1;
  ELSIF last_date = today_date THEN
    RETURN;
  ELSIF last_date = today_date - INTERVAL '1 day' THEN
    new_streak := (SELECT current_streak FROM public.user_stats WHERE user_id = p_user_id) + 1;
  ELSE
    new_streak := 1;
  END IF;

  UPDATE public.user_stats
  SET
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    last_submission_date = today_date
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_submission_streak(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE(newly_unlocked_badge_id uuid, badge_name text, badge_description text, badge_icon text)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_stat RECORD;
  badge RECORD;
  current_value integer;
  badge_unlocked boolean;
BEGIN
  SELECT * INTO user_stat FROM public.user_stats WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR badge IN SELECT * FROM public.badges ORDER BY display_order LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = badge.id
    ) INTO badge_unlocked;

    IF NOT badge_unlocked THEN
      current_value := CASE badge.criteria_type
        WHEN 'on_time_submissions' THEN user_stat.on_time_submissions
        WHEN 'rank' THEN user_stat.rank
        WHEN 'file_edits' THEN user_stat.file_edits
        WHEN 'streak' THEN user_stat.longest_streak
        WHEN 'total_submissions' THEN user_stat.total_submissions
        ELSE 0
      END;

      IF current_value >= badge.criteria_value THEN
        INSERT INTO public.user_badges (user_id, badge_id)
        VALUES (p_user_id, badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;

        newly_unlocked_badge_id := badge.id;
        badge_name := badge.name;
        badge_description := badge.description;
        badge_icon := badge.icon;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;

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
