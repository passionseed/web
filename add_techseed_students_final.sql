-- Script to add 30 new students to TechSeed[4] classroom
-- Classroom ID: 473e53e8-a84c-4077-81e4-060dea3fbd50

DO $$
DECLARE
    usernames TEXT[] := ARRAY[
        'alice_johnson_ts', 'bob_smith_ts', 'carol_davis_ts', 'david_wilson_ts', 'emma_brown_ts',
        'frank_miller_ts', 'grace_garcia_ts', 'henry_martinez_ts', 'isabella_rodriguez_ts', 'jack_thompson_ts',
        'kate_anderson_ts', 'liam_thomas_ts', 'maya_jackson_ts', 'noah_white_ts', 'olivia_harris_ts',
        'peter_martin_ts', 'quinn_lee_ts', 'ruby_clark_ts', 'sam_lewis_ts', 'tina_walker_ts',
        'uma_hall_ts', 'victor_allen_ts', 'wendy_young_ts', 'xavier_king_ts', 'yara_wright_ts',
        'zoe_lopez_ts', 'aaron_hill_ts', 'bella_green_ts', 'carlos_adams_ts', 'diana_baker_ts'
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
    student_id UUID;
    i INTEGER;
BEGIN
    FOR i IN 1..30 LOOP
        -- Generate a new UUID for each student
        student_id := gen_random_uuid();
        
        -- Create user in auth.users table first
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
            student_id,
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
            student_id,
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
            student_id,
            'student',
            now(),
            now()
        );
        
        RAISE NOTICE 'Added student % (%)', full_names[i], emails[i];
    END LOOP;
    
    RAISE NOTICE 'Successfully added 30 students to TechSeed[4] classroom';
END $$;