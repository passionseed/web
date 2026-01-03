const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('No service key found');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function applyMigration() {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251218000001_team_role_image.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');

    // Split by semicolon to simplisticly handle multiple statements if any, though this file has one
    // But postgres driver usually handles it. Supabase-js RPC might not if we use raw sql func?
    // We don't have a raw sql function exposed usually unless we made one.
    // We can use the pg client directly if needed, but let's try the psql method via connection string if we had it, or just use the common pattern in this project.
    // Checking previous scripts... apply-migration.js uses 'pg'.

    const { Client } = require('pg');
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL; // Assuming one of these exists for direct connection

    // If no direct connection string, we might struggle. 
    // Let's check if we can use the `postgres` package or similar.
    // Actually, I'll use the existing `apply-migration.js` logic as a template if possible, or just copy it.

    // Let's assume standard postgres connection string format: postgres://postgres:postgres@127.0.0.1:54322/postgres
    // For local dev it's usually 54322.

    const client = new Client({
        connectionString: connectionString || 'postgres://postgres:postgres@127.0.0.1:54322/postgres',
    });

    try {
        await client.connect();
        await client.query(sql);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
