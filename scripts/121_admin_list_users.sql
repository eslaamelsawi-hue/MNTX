-- The admin Users page needs the list of signed-up accounts, but auth.users
-- isn't exposed through PostgREST and this project's app key can't reach the
-- admin auth API. This read-only function bridges that: it runs as its owner
-- so it can read auth.users, returns only identity and activity columns
-- (never the password hash), and refuses to answer without the token the
-- server holds in ADMIN_USERS_TOKEN.
--
-- Nothing in auth is modified — no trigger, no mirrored copy.
CREATE OR REPLACE FUNCTION public.admin_list_users(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $fn$
BEGIN
  IF p_token IS DISTINCT FROM '5580ed1fb7b18315c71493e243b43472bfe6ea006d307ff9' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at, u.email_confirmed_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO anon, authenticated, service_role;
