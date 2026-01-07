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

async function checkFocusSessions() {
    try {
        await client.connect();
        console.log('Connected to database.\n');

        const result = await client.query(`
            SELECT 
                ps_focus_sessions.user_id,
                profiles.username,
                profiles.full_name,
                COUNT(*) as session_count,
                SUM(duration_minutes) as total_minutes
            FROM ps_focus_sessions
            LEFT JOIN profiles ON ps_focus_sessions.user_id = profiles.id
            WHERE ps_focus_sessions.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY ps_focus_sessions.user_id, profiles.username, profiles.full_name
            ORDER BY total_minutes DESC
            LIMIT 10
        `);

        console.log('Focus Sessions (Last 7 Days):');
        console.log('='.repeat(80));
        result.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. ${row.full_name || row.username || row.user_id}`);
            console.log(`   Sessions: ${row.session_count}`);
            console.log(`   Total Minutes: ${row.total_minutes}`);
        });
        console.log('\n' + '='.repeat(80));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkFocusSessions();
