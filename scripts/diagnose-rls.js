#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
    console.log('🔍 Diagnosing RLS Policy Issues...\n');

    const client = new Client({
        host: '127.0.0.1',
        port: 54322,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres',
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        const groupId = '9dea4c49-8c36-4eb1-9ad0-b3bfd61764c2';
        const userId = 'f608e82f-0528-4453-b0e3-58db651e526d';
        const roomId = '5d420abd-d2bb-4293-bf67-65c048994f27';

        // 1. Check if the group exists
        console.log('1️⃣ Checking if assessment group exists...');
        const groupResult = await client.query(
            'SELECT * FROM public.assessment_groups WHERE id = $1',
            [groupId]
        );
        console.log('   Result:', groupResult.rows.length > 0 ? groupResult.rows[0] : 'NOT FOUND');
        console.log('');

        // 2. Check if user is in seed room
        console.log('2️⃣ Checking if user is in seed room...');
        const memberResult = await client.query(
            'SELECT * FROM public.seed_room_members WHERE user_id = $1 AND room_id = $2',
            [userId, roomId]
        );
        console.log('   Result:', memberResult.rows.length > 0 ? 'YES' : 'NO');
        if (memberResult.rows.length > 0) {
            console.log('   Member data:', memberResult.rows[0]);
        }
        console.log('');

        // 3. Check the assessment and map details
        console.log('3️⃣ Checking assessment and map details...');
        if (groupResult.rows.length > 0) {
            const assessmentId = groupResult.rows[0].assessment_id;
            const mapResult = await client.query(`
        SELECT 
          na.id as assessment_id,
          mn.id as node_id,
          mn.map_id,
          lm.map_type,
          lm.parent_seed_id
        FROM public.node_assessments na
        JOIN public.map_nodes mn ON na.node_id = mn.id
        JOIN public.learning_maps lm ON mn.map_id = lm.id
        WHERE na.id = $1
      `, [assessmentId]);
            console.log('   Map details:', mapResult.rows[0]);
            console.log('');
        }

        // 4. Check current RLS policies
        console.log('4️⃣ Checking current RLS policies...');
        const policyResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE tablename IN ('assessment_groups', 'assessment_group_members')
      ORDER BY tablename, policyname
    `);
        console.log('   Policies:');
        policyResult.rows.forEach(policy => {
            console.log(`   - ${policy.tablename}.${policy.policyname}`);
            console.log(`     Command: ${policy.cmd}`);
            console.log(`     Using: ${policy.qual?.substring(0, 100)}...`);
        });
        console.log('');

        // 5. Test the RLS policy logic manually
        console.log('5️⃣ Testing RLS policy logic manually...');
        if (groupResult.rows.length > 0) {
            const group = groupResult.rows[0];

            // Test classroom path
            const classroomTest = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM public.node_assessments na
          JOIN public.map_nodes mn ON na.node_id = mn.id
          JOIN public.learning_maps lm ON mn.map_id = lm.id
          JOIN public.classroom_memberships cm ON lm.parent_classroom_id = cm.classroom_id
          WHERE na.id = $1
          AND cm.user_id = $2
          AND lm.map_type = 'classroom_exclusive'
        ) as has_classroom_access
      `, [group.assessment_id, userId]);
            console.log('   Classroom access:', classroomTest.rows[0].has_classroom_access);

            // Test seed room path
            const seedTest = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM public.node_assessments na
          JOIN public.map_nodes mn ON na.node_id = mn.id
          JOIN public.learning_maps lm ON mn.map_id = lm.id
          JOIN public.seed_room_members srm ON srm.room_id = $3
          WHERE na.id = $1
          AND srm.user_id = $2
          AND lm.map_type = 'seed'
          AND $3 IS NOT NULL
        ) as has_seed_access
      `, [group.assessment_id, userId, group.seed_room_id]);
            console.log('   Seed room access:', seedTest.rows[0].has_seed_access);
            console.log('');
        }

        console.log('✅ Diagnostic complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    } finally {
        await client.end();
    }
}

main();
