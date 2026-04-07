const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY || 're_P2hKXtZ7_5WFqwtTirN4jJGFmhiKF75pQ');

// We use service role key to bypass RLS and get all participants
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to avoid hitting rate limits (Resend allows ~10 req/sec)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function syncContacts() {
  console.log('Fetching participants from Supabase...');
  
  const { data: participants, error } = await supabase
    .from('hackathon_participants')
    .select('*');

  if (error) {
    console.error('❌ Error fetching participants:', error);
    return;
  }

  console.log(`Found ${participants.length} participants. Syncing to Resend...`);

  let successCount = 0;
  let errorCount = 0;

  for (const participant of participants) {
    try {
      // Split full name into first and last name safely
      const nameParts = (participant.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Participant';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const { data, error: resendError } = await resend.contacts.create({
        email: participant.email,
        firstName: firstName,
        lastName: lastName,
        unsubscribed: false,
        // You can also pass custom properties if you want to filter them in Resend
        // properties: {
        //   university: participant.university,
        //   track: participant.track,
        //   team_name: participant.team_name
        // }
      });

      if (resendError) {
        console.error(`⚠️ Failed to add ${participant.email}:`, resendError.message);
        errorCount++;
      } else {
        console.log(`✅ Added ${participant.email}`);
        successCount++;
      }
    } catch (err) {
      console.error(`⚠️ Exception adding ${participant.email}:`, err.message);
      errorCount++;
    }

    // Wait 150ms between requests to stay well under the 10 req/sec rate limit
    await sleep(150);
  }

  console.log('\n🎉 Sync Complete!');
  console.log(`Successfully added: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
}

syncContacts();
