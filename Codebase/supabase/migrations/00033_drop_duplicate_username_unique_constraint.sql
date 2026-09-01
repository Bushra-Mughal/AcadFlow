-- Remove the redundant duplicate constraint, keep profiles_username_key
ALTER TABLE public.profiles DROP CONSTRAINT profiles_username_unique;


