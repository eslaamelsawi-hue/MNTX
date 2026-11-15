-- The admin password used to live in admin_settings, which this project's
-- policies leave readable by the public API key — a key that ships inside the
-- site's JavaScript. Anyone who opened the page could read it and sign in.
--
-- It now lives in its own table with row level security on and no policy at
-- all, so nothing reaches it through the API. Login goes through a function
-- that runs as the table's owner, takes a password and answers yes or no:
-- the hash never leaves the database, and a wrong guess learns nothing.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: only the definer functions below may read it.

-- Carry across whatever password is in use today.
INSERT INTO public.admin_credentials (id, password_hash)
SELECT true, extensions.crypt(value, extensions.gen_salt('bf'))
FROM public.admin_settings
WHERE key = 'admin_password'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.verify_admin_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored text;
BEGIN
  SELECT password_hash INTO stored FROM public.admin_credentials WHERE id;
  IF stored IS NULL OR p_password IS NULL OR p_password = '' THEN
    RETURN false;
  END IF;
  RETURN stored = extensions.crypt(p_password, stored);
END;
$$;

-- Changing the password requires proving you know the current one.
CREATE OR REPLACE FUNCTION public.set_admin_password(p_current text, p_new text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored text;
BEGIN
  IF p_new IS NULL OR length(p_new) < 8 THEN
    RAISE EXCEPTION 'new password must be at least 8 characters';
  END IF;

  SELECT password_hash INTO stored FROM public.admin_credentials WHERE id;
  IF stored IS NOT NULL AND stored <> extensions.crypt(p_current, stored) THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_credentials (id, password_hash, updated_at)
  VALUES (true, extensions.crypt(p_new, extensions.gen_salt('bf')), now())
  ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now();
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO anon, authenticated, service_role;
