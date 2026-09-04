-- Teammates need to see each other's public username (team tasks, member lists),
-- but `profiles` SELECT is limited to your own row. Expose a minimal,
-- security-definer lookup that returns only id + username for given ids.
CREATE OR REPLACE FUNCTION public.get_usernames_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, username text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.username
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);
$$;

REVOKE ALL ON FUNCTION public.get_usernames_by_ids(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_usernames_by_ids(uuid[]) TO authenticated;
