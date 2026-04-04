-- Atomic helper used by lib/tg-invite.ts.
-- Selects the oldest unused token for a given plan, marks it used, and
-- returns the token string.  Returns NULL when no tokens remain.
-- Using FOR UPDATE SKIP LOCKED prevents two concurrent payments grabbing
-- the same token.

CREATE OR REPLACE FUNCTION claim_tg_access_token(
  p_plan      TEXT,
  p_order_ref TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT token
    INTO v_token
    FROM tg_access_tokens
   WHERE plan  = p_plan
     AND used  = false
   ORDER BY created_at ASC
   LIMIT 1
     FOR UPDATE SKIP LOCKED;

  IF v_token IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE tg_access_tokens
     SET used      = true,
         used_at   = now(),
         order_ref = p_order_ref
   WHERE token = v_token;

  RETURN v_token;
END;
$$;
