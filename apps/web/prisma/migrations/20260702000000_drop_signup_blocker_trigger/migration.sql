-- Drop the trigger and function that blocked all new user sign-ups.
-- handle_new_user() inserted into public.profiles on auth.users INSERT.
-- When that table didn't match expectations it threw "database error saving
-- new user", preventing every email/Apple/Google sign-up from completing.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Also add CASCADE on the profiles FK so existing profile rows don't block
-- admin.auth.admin.deleteUser() calls (which would fail with FK violation).
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
