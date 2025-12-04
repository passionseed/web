const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRoomFetch() {
    const code = '3TBYL7'; // Use one of the codes from the previous check

    console.log('Testing room fetch with code:', code);
    const { data: room, error } = await supabase
        .from('seed_rooms')
        .select('*, seed:seeds(*)')
        .eq('join_code', code)
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Room:', room);
    }
}

testRoomFetch();
