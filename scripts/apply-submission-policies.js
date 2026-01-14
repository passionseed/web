const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Try to find a connection string, or default to local Supabase
const connectionString = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

console.log('Using connection string:', connectionString.replace(/:[^:@]*@/, ':****@'));

const client = new Client({
    connectionString,
    ssl: false
});

async function applyMigration() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20260113000001_fix_submission_policies.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration:', migrationPath);
        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
