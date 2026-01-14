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

async function listPolicies() {
    try {
        await client.connect();

        const tables = ['classroom_memberships', 'profiles'];

        for (const table of tables) {
            console.log(`\n=== Policies on ${table} ===`);
            const res = await client.query(`
                SELECT polname
                FROM pg_policy 
                JOIN pg_class ON pg_policy.polrelid = pg_class.oid 
                WHERE pg_class.relname = $1
            `, [table]);

            if (res.rows.length === 0) {
                console.log("No policies found.");
            } else {
                res.rows.forEach(row => {
                    console.log(`- ${row.polname}`);
                });
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listPolicies();
