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

async function runMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error('Please provide a migration file path');
        process.exit(1);
    }

    try {
        await client.connect();
        console.log('Connected to database.');

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log('Applying migration:', migrationFile);
        await client.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
