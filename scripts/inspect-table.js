const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service key to bypass RLS for schema inspection
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function inspectTable() {
    console.log('Inspecting seed_room_members table...');

    // Get one row to see columns
    const { data, error } = await supabase
        .from('seed_room_members')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found based on data:', Object.keys(data[0]));
        console.log('Sample row:', data[0]);
    } else {
        console.log('Table is empty, cannot infer columns from data.');
        // Fallback: Try to verify if 'role' column exists by selecting it specifically
        const { error: roleError } = await supabase
            .from('seed_room_members')
            .select('role')
            .limit(1);

        if (!roleError) {
            console.log('✅ "role" column confirmed to exist.');
        } else {
            console.log('❌ "role" column likely missing or not accessible.');
            console.error(roleError);
        }
    }
}

inspectTable();
