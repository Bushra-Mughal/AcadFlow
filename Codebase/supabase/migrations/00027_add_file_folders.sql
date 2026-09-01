-- â”€â”€ File Folders table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE file_folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  parent_id  uuid REFERENCES file_folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_folders_user_id   ON file_folders(user_id);
CREATE INDEX idx_file_folders_parent_id ON file_folders(parent_id);

-- RLS
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own folders"
  ON file_folders FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- â”€â”€ Add folder_id FK to files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES file_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);


