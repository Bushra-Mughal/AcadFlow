-- Create a function to insert files that bypasses RLS
CREATE OR REPLACE FUNCTION insert_file(
  p_name text,
  p_file_path text,
  p_file_type text,
  p_file_size bigint,
  p_mime_type text,
  p_assignment_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file_id uuid;
  v_user_id uuid;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Insert the file
  INSERT INTO files (
    user_id,
    name,
    file_path,
    file_type,
    file_size,
    mime_type,
    assignment_id,
    project_id
  ) VALUES (
    v_user_id,
    p_name,
    p_file_path,
    p_file_type,
    p_file_size,
    p_mime_type,
    p_assignment_id,
    p_project_id
  )
  RETURNING id INTO v_file_id;
  
  RETURN v_file_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_file TO authenticated;


