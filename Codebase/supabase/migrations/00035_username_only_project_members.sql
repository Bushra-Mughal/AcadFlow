-- Team membership uses existing AcadFlow usernames only.
-- This function does not send email; it returns the matching account so the
-- authenticated project creator can add that account to project_members.
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE(id uuid, email text, username text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE lower(p.username) = lower(trim(p_email))
    AND trim(p_email) ~ '^[A-Za-z0-9_]+$'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;