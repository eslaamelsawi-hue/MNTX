-- Add optional Telegram username to crypto orders for admin visibility
ALTER TABLE public.okx_orders
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Helpful index for quick filtering/search by telegram username in admin tools
CREATE INDEX IF NOT EXISTS idx_okx_orders_telegram_username
ON public.okx_orders (telegram_username);
