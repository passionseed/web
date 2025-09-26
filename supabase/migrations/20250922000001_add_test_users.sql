-- Add test users for group testing
-- This migration adds test users and enrolls them in the most recent classroom

BEGIN;

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- First, insert into auth.users table (required for foreign key constraint)
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password, 
  created_at, 
  updated_at, 
  raw_app_meta_data, 
  raw_user_meta_data,
  aud,
  role
) VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Johnson"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Smith"}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'charlie@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Charlie Brown"}', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'diana@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diana Wilson"}', 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'eve@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eve Davis"}', 'authenticated', 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'frank@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Frank Miller"}', 'authenticated', 'authenticated'),
  ('77777777-7777-7777-7777-777777777777', 'grace@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Grace Lee"}', 'authenticated', 'authenticated'),
  ('88888888-8888-8888-8888-888888888888', 'henry@test.com', '$2a$10$dummypasswordhash.encrypted.password.123456789abcdef', NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Henry Garcia"}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Then insert test profiles (these will be our test students)
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

-- Add all test users to the most recent classroom as students
-- This gets the most recently created classroom and adds all test users to it
WITH latest_classroom AS (
  SELECT id FROM classrooms ORDER BY created_at DESC LIMIT 1
)
INSERT INTO classroom_memberships (classroom_id, user_id, role, joined_at) 
SELECT 
  (SELECT id FROM latest_classroom), 
  p.id, 
  'student', 
  NOW() 
FROM profiles p
WHERE p.username LIKE '%_test'
ON CONFLICT (classroom_id, user_id) DO NOTHING;

-- Display the results
SELECT 
  c.name as classroom_name,
  c.join_code,
  COUNT(cm.user_id) as total_students
FROM classrooms c
JOIN classroom_memberships cm ON c.id = cm.classroom_id
WHERE cm.role = 'student'
GROUP BY c.id, c.name, c.join_code
ORDER BY c.created_at DESC;

COMMIT;