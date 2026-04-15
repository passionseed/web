// Direct hackathon data sync script
// Run with: npx tsx scripts/sync-hackathon-data.ts

import { createClient } from '@supabase/supabase-js';

const HACKATHON_URL = process.env.HACKATHON_SUPABASE_URL || 'https://mpmkbtsjtfhqvynijqzl.supabase.co';
const HACKATHON_KEY = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY;
const MAIN_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ixvgihxcvutftpbgjzjd.supabase.co';
const MAIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sync() {
  if (!HACKATHON_KEY || !MAIN_KEY) {
    console.error('Missing service role keys. Set HACKATHON_SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const hackathonDb = createClient(HACKATHON_URL, HACKATHON_KEY);
  const mainDb = createClient(MAIN_URL, MAIN_KEY);

  console.log('Fetching hackathon participants...');
  const { data: participants, error } = await hackathonDb
    .from('hackathon_participants')
    .select('id, track, university, grade_level, referral_source, created_at');

  if (error || !participants) {
    console.error('Failed to fetch participants:', error);
    process.exit(1);
  }

  console.log(`Found ${participants.length} participants`);

  // Check for existing records to avoid duplicates
  const userIds = participants.map(p => p.id);
  const { data: existing } = await mainDb
    .from('funnel_events')
    .select('user_id')
    .in('user_id', userIds)
    .eq('event_name', 'hackathon_signup');

  const existingIds = new Set(existing?.map(e => e.user_id) || []);
  const newParticipants = participants.filter(p => !existingIds.has(p.id));

  console.log(`${newParticipants.length} new participants to sync (skipped ${existingIds.size} existing)`);

  if (newParticipants.length === 0) {
    console.log('All participants already synced!');
    process.exit(0);
  }

  // Prepare funnel events
  const funnelEvents = newParticipants.map((p) => ({
    user_id: p.id,
    event_name: 'hackathon_signup',
    event_timestamp: p.created_at,
    metadata: {
      track: p.track,
      university: p.university,
      grade_level: p.grade_level,
      source: p.referral_source,
    },
  }));

  console.log('Inserting funnel_events...');
  const { error: insertError } = await mainDb
    .from('funnel_events')
    .insert(funnelEvents);

  if (insertError) {
    console.error('Failed to insert funnel_events:', insertError);
    process.exit(1);
  }

  // Prepare cohort assignments (Monday of each week)
  const cohortAssignments = newParticipants.map((p) => {
    const date = new Date(p.created_at);
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const cohortDate = new Date(date.setDate(diff));

    return {
      user_id: p.id,
      cohort_date: cohortDate.toISOString().split('T')[0],
      acquisition_channel: 'hackathon',
      signup_source: 'hackathon_registration',
    };
  });

  console.log('Inserting cohort_assignments...');
  const { error: cohortError } = await mainDb
    .from('cohort_assignments')
    .insert(cohortAssignments);

  if (cohortError) {
    console.error('Failed to insert cohort_assignments:', cohortError);
    // Continue anyway since funnel_events were inserted
  }

  console.log(`✅ Successfully synced ${newParticipants.length} participants!`);
  console.log('Dashboard should now show real hackathon data.');
}

sync().catch(console.error);
