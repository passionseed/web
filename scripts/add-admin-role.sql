-- Add admin role to your user
-- Replace 'YOUR_EMAIL' with your actual email address

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'YOUR_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;

-- Or if you know your user ID, use this:
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('44d83ce5-f364-4dc0-9d9d-160d40e46a7a', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
