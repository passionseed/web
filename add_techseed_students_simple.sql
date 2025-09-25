-- Script to add 30 new students to TechSeed[4] classroom
-- Classroom ID: 473e53e8-a84c-4077-81e4-060dea3fbd50

-- First, let's create variables for UUIDs (PostgreSQL approach)
DO $$
DECLARE
    student_ids UUID[] := ARRAY[
        'aaaaaaaa-0001-0001-0001-000000000001'::UUID,
        'aaaaaaaa-0002-0002-0002-000000000002'::UUID,
        'aaaaaaaa-0003-0003-0003-000000000003'::UUID,
        'aaaaaaaa-0004-0004-0004-000000000004'::UUID,
        'aaaaaaaa-0005-0005-0005-000000000005'::UUID,
        'aaaaaaaa-0006-0006-0006-000000000006'::UUID,
        'aaaaaaaa-0007-0007-0007-000000000007'::UUID,
        'aaaaaaaa-0008-0008-0008-000000000008'::UUID,
        'aaaaaaaa-0009-0009-0009-000000000009'::UUID,
        'aaaaaaaa-0010-0010-0010-000000000010'::UUID,
        'aaaaaaaa-0011-0011-0011-000000000011'::UUID,
        'aaaaaaaa-0012-0012-0012-000000000012'::UUID,
        'aaaaaaaa-0013-0013-0013-000000000013'::UUID,
        'aaaaaaaa-0014-0014-0014-000000000014'::UUID,
        'aaaaaaaa-0015-0015-0015-000000000015'::UUID,
        'aaaaaaaa-0016-0016-0016-000000000016'::UUID,
        'aaaaaaaa-0017-0017-0017-000000000017'::UUID,
        'aaaaaaaa-0018-0018-0018-000000000018'::UUID,
        'aaaaaaaa-0019-0019-0019-000000000019'::UUID,
        'aaaaaaaa-0020-0020-0020-000000000020'::UUID,
        'aaaaaaaa-0021-0021-0021-000000000021'::UUID,
        'aaaaaaaa-0022-0022-0022-000000000022'::UUID,
        'aaaaaaaa-0023-0023-0023-000000000023'::UUID,
        'aaaaaaaa-0024-0024-0024-000000000024'::UUID,
        'aaaaaaaa-0025-0025-0025-000000000025'::UUID,
        'aaaaaaaa-0026-0026-0026-000000000026'::UUID,
        'aaaaaaaa-0027-0027-0027-000000000027'::UUID,
        'aaaaaaaa-0028-0028-0028-000000000028'::UUID,
        'aaaaaaaa-0029-0029-0029-000000000029'::UUID,
        'aaaaaaaa-0030-0030-0030-000000000030'::UUID
    ];
    usernames TEXT[] := ARRAY[
        'alice_johnson', 'bob_smith', 'carol_davis', 'david_wilson', 'emma_brown',
        'frank_miller', 'grace_garcia', 'henry_martinez', 'isabella_rodriguez', 'jack_thompson',
        'kate_anderson', 'liam_thomas', 'maya_jackson', 'noah_white', 'olivia_harris',
        'peter_martin', 'quinn_lee', 'ruby_clark', 'sam_lewis', 'tina_walker',
        'uma_hall', 'victor_allen', 'wendy_young', 'xavier_king', 'yara_wright',
        'zoe_lopez', 'aaron_hill', 'bella_green', 'carlos_adams', 'diana_baker'
    ];
    emails TEXT[] := ARRAY[
        'alice.johnson@techseed.edu', 'bob.smith@techseed.edu', 'carol.davis@techseed.edu', 'david.wilson@techseed.edu', 'emma.brown@techseed.edu',
        'frank.miller@techseed.edu', 'grace.garcia@techseed.edu', 'henry.martinez@techseed.edu', 'isabella.rodriguez@techseed.edu', 'jack.thompson@techseed.edu',
        'kate.anderson@techseed.edu', 'liam.thomas@techseed.edu', 'maya.jackson@techseed.edu', 'noah.white@techseed.edu', 'olivia.harris@techseed.edu',
        'peter.martin@techseed.edu', 'quinn.lee@techseed.edu', 'ruby.clark@techseed.edu', 'sam.lewis@techseed.edu', 'tina.walker@techseed.edu',
        'uma.hall@techseed.edu', 'victor.allen@techseed.edu', 'wendy.young@techseed.edu', 'xavier.king@techseed.edu', 'yara.wright@techseed.edu',
        'zoe.lopez@techseed.edu', 'aaron.hill@techseed.edu', 'bella.green@techseed.edu', 'carlos.adams@techseed.edu', 'diana.baker@techseed.edu'
    ];
    full_names TEXT[] := ARRAY[
        'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Emma Brown',
        'Frank Miller', 'Grace Garcia', 'Henry Martinez', 'Isabella Rodriguez', 'Jack Thompson',
        'Kate Anderson', 'Liam Thomas', 'Maya Jackson', 'Noah White', 'Olivia Harris',
        'Peter Martin', 'Quinn Lee', 'Ruby Clark', 'Sam Lewis', 'Tina Walker',
        'Uma Hall', 'Victor Allen', 'Wendy Young', 'Xavier King', 'Yara Wright',
        'Zoe Lopez', 'Aaron Hill', 'Bella Green', 'Carlos Adams', 'Diana Baker'
    ];
    classroom_id UUID := '473e53e8-a84c-4077-81e4-060dea3fbd50';
    i INTEGER;
BEGIN
    -- Create users in auth.users table first
    FOR i IN 1..30 LOOP
        INSERT INTO auth.users (
            id, 
            instance_id, 
            aud, 
            role, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            created_at, 
            updated_at, 
            confirmation_token, 
            recovery_token, 
            email_change_token_new, 
            email_change_token_current
        ) VALUES (
            student_ids[i],
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            emails[i],
            crypt('techseed123', gen_salt('bf')), -- default password
            now(),
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
        
        -- Create profile
        INSERT INTO public.profiles (
            id, 
            username, 
            email, 
            full_name, 
            created_at, 
            updated_at
        ) VALUES (
            student_ids[i],
            usernames[i],
            emails[i],
            full_names[i],
            now(),
            now()
        );
        
        -- Add to classroom
        INSERT INTO public.classroom_memberships (
            id, 
            classroom_id, 
            user_id, 
            role, 
            joined_at, 
            last_active_at
        ) VALUES (
            gen_random_uuid(),
            classroom_id,
            student_ids[i],
            'student',
            now(),
            now()
        );
    END LOOP;
    
    RAISE NOTICE 'Successfully added 30 students to TechSeed[4] classroom';
END $$;