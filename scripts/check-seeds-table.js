const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking seeds table...');
    const { data, error } = await supabase.from('seeds').select('*').limit(1);

    if (error) {
        console.error('Error querying seeds table:', error);
        process.exit(1);
    } else {
        console.log('Seeds table exists.');
    }
}

checkTable();
