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

async function testClaim() {
    // Get a test room
    const { data: room } = await supabase
        .from('seed_rooms')
        .select('id, join_code')
        .eq('join_code', 'BHKW82')
        .single();

    if (!room) {
        console.log('Room BHKW82 not found');
        return;
    }

    console.log('Room found:', room);

    // Get a test node with team_group_id
    const { data: nodes } = await supabase
        .from('map_nodes')
        .select('id, node_title, team_group_id, team_role_name')
        .not('team_group_id', 'is', null)
        .limit(5);

    console.log('Team nodes:', nodes);

    // Check existing claims for this room
    const { data: claims } = await supabase
        .from('team_node_claims')
        .select('*')
        .eq('room_id', room.id);

    console.log('Existing claims for room:', claims);
}

testClaim();
