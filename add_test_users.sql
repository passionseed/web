-- Add test users to your local database for group testing
-- This script creates test users and adds them to a classroom

-- First, let's see current classrooms
SELECT id, name, join_code FROM classrooms ORDER BY created_at DESC LIMIT 5;

-- Insert test users into auth.users table (Supabase auth)
-- Note: In a real environment, users would sign up through auth, but for testing we'll create them directly

-- Insert test profiles (these will be our test students)
INSERT INTO profiles (id, username, full_name, email, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice_test', 'Alice Johnson', 'alice@test.com', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'bob_test', 'Bob Smith', 'bob@test.com', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'charlie_test', 'Charlie Brown', 'charlie@test.com', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'diana_test', 'Diana Wilson', 'diana@test.com', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'eve_test', 'Eve Davis', 'eve@test.com', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'frank_test', 'Frank Miller', 'frank@test.com', NOW(), NOW()),
  ('77777777-7777-7777-7777-777777777777', 'grace_test', 'Grace Lee', 'grace@test.com', NOW(), NOW()),
  ('88888888-8888-8888-8888-888888888888', 'henry_test', 'Henry Garcia', 'henry@test.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Show available classrooms for reference
SELECT 
  id,
  name,
  join_code,
  (SELECT COUNT(*) FROM classroom_memberships WHERE classroom_id = classrooms.id AND role = 'student') as student_count
FROM classrooms 
ORDER BY created_at DESC;

-- Note: You'll need to manually insert these users into a specific classroom
-- Replace 'YOUR_CLASSROOM_ID' with the actual classroom ID from the query above
-- 
-- INSERT INTO classroom_memberships (classroom_id, user_id, role, joined_at) 
-- SELECT 'YOUR_CLASSROOM_ID', id, 'student', NOW() 
-- FROM profiles 
-- WHERE username LIKE '%_test'
-- ON CONFLICT (classroom_id, user_id) DO NOTHING;