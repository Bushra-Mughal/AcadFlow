-- Safe, SECURITY DEFINER function that lets any authenticated user look up
-- another user's public profile info by email for the purpose of inviting members.
-- Exposes ONLY id, email, username â€” no sensitive fields.
CREATE OR REPLACE FUNCTION public.find_user_by_email(lookup_email text)
RETURNS TABLE(id uuid, email text, username text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(lookup_email))
  LIMIT 1;
$$;

-- Grant to authenticated users only
REVOKE ALL ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;


