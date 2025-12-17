const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRooms() {
    console.log('Checking seed_rooms table...');
    const { data, error } = await supabase.from('seed_rooms').select('*');

    if (error) {
        console.error('Error querying seed_rooms table:', error);
    } else {
        console.log('Seed Rooms:', data);
        console.log('Count:', data.length);
    }
}

checkRooms();
