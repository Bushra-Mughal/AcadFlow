-- Make user_id nullable so the trigger can set it
ALTER TABLE files 
ALTER COLUMN user_id DROP NOT NULL;

-- The trigger will ensure it's always set, so we don't need the NOT NULL constraint


