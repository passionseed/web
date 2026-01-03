const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function checkClaimedNode() {
    // Get the claimed node details
    const { data: node, error } = await supabase
        .from('map_nodes')
        .select('*')
        .eq('id', 'e64f94f6-f410-4307-b55a-e2b6e0cea95b')
        .single();

    if (error) {
        console.log('Error fetching node:', error.message);
    } else {
        console.log('Claimed node details:');
        console.log('ID:', node.id);
        console.log('Title:', node.node_title);
        console.log('Team Group ID:', node.team_group_id);
        console.log('Team Role Name:', node.team_role_name);
        console.log('Map ID:', node.map_id);
    }

    // Get the room's map
    const { data: room } = await supabase
        .from('seed_rooms')
        .select('*, seed:seeds(map_id)')
        .eq('join_code', 'BHKW82')
        .single();

    console.log('\nRoom seed map_id:', room?.seed?.map_id);

    // Check if the node belongs to this map
    if (node && room?.seed?.map_id) {
        console.log('Node belongs to room map:', node.map_id === room.seed.map_id);
    }
}

checkClaimedNode();
