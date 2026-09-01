-- â”€â”€ 1. Extend user_stats with more tracking columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projects_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assignments_completed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_members_invited integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS files_uploaded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_sessions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_time_projects integer NOT NULL DEFAULT 0;

-- Seed points from existing coins for existing rows
UPDATE user_stats SET points = coins * 5 WHERE points = 0 AND coins > 0;

-- â”€â”€ 2. Progressive rank thresholds function â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Rank 1 Beginner   :    0 â€“ 99
-- Rank 2 Learner    :  100 â€“ 249
-- Rank 3 Achiever   :  250 â€“ 499
-- Rank 4 Expert     :  500 â€“ 999
-- Rank 5 Master     : 1000 â€“ 1999
-- Rank 6 Champion   : 2000 â€“ 3999
-- Rank 7 Legend     : 4000+
CREATE OR REPLACE FUNCTION get_rank_from_points(p_points integer)
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

-- â”€â”€ 3. Get points threshold for a rank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION get_points_for_rank(p_rank integer)
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

-- â”€â”€ 4. Trigger: auto-update rank when points change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION update_rank_from_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.rank := get_rank_from_points(NEW.points);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_rank_on_points ON user_stats;
CREATE TRIGGER trg_update_rank_on_points
  BEFORE UPDATE OF points ON user_stats
  FOR EACH ROW EXECUTE FUNCTION update_rank_from_points();

-- â”€â”€ 5. Award points RPC (replaces old coins-only version) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Action types and their default point values:
--   'assignment_completed_ontime'   => 50
--   'assignment_completed_onday'    => 30
--   'assignment_completed_late'     => 10
--   'assignment_status_progress'    => 5
--   'assignment_status_review'      => 10
--   'project_completed_ontime'      => 70
--   'project_completed_onday'       => 50
--   'project_completed_late'        => 15
--   'project_status_progress'       => 5
--   'project_status_review'         => 10
--   'team_member_invited'           => 15
--   'file_uploaded'                 => 5
--   'file_edited'                   => 5
--   'ai_session'                    => 10
--   'custom'                        => caller supplies p_points

CREATE OR REPLACE FUNCTION award_points(
  p_user_id   uuid,
  p_action    text,
  p_points    integer DEFAULT NULL   -- override; NULL = use defaults
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pts       integer;
  v_old_rank  integer;
  v_new_rank  integer;
  v_coins_delta integer;
BEGIN
  -- Resolve point amount
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

  -- Upsert user_stats
  INSERT INTO user_stats (user_id, points, coins, rank)
  VALUES (p_user_id, v_pts, GREATEST(1, v_pts / 10), get_rank_from_points(v_pts))
  ON CONFLICT (user_id) DO NOTHING;

  SELECT rank INTO v_old_rank FROM user_stats WHERE user_id = p_user_id;

  -- Increment stat counters
  UPDATE user_stats
  SET
    points     = points + v_pts,
    -- keep legacy coins in sync (1 coin â‰ˆ 10 pts, min 1)
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

  SELECT rank INTO v_new_rank FROM user_stats WHERE user_id = p_user_id;

  RETURN json_build_object(
    'points_awarded', v_pts,
    'rank_changed',   v_new_rank <> v_old_rank,
    'old_rank',       v_old_rank,
    'new_rank',       v_new_rank
  );
END;
$$;

GRANT EXECUTE ON FUNCTION award_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_rank_from_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_points_for_rank TO authenticated;

-- â”€â”€ 6. Keep old RPC aliases working (just call new function) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION award_coins_for_submission(
  p_user_id    uuid,
  p_is_on_time boolean,
  p_coins_amount integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action text;
BEGIN
  v_action := CASE WHEN p_is_on_time THEN 'assignment_completed_ontime' ELSE 'assignment_completed_late' END;
  PERFORM award_points(p_user_id, v_action);
END;
$$;

GRANT EXECUTE ON FUNCTION award_coins_for_submission TO authenticated;

CREATE OR REPLACE FUNCTION award_coins_for_file_edit(
  p_user_id    uuid,
  p_coins_amount integer DEFAULT 2
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM award_points(p_user_id, 'file_edited');
END;
$$;

GRANT EXECUTE ON FUNCTION award_coins_for_file_edit TO authenticated;


