-- Helper function called by the admin dashboard to fetch TG tokens for a
-- list of order IDs.  SECURITY DEFINER bypasses RLS so this works even
-- when the caller is using the anon key.

CREATE OR REPLACE FUNCTION get_tg_tokens_for_orders(order_ids TEXT[])
RETURNS TABLE (order_ref TEXT, token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.order_ref, t.token
  FROM tg_access_tokens t
  WHERE t.order_ref = ANY(order_ids);
END;
$$;
