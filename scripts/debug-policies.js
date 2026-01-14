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

        const tables = ['classroom_memberships', 'profiles', 'user_roles', 'assessment_submissions'];

        for (const table of tables) {
            console.log(`\n\n=== Policies on ${table} ===`);
            const res = await client.query(`
                SELECT polname, polcmd, polqual, polwithcheck
                FROM pg_policy 
                JOIN pg_class ON pg_policy.polrelid = pg_class.oid 
                WHERE pg_class.relname = $1
            `, [table]);

            res.rows.forEach(row => {
                console.log(`\nName: ${row.polname} (Cmd: ${row.polcmd})`);
                console.log(`USING: ${row.polqual}`);
                console.log(`CHECK: ${row.polwithcheck}`);
            });
            if (res.rows.length === 0) console.log("No policies found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listPolicies();
