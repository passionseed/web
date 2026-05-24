const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.HACKATHON_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGraded() {
  console.log('Checking database for graded teams...');

  // Check Cycles
  const { data: cycles, count: cycleCount, error: cycleError } = await supabase
    .from('hackathon_phase3_cycles')
    .select('id, team_id, ai_score, mentor_score, hackathon_teams(name)', { count: 'exact' })
    .or('ai_score.not.is.null,mentor_score.not.is.null');

  if (cycleError) {
    console.error('Error fetching cycles:', cycleError);
  } else {
    console.log(`\n--- Graded Cycles (${cycleCount}) ---`);
    cycles.forEach(c => {
      console.log(`Team: ${c.hackathon_teams?.name || 'Unknown'}, ID: ${c.id}, AI: ${c.ai_score ? 'Yes' : 'No'}, Mentor: ${c.mentor_score ? 'Yes' : 'No'}`);
    });
  }

  // Check Midphase
  const { data: midphase, count: midphaseCount, error: midphaseError } = await supabase
    .from('hackathon_phase3_midphase_synthesis')
    .select('id, team_id, ai_score, confidence_score, hackathon_teams(name)', { count: 'exact' })
    .or('ai_score.not.is.null,confidence_score.not.is.null');

  if (midphaseError) {
    console.error('Error fetching midphase:', midphaseError);
  } else {
    console.log(`\n--- Graded Midphase (${midphaseCount}) ---`);
    midphase.forEach(m => {
      console.log(`Team: ${m.hackathon_teams?.name || 'Unknown'}, ID: ${m.id}, AI: ${m.ai_score ? 'Yes' : 'No'}, Score: ${m.confidence_score}`);
    });
  }

  // Check Video
  const { data: videos, count: videoCount, error: videoError } = await supabase
    .from('hackathon_phase3_video_submissions')
    .select('id, team_id, judge_scores, ai_scrutinizer_output, hackathon_teams(name)', { count: 'exact' })
    .or('judge_scores.not.is.null,ai_scrutinizer_output.not.is.null');

  if (videoError) {
    console.error('Error fetching videos:', videoError);
  } else {
    console.log(`\n--- Graded Videos (${videoCount}) ---`);
    videos.forEach(v => {
      console.log(`Team: ${v.hackathon_teams?.name || 'Unknown'}, ID: ${v.id}, Judge: ${v.judge_scores ? 'Yes' : 'No'}, AI: ${v.ai_scrutinizer_output ? 'Yes' : 'No'}`);
    });
  }
}

checkGraded();
