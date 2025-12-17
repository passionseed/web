const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const ROOM_CODE = 'BRE2N7';

async function debugProfiles() {
    console.log(`Debugging Room: ${ROOM_CODE}`);

    // 1. Get Room Info
    const { data: room, error: roomError } = await supabase
        .from('seed_rooms')
        .select('id, host_id, mentor_id')
        .eq('join_code', ROOM_CODE)
        .single();

    if (roomError) { console.error(roomError); return; }
    console.log('Room ID:', room.id);
    console.log('Host ID:', room.host_id);
    console.log('Mentor ID:', room.mentor_id);

    // 2. Get Members
    const { data: members, error: membersError } = await supabase
        .from('seed_room_members')
        .select('user_id')
        .eq('room_id', room.id);

    const memberIds = members.map(m => m.user_id);
    console.log('Member IDs:', memberIds);

    // 3. Get Profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', memberIds);

    console.log('\n--- ID to Name Mapping ---');
    profiles.forEach(p => {
        let roles = [];
        if (p.id === room.host_id) roles.push('HOST');
        if (p.id === room.mentor_id) roles.push('MENTOR');
        console.log(`${p.full_name} (${p.email})`);
        console.log(`  ID: ${p.id}`);
        console.log(`  Roles: ${roles.join(', ') || 'Student'}`);
        console.log('---');
    });

}

debugProfiles();
