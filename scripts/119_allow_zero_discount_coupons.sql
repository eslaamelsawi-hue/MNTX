-- An approved custom-mentorship request mints a coupon even when the admin
-- didn't discount anything: the coupon is also the single-use token the
-- checkout link is keyed on, and the only thing enforcing its expiry. The
-- table rejected a zero value, so approving at the full quoted price failed
-- with coupons_discount_value_check.
--
-- Manually created coupons must still be worth something; that check lives in
-- the admin API, where a human can be told why.
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_value_check;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_value_check CHECK (discount_value >= 0);
