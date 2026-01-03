require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkActiveProgress() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for 'in_progress' nodes...");

    const { data: progress, error } = await supabase
        .from("student_node_progress")
        .select(`
            id,
            user_id,
            node_id,
            status
        `)
        .eq("status", "in_progress")
        .limit(10);

    if (error) {
        console.error("Error fetching progress:", error);
    } else {
        console.log(`Found ${progress.length} active progress records.`);
        progress.forEach(p => {
            console.log(`- User ${p.user_id} on Node ${p.node_id} (Updated: ${p.updated_at})`);
        });
    }

    // Also check seed_room_members to ensure users are in rooms
    if (progress.length > 0) {
        const userIds = progress.map(p => p.user_id);
        const { data: members, error: memberError } = await supabase
            .from("seed_room_members")
            .select("room_id, user_id")
            .in("user_id", userIds);

        if (memberError) console.error("Error checking room members:", memberError);
        else {
            console.log("Found matching room members:", members);
        }
    }
}

checkActiveProgress();
