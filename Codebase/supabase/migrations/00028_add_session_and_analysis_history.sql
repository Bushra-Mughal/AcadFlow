-- Add session_id to chat_messages for grouping conversations
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id uuid;

-- Create index for fast session queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

-- Table to store AI Analyzer results per user
CREATE TABLE analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_preview text NOT NULL,
  overall_score integer NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_history_user ON analysis_history(user_id, created_at DESC);

ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_analysis"
  ON analysis_history FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


