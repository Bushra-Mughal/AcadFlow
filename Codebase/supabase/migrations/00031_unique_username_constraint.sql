-- Enforce unique usernames (NULLs are still allowed for users without a username set)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Index for fast lookup during invite / availability check
CREATE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username));


