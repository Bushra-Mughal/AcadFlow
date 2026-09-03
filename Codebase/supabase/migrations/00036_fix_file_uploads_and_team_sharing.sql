-- ============================================================================
-- 00036: Fix file uploads (File Vault / Assignments / Team Projects) and
-- share the team activity log with project members.
--
-- Safe to run on any database state (fresh supabase_setup.sql or the full
-- migration chain). Every statement is idempotent.
--
-- What this fixes:
--   1. Creates the `user-files` storage bucket and correct policies so
--      uploads from Files.tsx / AssignmentDetail.tsx / ProjectDetail.tsx
--      succeed. The bucket is public (the app opens files via public URLs),
--      capped at 50 MB per file (the app enforces 10 MB client-side) and
--      has no MIME-type restrictions.
--   2. Activities recorded for a team project (project_id set) become
--      visible to every member of that project in the Activity Log.
--      Previously each user only ever saw their own rows.
--   3. Team members can view/download each other's files that are linked
--      to a shared project (both the files table rows and the underlying
--      storage objects).
--   4. Recreates the RPCs with the signatures the frontend actually calls
--      (award_points(p_user_id, p_action), streaks, badges).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STORAGE BUCKET
-- ----------------------------------------------------------------------------
-- The app uploads to `user-files` under `my-files/<user_id>/<file>` and opens
-- files with getPublicUrl(), so the bucket must exist and be public.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-files', 'user-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 52428800,
      allowed_mime_types = NULL;

-- ----------------------------------------------------------------------------
-- 2. DROP EXISTING POLICIES (tables + storage)
-- ----------------------------------------------------------------------------
-- The migration history contains several conflicting policy sets
-- (00002, 00004, 00007, 00011, 00012, 00022, supabase_setup.sql). Drop
-- everything we are about to rebuild so the end state is deterministic.
DO $$
DECLARE
  pol record;
BEGIN
  -- All policies on the tables we are normalizing
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('projects', 'project_members', 'files', 'activities')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;

  -- Every storage.objects policy that targets the user-files bucket,
  -- regardless of which migration or the dashboard created it.
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (COALESCE(qual, '') ILIKE '%user-files%' OR COALESCE(with_check, '') ILIKE '%user-files%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS (2-arg signatures)
-- ----------------------------------------------------------------------------
-- Older migrations left 1-arg overloads behind; remove them so only the
-- 2-arg versions exist. Policies referencing them were dropped in step 2.
DROP FUNCTION IF EXISTS public.is_project_creator(uuid);
DROP FUNCTION IF EXISTS public.is_project_member(uuid);
DROP FUNCTION IF EXISTS public.can_view_project(uuid);

CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_creator(project_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND creator_id = user_uuid
  );
$$;

-- True when a storage object belongs to a file linked to a project the given
-- user created or joined. SECURITY DEFINER so it bypasses files-table RLS
-- (avoids recursion when called from storage policies).
CREATE OR REPLACE FUNCTION public.storage_object_accessible(p_object_name text, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.files f
    WHERE f.file_path = p_object_name
      AND f.project_id IS NOT NULL
      AND (
        public.is_project_creator(f.project_id, p_user)
        OR public.is_project_member(f.project_id, p_user)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_object_accessible(text, uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. TABLE POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- projects -------------------------------------------------------------------
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_project_member(id, auth.uid())
  );

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.is_project_member(id, auth.uid())
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR public.is_project_member(id, auth.uid())
  );

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- project_members ------------------------------------------------------------
-- Members can see who else is on their team; only the creator manages members.
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_project_creator(project_id, auth.uid())
    OR public.is_project_member(project_id, auth.uid())
  );

CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_project_creator(project_id, auth.uid()));

CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE TO authenticated
  USING (public.is_project_creator(project_id, auth.uid()));

-- files ----------------------------------------------------------------------
-- Own files, plus files linked to a team project you created or joined, plus
-- files linked to your own assignments.
CREATE POLICY "files_select" ON public.files
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      public.is_project_creator(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid())
    ))
    OR (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = files.assignment_id AND a.user_id = auth.uid()
    ))
  );

CREATE POLICY "files_insert" ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "files_update" ON public.files
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      public.is_project_creator(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid())
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      public.is_project_creator(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid())
    ))
  );

CREATE POLICY "files_delete" ON public.files
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (project_id IS NOT NULL AND (
      public.is_project_creator(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid())
    ))
  );

-- activities -----------------------------------------------------------------
-- THE TEAM LOG FIX: activities recorded against a team project (project_id)
-- are visible to the project creator and every member. Activities against
-- your own assignments stay visible only to you.
CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (assignment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = activities.assignment_id AND a.user_id = auth.uid()
    ))
    OR (project_id IS NOT NULL AND (
      public.is_project_creator(project_id, auth.uid())
      OR public.is_project_member(project_id, auth.uid())
    ))
  );

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. STORAGE POLICIES (user-files bucket)
-- ----------------------------------------------------------------------------
-- Uploads go to my-files/<user_id>/<file>; each user can always access their
-- own folder, and team members can read/update/delete objects that belong
-- to files linked to one of their shared projects.
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

-- ----------------------------------------------------------------------------
-- 6. RANK / POINTS / BADGE RPCs
-- ----------------------------------------------------------------------------
-- Normalize to the signatures the frontend calls:
--   award_points(p_user_id, p_action)            <- Files/Assignments/Projects/AIAssistant
--   award_coins_for_file_edit(p_user_id, ...)    <- AssignmentDetail/ProjectDetail
--   check_and_award_badges(p_user_id)            <- returns badge_description
--   update_submission_streak(p_user_id)           <- Assignments/Projects
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS last_submission_date date;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS projects_completed integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS assignments_completed integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS team_members_invited integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS files_uploaded integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS ai_sessions integer NOT NULL DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS on_time_projects integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.get_rank_from_points(p_points integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
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
LANGUAGE sql
IMMUTABLE
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

-- award_points(p_user_id, p_action) — replaces the old (uuid, integer) version
DROP FUNCTION IF EXISTS public.award_points(uuid, integer);
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_action  text,
  p_points  integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pts       integer;
  v_old_rank  integer;
  v_new_rank  integer;
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
    points     = points + v_pts,
    coins      = coins + GREATEST(1, v_pts / 10),
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

CREATE OR REPLACE FUNCTION public.award_coins_for_submission(
  p_user_id      uuid,
  p_is_on_time   boolean,
  p_coins_amount integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_points(p_user_id, 'file_edited');
END;
$$;

DROP FUNCTION IF EXISTS public.check_and_award_badges(uuid);
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE(newly_unlocked_badge_id uuid, badge_name text, badge_description text, badge_icon text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_submission_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_date date;
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

-- Single source of truth for rank: derive it from points, not coins.
DROP TRIGGER IF EXISTS update_rank_on_coins_change ON public.user_stats;
DROP TRIGGER IF EXISTS trg_update_rank_on_points ON public.user_stats;
CREATE TRIGGER trg_update_rank_on_points
  BEFORE UPDATE OF points ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_rank_from_points();

GRANT EXECUTE ON FUNCTION public.award_points(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins_for_submission(uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_coins_for_file_edit(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_badges(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_submission_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rank_from_points(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_points_for_rank(integer) TO authenticated;
