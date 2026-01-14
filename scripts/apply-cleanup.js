const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
    connectionString,
    ssl: false
});

async function applyMigration() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const migrationFile = path.join(__dirname, '../supabase/migrations/20260113000003_cleanup_policies.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Applying migration cleanup...');
        await client.query(sql);
        console.log('Migration applied successfully.');

    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
