#!/usr/bin/env node

const { Client } = require('pg');

async function main() {
    console.log('🔍 Checking Mentor Status...\n');

    const client = new Client({
        host: '127.0.0.1',
        port: 54322,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres',
    });

    try {
        await client.connect();

        const userId = 'f608e82f-0528-4453-b0e3-58db651e526d';
        const roomId = '5d420abd-d2bb-4293-bf67-65c048994f27';
        const groupId = '9dea4c49-8c36-4eb1-9ad0-b3bfd61764c2';

        // Check if user is the mentor
        console.log('Checking if user is mentor of room...');
        const mentorCheck = await client.query(
            'SELECT * FROM public.seed_rooms WHERE id = $1',
            [roomId]
        );

        if (mentorCheck.rows.length > 0) {
            const room = mentorCheck.rows[0];
            console.log('Room mentor_id:', room.mentor_id);
            console.log('Current user_id:', userId);
            console.log('Is mentor?', room.mentor_id === userId);
            console.log('');
        }

        // Test the mentor access path
        console.log('Testing mentor access via RLS policy...');
        const group = await client.query(
            'SELECT * FROM public.assessment_groups WHERE id = $1',
            [groupId]
        );

        if (group.rows.length > 0) {
            const assessmentId = group.rows[0].assessment_id;

            const mentorAccessTest = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM public.node_assessments na
          JOIN public.map_nodes mn ON na.node_id = mn.id
          JOIN public.learning_maps lm ON mn.map_id = lm.id
          JOIN public.seed_rooms sr ON sr.id = $3
          WHERE na.id = $1
          AND sr.mentor_id = $2
          AND lm.map_type = 'seed'
          AND $3 IS NOT NULL
        ) as has_mentor_access
      `, [assessmentId, userId, group.rows[0].seed_room_id]);

            console.log('Mentor access check:', mentorAccessTest.rows[0].has_mentor_access);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

main();
