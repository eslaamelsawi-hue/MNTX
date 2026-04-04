-- Fix: reset tokens that were incorrectly claimed with fake order refs.
-- The old code stored refs like "Starter-OKX-abc123", "Starter-Admin-abc123",
-- "Starter-Resend-abc123", "Starter-NP-abc123", etc. instead of the real order ID.
-- These tokens were never actually sent to a real customer, so mark them unused again.

UPDATE tg_access_tokens
SET
  used      = false,
  used_at   = NULL,
  order_ref = NULL
WHERE
  used = true
  AND order_ref LIKE 'Starter-%';

-- Show what's left after the fix
SELECT
  COUNT(*) FILTER (WHERE used = false) AS available,
  COUNT(*) FILTER (WHERE used = true)  AS used_by_real_orders
FROM tg_access_tokens
WHERE plan = 'starter';
