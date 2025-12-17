const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLeaderboardFunction() {
    console.log('Testing get_seed_room_leaderboard function...\n');

    // First, let's get a real seed room ID to test with
    const { data: rooms, error: roomsError } = await supabase
        .from('seed_rooms')
        .select('id, seed_id, join_code')
        .limit(1);

    if (roomsError) {
        console.error('Error fetching seed rooms:', roomsError);
        return;
    }

    if (!rooms || rooms.length === 0) {
        console.log('No seed rooms found in database');
        return;
    }

    const testRoomId = rooms[0].id;
    console.log('Testing with room ID:', testRoomId);
    console.log('Room details:', rooms[0]);
    console.log('');

    // Test the RPC call
    const { data, error } = await supabase.rpc('get_seed_room_leaderboard', {
        p_room_id: testRoomId,
        p_limit: 10
    });

    console.log('RPC Result:');
    console.log('- Data:', data);
    console.log('- Error:', error);

    if (error) {
        console.log('\nError details:');
        console.log('- Message:', error.message);
        console.log('- Details:', error.details);
        console.log('- Hint:', error.hint);
        console.log('- Code:', error.code);
    }
}

testLeaderboardFunction()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
