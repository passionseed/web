-- Debug migration to check test users and add them properly
BEGIN;

-- Check current state and fix if needed
DO $$
DECLARE
    classroom_uuid UUID;
    test_user_count INTEGER;
    auth_user_count INTEGER;
BEGIN
    -- Check if test users exist in auth.users
    SELECT COUNT(*) INTO auth_user_count 
    FROM auth.users 
    WHERE email LIKE '%@test.com';
    
    -- Check if test users exist in profiles
    SELECT COUNT(*) INTO test_user_count 
    FROM profiles 
    WHERE email LIKE '%@test.com';
    
    RAISE NOTICE 'Auth users with @test.com: %', auth_user_count;
    RAISE NOTICE 'Profile users with @test.com: %', test_user_count;
    
    -- Get the most recent classroom
    SELECT id INTO classroom_uuid 
    FROM classrooms 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RAISE NOTICE 'Adding test users to classroom: %', classroom_uuid;
    
    -- If users exist but not in classroom, add them
    IF test_user_count = 0 AND auth_user_count = 0 THEN
        RAISE NOTICE 'Creating test users...';
        
        -- Create auth users if they don't exist
        INSERT INTO auth.users (
            id, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            created_at, 
            updated_at, 
            raw_app_meta_data, 
            raw_user_meta_data,
            aud,
            role
        ) VALUES
            ('11111111-1111-1111-1111-111111111111', 'alice@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Johnson"}', 'authenticated', 'authenticated'),
            ('22222222-2222-2222-2222-222222222222', 'bob@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Smith"}', 'authenticated', 'authenticated'),
            ('33333333-3333-3333-3333-333333333333', 'charlie@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Charlie Brown"}', 'authenticated', 'authenticated'),
            ('44444444-4444-4444-4444-444444444444', 'diana@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diana Wilson"}', 'authenticated', 'authenticated'),
            ('55555555-5555-5555-5555-555555555555', 'eve@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eve Davis"}', 'authenticated', 'authenticated'),
            ('66666666-6666-6666-6666-666666666666', 'frank@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Frank Miller"}', 'authenticated', 'authenticated'),
            ('77777777-7777-7777-7777-777777777777', 'grace@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Grace Lee"}', 'authenticated', 'authenticated'),
            ('88888888-8888-8888-8888-888888888888', 'henry@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Henry Garcia"}', 'authenticated', 'authenticated')
        ON CONFLICT (id) DO NOTHING;
        
        -- Create profiles
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
    END IF;
    
    -- Always try to add test users to the classroom (will be ignored if already exists)
    IF classroom_uuid IS NOT NULL THEN
        INSERT INTO classroom_memberships (classroom_id, user_id, role, joined_at) 
        SELECT 
            classroom_uuid, 
            p.id, 
            'student', 
            NOW() 
        FROM profiles p
        WHERE p.email LIKE '%@test.com'
        ON CONFLICT (classroom_id, user_id) DO NOTHING;
        
        -- Report final counts
        SELECT COUNT(*) INTO test_user_count 
        FROM classroom_memberships cm
        JOIN profiles p ON cm.user_id = p.id
        WHERE p.email LIKE '%@test.com'
        AND cm.classroom_id = classroom_uuid;
        
        RAISE NOTICE 'Test users now in classroom: %', test_user_count;
    END IF;
END $$;

COMMIT;