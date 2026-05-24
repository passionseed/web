const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('hackathon_phase3_midphase_synthesis')
    .select('*')
    .limit(1);

  if (error) {
    console.error(error);
  } else {
    console.log('Columns in hackathon_phase3_midphase_synthesis:');
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No data to check columns from.');
      // Try to select a non-existent column to see if it errors
      const { error: e2 } = await supabase.from('hackathon_phase3_midphase_synthesis').select('ai_feedback').limit(1);
      console.log('ai_feedback exists:', !e2);
    }
  }
}

checkColumns();
