-- Safe SECURITY DEFINER function: returns true if username is unclaimed,
-- false if taken. Bypasses RLS so unauthenticated callers get the real answer
-- without ever seeing any profile row data.
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE username = p_username
  );
$$;

-- Allow anonymous users to call this function
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated;


