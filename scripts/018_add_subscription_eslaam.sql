-- Add subscription for eslaamelsawi@gmail.com
INSERT INTO user_subscriptions (client_email, client_name, plan, total_hours, used_hours, status, expires_at)
VALUES (
  'eslaamelsawi@gmail.com',
  'Eslaam',
  'premium',
  10,
  0,
  'active',
  NOW() + INTERVAL '1 year'
)
ON CONFLICT DO NOTHING;
