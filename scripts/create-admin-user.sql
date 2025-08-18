-- Script to create a demo admin user for testing
-- Run this in Supabase SQL Editor

-- First, you need to create a user through the normal signup process
-- Then run this script to give them admin privileges

-- Replace 'your-user-id-here' with the actual user ID from auth.users
-- You can find this by going to Authentication > Users in Supabase dashboard

-- Example: INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'admin');

-- To create an admin user:
-- 1. Sign up a new user through your app's normal signup flow
-- 2. Get their user ID from the auth.users table or Supabase dashboard
-- 3. Run this query with their actual user ID:

INSERT INTO public.user_roles (user_id, role) 
VALUES ('YOUR_USER_ID_HERE', 'admin');

-- Optional: Also give them other roles for testing
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('YOUR_USER_ID_HERE', 'instructor');

-- To verify the admin user was created:
-- SELECT 
--   u.email,
--   ur.role
-- FROM auth.users u
-- JOIN public.user_roles ur ON u.id = ur.user_id
-- WHERE ur.role = 'admin';

-- To remove admin role (if needed):
-- DELETE FROM public.user_roles 
-- WHERE user_id = 'YOUR_USER_ID_HERE' AND role = 'admin';