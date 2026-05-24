const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMidphase() {
  console.log('Checking all Midphase submissions...');
  const { data, error } = await supabase
    .from('hackathon_phase3_midphase_synthesis')
    .select('id, team_id, status, ai_score, confidence_score, hackathon_teams(name)');

  if (error) {
    console.error(error);
  } else {
    data.forEach(m => {
      console.log(`Team: ${m.hackathon_teams?.name}, Status: ${m.status}, AI Score: ${m.ai_score ? 'YES' : 'NULL'}, Conf Score: ${m.confidence_score}`);
    });
  }
}

checkMidphase();
