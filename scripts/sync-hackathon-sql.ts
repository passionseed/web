// Direct SQL batch execution for hackathon data sync
// Run with: npx tsx scripts/sync-hackathon-sql.ts

import { createClient } from '@supabase/supabase-js';

const HACKATHON_URL = process.env.HACKATHON_SUPABASE_URL || 'https://mpmkbtsjtfhqvynijqzl.supabase.co';
const HACKATHON_KEY = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY;
const MAIN_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixvgihxcvutftpbgjzjd.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sync() {
  if (!HACKATHON_KEY || !MAIN_KEY) {
    console.error('Missing service role keys');
    process.exit(1);
  }

  const hackathonDb = createClient(HACKATHON_URL, HACKATHON_KEY);

  console.log('Fetching hackathon participants...');
  const { data: participants, error } = await hackathonDb
    .from('hackathon_participants')
    .select('id, track, university, grade_level, referral_source, created_at');

  if (error || !participants) {
    console.error('Failed to fetch participants:', error);
    process.exit(1);
  }

  console.log(`Found ${participants.length} participants`);

  // Process in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < participants.length; i += batchSize) {
    const batch = participants.slice(i, i + batchSize);

    // Build VALUES clause for funnel_events
    const funnelValues = batch.map(p => {
      const metadata = JSON.stringify({
        track: p.track || '',
        university: p.university || '',
        grade_level: p.grade_level || '',
        source: p.referral_source || ''
      }).replace(/'/g, "''");

      return `('${p.id}', 'hackathon_signup', '${p.created_at}', '${metadata}'::jsonb)`;
    }).join(',\n');

    const funnelSql = `INSERT INTO funnel_events (user_id, event_name, event_timestamp, metadata) VALUES ${funnelValues} ON CONFLICT DO NOTHING;`;

    try {
      const response = await fetch(`${MAIN_URL}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'apikey': MAIN_KEY,
          'Authorization': `Bearer ${MAIN_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: funnelSql }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Batch ${i}-${i + batch.length} failed:`, errorText);
        failed += batch.length;
      } else {
        console.log(`Inserted funnel_events batch ${i}-${i + batch.length} ✓`);
        inserted += batch.length;
      }
    } catch (e) {
      console.error(`Batch ${i}-${i + batch.length} error:`, e);
      failed += batch.length;
    }

    // Also insert cohort_assignments
    const cohortValues = batch.map(p => {
      const date = new Date(p.created_at);
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const cohortDate = new Date(date.setDate(diff));
      return `('${p.id}', '${cohortDate.toISOString().split('T')[0]}', 'hackathon', 'hackathon_registration')`;
    }).join(',\n');

    const cohortSql = `INSERT INTO cohort_assignments (user_id, cohort_date, acquisition_channel, signup_source) VALUES ${cohortValues} ON CONFLICT DO NOTHING;`;

    try {
      await fetch(`${MAIN_URL}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'apikey': MAIN_KEY,
          'Authorization': `Bearer ${MAIN_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: cohortSql }),
      });
    } catch (e) {
      // Cohort errors are less critical
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n✅ Sync complete! Inserted ${inserted}/${participants.length} funnel events`);
  if (failed > 0) {
    console.log(`⚠️  Failed: ${failed}`);
  }
}

sync().catch(console.error);
