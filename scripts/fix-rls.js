const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
    connectionString,
    ssl: false
});

async function fixRLS() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // Drop existing policies
        console.log('Dropping old policies...');
        await client.query(`DROP POLICY IF EXISTS "Seed rooms are viewable by authenticated users" ON seed_rooms;`);
        await client.query(`DROP POLICY IF EXISTS "Seed rooms are insertable by authenticated users" ON seed_rooms;`);
        await client.query(`DROP POLICY IF EXISTS "Seed room members are viewable by authenticated users" ON seed_room_members;`);
        await client.query(`DROP POLICY IF EXISTS "Seed room members are insertable by authenticated users" ON seed_room_members;`);

        // Create new policies with auth.uid() IS NOT NULL
        console.log('Creating new policies...');

        await client.query(`
      CREATE POLICY "Seed rooms are viewable by authenticated users" 
        ON seed_rooms FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    `);

        await client.query(`
      CREATE POLICY "Seed rooms are insertable by authenticated users" 
        ON seed_rooms FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL);
    `);

        await client.query(`
      CREATE POLICY "Seed room members are viewable by authenticated users" 
        ON seed_room_members FOR SELECT 
        USING (auth.uid() IS NOT NULL);
    `);

        await client.query(`
      CREATE POLICY "Seed room members are insertable by authenticated users" 
        ON seed_room_members FOR INSERT 
        WITH CHECK (auth.uid() IS NOT NULL);
    `);

        console.log('Policies updated successfully!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixRLS();
