const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function checkClaim() {
    const roomId = 'ac886550-bc99-4078-a49e-a43df746884c';
    const nodeId = 'e64f94f6-f410-4307-b55a-e2b6e0cea95b';

    console.log('Checking claim status...');
    console.log('Room ID:', roomId);
    console.log('Node ID:', nodeId);
    console.log('');

    const { data: claims, error } = await supabase
        .from('team_node_claims')
        .select('*')
        .eq('room_id', roomId)
        .eq('node_id', nodeId);

    if (error) {
        console.error('Error:', error);
    } else if (claims && claims.length > 0) {
        console.log('✅ Node IS claimed:');
        claims.forEach(claim => {
            console.log('  - Claim ID:', claim.id);
            console.log('  - User ID:', claim.user_id);
            console.log('  - Claimed at:', claim.claimed_at);
        });
        console.log('');
        console.log('The UI should show this node as CLAIMED, not show the "Claim This Role" button.');
    } else {
        console.log('❌ Node is NOT claimed');
        console.log('The UI should show the "Claim This Role" button.');
    }
}

checkClaim();
