-- Clients who must not receive the VIP MAX Discord role even though their
-- subscription would otherwise entitle them to it.
--
-- The list is deliberately unreachable through the API — no policy on the
-- table — and is consulted through a function that answers one yes/no
-- question about one address, so the roster of blocked people can't be read
-- out through the public key.
CREATE TABLE IF NOT EXISTS public.discord_vip_blocks (
  email TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_vip_blocks ENABLE ROW LEVEL SECURITY;
-- No policy on purpose: only the definer functions below may read it.

CREATE OR REPLACE FUNCTION public.is_vip_blocked(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.discord_vip_blocks
    WHERE email = lower(trim(p_email))
  );
$$;

CREATE OR REPLACE FUNCTION public.set_vip_block(p_email text, p_blocked boolean, p_reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_blocked THEN
    INSERT INTO public.discord_vip_blocks (email, reason)
    VALUES (lower(trim(p_email)), p_reason)
    ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason;
  ELSE
    DELETE FROM public.discord_vip_blocks WHERE email = lower(trim(p_email));
  END IF;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_vip_blocked(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_vip_block(text, boolean, text) TO service_role;
