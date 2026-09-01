-- Create a trigger function to automatically set user_id if not provided
CREATE OR REPLACE FUNCTION set_user_id_on_files()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is NULL, set it to the authenticated user
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_user_id_trigger ON files;

-- Create the trigger
CREATE TRIGGER set_user_id_trigger
  BEFORE INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_files();


