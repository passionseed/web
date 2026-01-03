const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function unclaimNode() {
    const roomId = 'ac886550-bc99-4078-a49e-a43df746884c';
    const nodeId = 'e64f94f6-f410-4307-b55a-e2b6e0cea95b';

    console.log('Unclaiming node...');
    console.log('Room ID:', roomId);
    console.log('Node ID:', nodeId);

    const { data, error } = await supabase
        .from('team_node_claims')
        .delete()
        .eq('room_id', roomId)
        .eq('node_id', nodeId);

    if (error) {
        console.error('Error unclaiming:', error);
    } else {
        console.log('✅ Node unclaimed successfully!');
        console.log('You can now test claiming it again.');
    }
}

unclaimNode();
