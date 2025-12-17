const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMentorStatus() {
    // Get your user (replace with your actual email)
    const userEmail = 'your-email@example.com'; // UPDATE THIS

    const { data: user } = await supabase.auth.admin.listUsers();
    const targetUser = user.users.find(u => u.email === userEmail);

    if (!targetUser) {
        console.log('❌ User not found');
        return;
    }

    console.log('✅ User found:', targetUser.email);
    console.log('User ID:', targetUser.id);

    // Check roles
    const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUser.id);

    console.log('\n📋 Roles:', roles?.map(r => r.role).join(', ') || 'None');

    // Check mentored rooms
    const { data: mentoredRooms } = await supabase
        .from('seed_rooms')
        .select(`
            id,
            join_code,
            status,
            seeds(title)
        `)
        .eq('mentor_id', targetUser.id);

    console.log('\n🎓 Mentored Rooms:', mentoredRooms?.length || 0);
    if (mentoredRooms && mentoredRooms.length > 0) {
        mentoredRooms.forEach(room => {
            console.log(`  - ${room.seeds?.title} (Code: ${room.join_code}, Status: ${room.status})`);
        });
    }
}

checkMentorStatus().then(() => process.exit(0));
