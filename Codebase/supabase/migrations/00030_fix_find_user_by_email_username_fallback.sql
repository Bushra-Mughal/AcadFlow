-- Drop and recreate find_user_by_email to match by exact email OR by username
-- extracted from the local part of the supplied address.
-- e.g. "mariamazeem@gmail.com" â†’ extracts "mariamazeem" â†’ matches profiles.username
CREATE OR REPLACE FUNCTION public.find_user_by_email(lookup_email text)
RETURNS TABLE(id uuid, email text, username text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.username
  FROM public.profiles p
  WHERE
    -- 1. Exact email match (handles real-email users, e.g. Google SSO)
    lower(p.email) = lower(trim(lookup_email))
    OR
    -- 2. Username match via local-part of the supplied address
    --    "mariamazeem@gmail.com" â†’ "mariamazeem"
    --    "mariamazeem"           â†’ "mariamazeem"  (no @ present â€” split_part returns full string)
    lower(p.username) = lower(split_part(trim(lookup_email), '@', 1))
  LIMIT 1;
$$;

-- Re-grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;


