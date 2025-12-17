const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const HOST_ID = '3f34e6f1-9f3f-494f-9ae6-bb82dbf30c3d'; // From logs

async function debugGradingFilter() {
    console.log('Searching for rooms hosted by:', HOST_ID);

    // 1. Find rooms hosted by this user
    const { data: rooms, error: roomsError } = await supabase
        .from('seed_rooms')
        .select('id, join_code, host_id, mentor_id')
        .eq('host_id', HOST_ID);

    if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
        return;
    }

    console.log(`Found ${rooms.length} rooms hosted by user.`);

    for (const room of rooms) {
        console.log(`\nChecking Room: ${room.join_code} (${room.id})`);

        const mentorIds = [room.host_id, room.mentor_id].filter(Boolean);
        console.log('Mentor IDs:', mentorIds);

        // 2. Get members
        const { data: members, error: membersError } = await supabase
            .from('seed_room_members')
            .select('user_id')
            .eq('room_id', room.id);

        if (membersError) {
            console.error('Error fetching members:', membersError);
            continue;
        }

        const memberIds = members.map(m => m.user_id);
        console.log(`Total Members: ${memberIds.length}`);
        console.log('Member IDs:', memberIds);

        // 3. Apply Filter
        const filteredIds = memberIds.filter(id => !mentorIds.includes(id));
        console.log(`Filtered IDs (Students): ${filteredIds.length}`);
        console.log('Filtered IDs:', filteredIds);

        if (memberIds.length > 0 && filteredIds.length === 0) {
            console.log('⚠️ ALERT: All members were filtered out!');
        } else if (memberIds.length > filteredIds.length) {
            console.log('✅ Filter working: Removed some members (mentors).');
        } else {
            console.log('ℹ️ No mentors found in member list (or filtering failed).');
        }
    }
}

debugGradingFilter();
