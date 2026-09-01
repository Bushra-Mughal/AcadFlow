-- Create a function to test if auth.uid() is working
CREATE OR REPLACE FUNCTION debug_auth_info()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'session_user', session_user
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_info() TO authenticated;


