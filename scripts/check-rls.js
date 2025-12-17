const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
    connectionString,
    ssl: false
});

async function checkRLS() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Check if RLS is enabled
        const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('seeds', 'seed_rooms', 'seed_room_members');
    `);

        console.log('RLS Status:', rlsCheck.rows);

        // Check policies
        const policiesCheck = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename IN ('seeds', 'seed_rooms', 'seed_room_members')
      ORDER BY tablename, policyname;
    `);

        console.log('\nPolicies:');
        policiesCheck.rows.forEach(row => {
            console.log(`\nTable: ${row.tablename}`);
            console.log(`  Policy: ${row.policyname}`);
            console.log(`  Command: ${row.cmd}`);
            console.log(`  Using: ${row.qual}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkRLS();
