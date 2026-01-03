const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function inspectSchema() {
    console.log('Inspecting map_nodes...');
    const { data: nodes, error: nodesError } = await supabase.from('map_nodes').select('*').limit(1);
    if (nodesError) console.error(nodesError);
    else console.log('map_nodes columns:', nodes && nodes.length > 0 ? Object.keys(nodes[0]) : 'Empty table');

    console.log('\nInspecting node_assessments...');
    const { data: assessments, error: assError } = await supabase.from('node_assessments').select('*').limit(1);
    if (assError) console.error(assError);
    else console.log('node_assessments columns:', assessments && assessments.length > 0 ? Object.keys(assessments[0]) : 'Empty table');

    console.log('\nInspecting student_node_progress...');
    const { data: progress, error: progError } = await supabase.from('student_node_progress').select('*').limit(1);
    if (progError) console.error(progError);
    else console.log('student_node_progress columns:', progress && progress.length > 0 ? Object.keys(progress[0]) : 'Empty table');
}

inspectSchema();
