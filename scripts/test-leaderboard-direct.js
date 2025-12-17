const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLeaderboardFunction() {
    console.log('Testing leaderboard function directly...\n');

    // Use a test UUID - update this with a real room_id from your database
    const testRoomId = process.argv[2];

    if (!testRoomId) {
        console.log('Usage: node test-leaderboard-direct.js <room_id>');
        console.log('Example: node test-leaderboard-direct.js 123e4567-e89b-12d3-a456-426614174000');
        return;
    }

    console.log('Testing with room ID:', testRoomId);
    console.log('');

    // Test the RPC call
    const { data, error } = await supabase.rpc('get_seed_room_leaderboard', {
        p_room_id: testRoomId,
        p_limit: 10
    });

    console.log('RPC Result:');
    console.log('- Data:', JSON.stringify(data, null, 2));
    console.log('- Error:', error);

    if (error) {
        console.log('\nError details:');
        console.log('- Message:', error.message);
        console.log('- Details:', error.details);
        console.log('- Hint:', error.hint);
        console.log('- Code:', error.code);
    } else {
        console.log('\n✅ Success! Function is working correctly.');
        if (data && data.length > 0) {
            console.log(`Found ${data.length} entries in leaderboard`);
        } else {
            console.log('No leaderboard entries (this is OK if no one has completed and been graded)');
        }
    }
}

testLeaderboardFunction()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
    });
