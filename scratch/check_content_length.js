const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContent() {
  const { data: cycles } = await supabase
    .from('hackathon_phase3_cycles')
    .select('id, team_id, hypothesis_full, synthesis_result, ai_score, mentor_score, hackathon_teams(name)')
    .is('ai_score', null)
    .is('mentor_score', null);

  console.log(`Checking ${cycles?.length || 0} ungraded cycles for content length...`);
  
  if (!cycles) return;

  cycles.forEach(c => {
    const hLen = (c.hypothesis_full || "").trim().length;
    const sLen = (c.synthesis_result || "").trim().length;
    console.log(`Team: ${c.hackathon_teams?.name}, HypoLen: ${hLen}, SynthLen: ${sLen}, OK: ${hLen >= 20 || sLen >= 20}`);
  });
}

checkContent();
