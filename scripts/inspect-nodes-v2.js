const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Service Key Exists?', !!serviceKey);
console.log('Service Key starts with:', serviceKey ? serviceKey.substring(0, 5) + '...' : 'N/A');

if (!serviceKey) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function inspectSchema() {
    console.log('Inspecting map_nodes...');
    const { data: nodes, error: nodesError } = await supabase.from('map_nodes').select('*').limit(1);
    if (nodesError) console.error('Nodes Error:', nodesError);
    else console.log('map_nodes columns:', nodes && nodes.length > 0 ? Object.keys(nodes[0]) : 'Empty table');

    console.log('\nInspecting student_node_progress...');
    const { data: progress, error: progError } = await supabase.from('student_node_progress').select('*').limit(1);
    if (progError) console.error('Progress Error:', progError);
    else console.log('student_node_progress columns:', progress && progress.length > 0 ? Object.keys(progress[0]) : 'Empty table');

    // Check if progress has explicit room_id or links via user/nodes
    if (progress && progress.length > 0) {
        console.log('Sample progress:', progress[0]);
    }
}

inspectSchema();
