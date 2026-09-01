-- Remove foreign key constraints that reference auth.users
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_user_id_fkey;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_creator_id_fkey;
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_user_id_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Make user_id columns nullable or keep them as text fields without FK constraints
-- They're already UUID type, so we'll just leave them without the FK constraint


