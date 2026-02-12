/**
 * Job Monitor Script
 *
 * Shows real-time status of direction finder jobs in the database.
 * Useful for debugging and monitoring during load tests.
 *
 * Usage:
 *   npx tsx scripts/monitor-jobs.ts
 *   npx tsx scripts/monitor-jobs.ts --watch (keeps refreshing)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const WATCH_MODE = process.argv.includes('--watch');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface JobRow {
  id: string;
  user_id: string;
  status: string;
  step_core: string;
  step_programs: string;
  step_commitments: string;
  retry_count: number;
  error: string | null;
  created_at: string;
  processing_started_at: string | null;
  processed_by: string | null;
}

async function fetchJobs(): Promise<void> {
  try {
    // Clear screen in watch mode
    if (WATCH_MODE) {
      console.clear();
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 DIRECTION FINDER JOBS STATUS');
    console.log('='.repeat(80));
    console.log(`⏰ ${new Date().toLocaleTimeString()}\n`);

    // Fetch active jobs
    const { data: activeJobs, error: activeError } = await supabase
      .from('direction_finder_jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (activeError) {
      console.error('❌ Error fetching active jobs:', activeError);
      return;
    }

    // Fetch recent completed/failed jobs
    const { data: recentJobs, error: recentError } = await supabase
      .from('direction_finder_jobs')
      .select('*')
      .in('status', ['completed', 'failed'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent jobs:', recentError);
      return;
    }

    // Display active jobs
    if (activeJobs && activeJobs.length > 0) {
      console.log(`🔄 ACTIVE JOBS (${activeJobs.length})`);
      console.log('─'.repeat(80));

      activeJobs.forEach((job: JobRow) => {
        const elapsed = job.processing_started_at
          ? Math.round((Date.now() - new Date(job.processing_started_at).getTime()) / 1000)
          : 0;

        const steps = [
          job.step_core === 'completed' ? '✅' : job.step_core === 'processing' ? '⏳' : '⏸️',
          job.step_programs === 'completed' ? '✅' : job.step_programs === 'processing' ? '⏳' : '⏸️',
          job.step_commitments === 'completed' ? '✅' : job.step_commitments === 'processing' ? '⏳' : '⏸️',
        ].join(' ');

        console.log(`\nJob: ${job.id.slice(0, 8)}...`);
        console.log(`  Status: ${getStatusEmoji(job.status)} ${job.status.toUpperCase()}`);
        console.log(`  Steps: ${steps} [Core | Programs | Commitments]`);
        console.log(`  Created: ${formatTime(job.created_at)}`);
        if (job.processing_started_at) {
          console.log(`  Processing: ${elapsed}s by ${job.processed_by || 'unknown'}`);
        }
        if (job.retry_count > 0) {
          console.log(`  Retries: ${job.retry_count}`);
        }
      });
    } else {
      console.log('✨ No active jobs\n');
    }

    // Display recent jobs
    if (recentJobs && recentJobs.length > 0) {
      console.log('\n📋 RECENT COMPLETED/FAILED (Last 5)');
      console.log('─'.repeat(80));

      recentJobs.forEach((job: JobRow) => {
        const status = job.status === 'completed' ? '✅' : '❌';
        const duration = job.created_at
          ? Math.round((new Date().getTime() - new Date(job.created_at).getTime()) / 1000)
          : 0;

        console.log(`${status} ${job.id.slice(0, 8)}... - ${job.status} - ${formatTime(job.created_at)} (${duration}s ago)`);
        if (job.error) {
          console.log(`   Error: ${job.error.slice(0, 60)}...`);
        }
      });
    }

    // Statistics
    const { data: stats, error: statsError } = await supabase
      .from('direction_finder_jobs')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!statsError && stats) {
      const pending = stats.filter(j => j.status === 'pending').length;
      const processing = stats.filter(j => j.status === 'processing').length;
      const completed = stats.filter(j => j.status === 'completed').length;
      const failed = stats.filter(j => j.status === 'failed').length;

      console.log('\n📈 LAST 24 HOURS STATISTICS');
      console.log('─'.repeat(80));
      console.log(`  Pending:    ${pending}`);
      console.log(`  Processing: ${processing}`);
      console.log(`  Completed:  ${completed} ✅`);
      console.log(`  Failed:     ${failed} ❌`);
      console.log(`  Total:      ${stats.length}`);
    }

    console.log('\n' + '='.repeat(80));

    if (WATCH_MODE) {
      console.log('Refreshing in 3 seconds... (Press Ctrl+C to stop)');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏸️';
    case 'processing': return '⏳';
    case 'completed': return '✅';
    case 'failed': return '❌';
    default: return '❓';
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

// Main
async function main() {
  if (WATCH_MODE) {
    while (true) {
      await fetchJobs();
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } else {
    await fetchJobs();
  }
}

main();
