const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
    connectionString,
    ssl: false
});

async function applyMigration() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20251217000001_team_node_assignments.sql');
        console.log(`Reading migration file: ${migrationPath}`);

        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log('Migration content loaded. Executing...');

        await client.query(sql);

        console.log('✅ Migration applied successfully!');

    } catch (err) {
        console.error('❌ Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
