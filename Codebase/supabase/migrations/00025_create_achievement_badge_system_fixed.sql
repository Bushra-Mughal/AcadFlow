-- Add streak tracking to user_stats
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_submission_date date;

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badges_criteria_type ON badges(criteria_type);

-- Insert predefined badges
INSERT INTO badges (name, description, icon, criteria_type, criteria_value, display_order) VALUES
  ('First Steps', 'Complete your first assignment on time', 'CheckCircle', 'on_time_submissions', 1, 1),
  ('Consistent Performer', 'Complete 5 assignments on time', 'Target', 'on_time_submissions', 5, 2),
  ('Perfect Ten', 'Complete 10 assignments on time', 'Award', 'on_time_submissions', 10, 3),
  ('Dedication Master', 'Complete 25 assignments on time', 'Crown', 'on_time_submissions', 25, 4),
  ('Rising Star', 'Reach Rank 3', 'Star', 'rank', 3, 5),
  ('Elite Scholar', 'Reach Rank 5', 'Sparkles', 'rank', 5, 6),
  ('Academic Legend', 'Reach Rank 10', 'Trophy', 'rank', 10, 7),
  ('Editor Novice', 'Edit 10 files', 'FileEdit', 'file_edits', 10, 8),
  ('Editor Expert', 'Edit 50 files', 'FilePenLine', 'file_edits', 50, 9),
  ('Editor Master', 'Edit 100 files', 'FileCode', 'file_edits', 100, 10),
  ('Week Warrior', 'Maintain a 7-day submission streak', 'Flame', 'streak', 7, 11),
  ('Month Champion', 'Maintain a 30-day submission streak', 'Zap', 'streak', 30, 12),
  ('Productivity King', 'Complete 50 total submissions', 'Rocket', 'total_submissions', 50, 13),
  ('Century Club', 'Complete 100 total submissions', 'Medal', 'total_submissions', 100, 14)
ON CONFLICT (name) DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id uuid)
RETURNS TABLE(newly_unlocked_badge_id uuid, badge_name text, badge_description text, badge_icon text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_stat RECORD;
  badge RECORD;
  current_value integer;
  badge_unlocked boolean;
BEGIN
  -- Get user stats
  SELECT * INTO user_stat FROM user_stats WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check each badge
  FOR badge IN SELECT * FROM badges ORDER BY display_order LOOP
    -- Check if user already has this badge
    SELECT EXISTS(
      SELECT 1 FROM user_badges 
      WHERE user_id = p_user_id AND badge_id = badge.id
    ) INTO badge_unlocked;
    
    IF NOT badge_unlocked THEN
      -- Get current value based on criteria type
      current_value := CASE badge.criteria_type
        WHEN 'on_time_submissions' THEN user_stat.on_time_submissions
        WHEN 'rank' THEN user_stat.rank
        WHEN 'file_edits' THEN user_stat.file_edits
        WHEN 'streak' THEN user_stat.longest_streak
        WHEN 'total_submissions' THEN user_stat.total_submissions
        ELSE 0
      END;
      
      -- Award badge if criteria met
      IF current_value >= badge.criteria_value THEN
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (p_user_id, badge.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
        
        -- Return newly unlocked badge info
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

-- Function to update streak
CREATE OR REPLACE FUNCTION update_submission_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_date date;
  today_date date;
  new_streak integer;
BEGIN
  today_date := CURRENT_DATE;
  
  SELECT last_submission_date INTO last_date
  FROM user_stats
  WHERE user_id = p_user_id;
  
  IF last_date IS NULL THEN
    -- First submission
    new_streak := 1;
  ELSIF last_date = today_date THEN
    -- Already submitted today, no change
    RETURN;
  ELSIF last_date = today_date - INTERVAL '1 day' THEN
    -- Consecutive day
    new_streak := (SELECT current_streak FROM user_stats WHERE user_id = p_user_id) + 1;
  ELSE
    -- Streak broken
    new_streak := 1;
  END IF;
  
  UPDATE user_stats
  SET 
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    last_submission_date = today_date
  WHERE user_id = p_user_id;
END;
$$;

-- Grant permissions
GRANT SELECT ON badges TO authenticated;
GRANT SELECT ON user_badges TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_badges TO authenticated;
GRANT EXECUTE ON FUNCTION update_submission_streak TO authenticated;


