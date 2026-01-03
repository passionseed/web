const { createClient } = require('@supabase/supabase-js');
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

async function checkTable() {
    // Check if table exists
    const { data, error } = await supabase
        .from('team_node_claims')
        .select('*')
        .limit(1);

    if (error) {
        console.log('Error accessing team_node_claims:', error.message);
        console.log('Error code:', error.code);
        console.log('Error details:', error.details);
    } else {
        console.log('Table exists and is accessible');
        console.log('Sample data:', data);
    }
}

checkTable();
