-- Script to add 30 new students to TechSeed[4] classroom
-- Classroom ID: 473e53e8-a84c-4077-81e4-060dea3fbd50

DO $$
DECLARE
    emails TEXT[] := ARRAY[
        'alice.johnson.ts@techseed.edu', 'bob.smith.ts@techseed.edu', 'carol.davis.ts@techseed.edu', 'david.wilson.ts@techseed.edu', 'emma.brown.ts@techseed.edu',
        'frank.miller.ts@techseed.edu', 'grace.garcia.ts@techseed.edu', 'henry.martinez.ts@techseed.edu', 'isabella.rodriguez.ts@techseed.edu', 'jack.thompson.ts@techseed.edu',
        'kate.anderson.ts@techseed.edu', 'liam.thomas.ts@techseed.edu', 'maya.jackson.ts@techseed.edu', 'noah.white.ts@techseed.edu', 'olivia.harris.ts@techseed.edu',
        'peter.martin.ts@techseed.edu', 'quinn.lee.ts@techseed.edu', 'ruby.clark.ts@techseed.edu', 'sam.lewis.ts@techseed.edu', 'tina.walker.ts@techseed.edu',
        'uma.hall.ts@techseed.edu', 'victor.allen.ts@techseed.edu', 'wendy.young.ts@techseed.edu', 'xavier.king.ts@techseed.edu', 'yara.wright.ts@techseed.edu',
        'zoe.lopez.ts@techseed.edu', 'aaron.hill.ts@techseed.edu', 'bella.green.ts@techseed.edu', 'carlos.adams.ts@techseed.edu', 'diana.baker.ts@techseed.edu'
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
        
        -- Create user in auth.users table (this should auto-create profile via trigger)
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
        
        -- Update the profile with full name (profile should be auto-created by trigger)
        UPDATE public.profiles 
        SET full_name = full_names[i]
        WHERE id = student_id;
        
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