const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL ||
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const client = new Client({
    connectionString,
    ssl: false
});

async function checkSeeds() {
    try {
        await client.connect();
        console.log('Connected to database.\n');

        const result = await client.query(`
            SELECT 
                id, 
                title, 
                cover_image_url, 
                cover_image_blurhash,
                cover_image_key
            FROM seeds 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        console.log('Recent seeds:');
        console.log('='.repeat(80));
        result.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.title}`);
            console.log(`   ID: ${row.id}`);
            console.log(`   Cover URL: ${row.cover_image_url || '(none)'}`);
            console.log(`   Blurhash: ${row.cover_image_blurhash || '(none)'}`);
            console.log(`   Image Key: ${row.cover_image_key || '(none)'}`);
        });
        console.log('\n' + '='.repeat(80));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkSeeds();
