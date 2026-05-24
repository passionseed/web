const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
  const { count: cycleCount } = await supabase.from('hackathon_phase3_cycles').select('*', { count: 'exact', head: true });
  const { count: midphaseCount } = await supabase.from('hackathon_phase3_midphase_synthesis').select('*', { count: 'exact', head: true });
  const { count: videoCount } = await supabase.from('hackathon_phase3_video_submissions').select('*', { count: 'exact', head: true });

  console.log(`Total Cycles: ${cycleCount}`);
  console.log(`Total Midphase: ${midphaseCount}`);
  console.log(`Total Videos: ${videoCount}`);
  
  const { data: gradedCycles } = await supabase.from('hackathon_phase3_cycles').select('id').or('ai_score.not.is.null,mentor_score.not.is.null');
  console.log(`Graded Cycles: ${gradedCycles?.length || 0}`);
}

checkAll();
