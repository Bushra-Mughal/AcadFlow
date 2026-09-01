-- 1. Add gmail column to store the user's real Google email
ALTER TABLE public.profiles ADD COLUMN gmail text;

-- 2. Create index for fast lookup when Google OAuth fires
CREATE INDEX profiles_gmail_idx ON public.profiles (gmail);

-- 3. Update handle_new_user to copy username when Gmail matches an existing profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username text;
  v_gmail    text;
  v_is_google_user boolean;
BEGIN
  -- Detect Google OAuth users: their email is a real address, not @miaoda.com
  v_is_google_user := (NEW.email NOT LIKE '%@miaoda.com');

  IF v_is_google_user THEN
    v_gmail := NEW.email;

    -- Check if an existing AcadFlow profile registered this Gmail
    SELECT username INTO v_username
      FROM public.profiles
      WHERE gmail = v_gmail
      LIMIT 1;

    -- If no pre-registered Gmail, fall back to local part of email as placeholder
    IF v_username IS NULL THEN
      v_username := SPLIT_PART(NEW.email, '@', 1);
    END IF;

    INSERT INTO public.profiles (id, email, gmail, username, role)
    VALUES (NEW.id, NEW.email, v_gmail, v_username, 'user'::public.user_role)
    ON CONFLICT (id) DO UPDATE
      SET gmail    = EXCLUDED.gmail,
          username = COALESCE(profiles.username, EXCLUDED.username),
          email    = EXCLUDED.email;
  ELSE
    -- Password-based user: username will be set explicitly after signup
    INSERT INTO public.profiles (id, email, username, role)
    VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1), 'user'::public.user_role)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


