-- Create user_stats table to track coins, rank, and activities
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 1,
  on_time_submissions integer NOT NULL DEFAULT 0,
  total_submissions integer NOT NULL DEFAULT 0,
  file_edits integer NOT NULL DEFAULT 0,
  last_rank_update timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_stats_rank ON user_stats(rank DESC);

-- Function to calculate rank from coins (rank n = n * 10 coins)
-- So rank 1 = 10 coins, rank 2 = 20 coins, rank 3 = 30 coins, etc.
CREATE OR REPLACE FUNCTION calculate_rank(coins_count integer)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  -- rank = floor(coins / 10), minimum rank is 1
  RETURN GREATEST(1, coins_count / 10);
END;
$$;

-- Function to update user rank based on coins
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_rank integer;
BEGIN
  -- Calculate new rank
  new_rank := calculate_rank(NEW.coins);
  
  -- Update rank if it changed
  IF new_rank != NEW.rank THEN
    NEW.rank := new_rank;
    NEW.last_rank_update := now();
  END IF;
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger to automatically update rank when coins change
CREATE TRIGGER update_rank_on_coins_change
  BEFORE UPDATE OF coins ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rank();

-- Function to award coins for on-time submission
CREATE OR REPLACE FUNCTION award_coins_for_submission(
  p_user_id uuid,
  p_is_on_time boolean,
  p_coins_amount integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user stats
  INSERT INTO user_stats (user_id, coins, on_time_submissions, total_submissions)
  VALUES (
    p_user_id,
    CASE WHEN p_is_on_time THEN p_coins_amount ELSE 0 END,
    CASE WHEN p_is_on_time THEN 1 ELSE 0 END,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    coins = user_stats.coins + CASE WHEN p_is_on_time THEN p_coins_amount ELSE 0 END,
    on_time_submissions = user_stats.on_time_submissions + CASE WHEN p_is_on_time THEN 1 ELSE 0 END,
    total_submissions = user_stats.total_submissions + 1;
END;
$$;

-- Function to award coins for file edits
CREATE OR REPLACE FUNCTION award_coins_for_file_edit(
  p_user_id uuid,
  p_coins_amount integer DEFAULT 2
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user stats
  INSERT INTO user_stats (user_id, coins, file_edits)
  VALUES (p_user_id, p_coins_amount, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    coins = user_stats.coins + p_coins_amount,
    file_edits = user_stats.file_edits + 1;
END;
$$;

-- Grant permissions
GRANT SELECT ON user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION award_coins_for_submission TO authenticated;
GRANT EXECUTE ON FUNCTION award_coins_for_file_edit TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_rank TO authenticated;


