const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecent() {
  const { data, error } = await supabase
    .from('hackathon_phase3_cycles')
    .select('id, team_id, mentor_score, ai_feedback, updated_at, hackathon_teams(name)')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
  } else {
    console.log('Last 10 updated cycles:');
    data.forEach(c => {
      console.log(`Team: ${c.hackathon_teams?.name}, ID: ${c.id}, Score: ${JSON.stringify(c.mentor_score)}, Feedback: ${c.ai_feedback ? 'YES' : 'NO'}, UpdatedAt: ${c.updated_at}`);
    });
  }
}

checkRecent();
