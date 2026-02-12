/**
 * Manual Worker Trigger Script
 *
 * Manually triggers the background worker to process pending jobs.
 * Useful for local testing without waiting for cron.
 *
 * Usage:
 *   npx tsx scripts/trigger-worker.ts
 *   npx tsx scripts/trigger-worker.ts --production
 *   npx tsx scripts/trigger-worker.ts --loop (keeps running)
 */

const IS_PRODUCTION = process.argv.includes('--production');
const LOOP_MODE = process.argv.includes('--loop');
const BASE_URL = IS_PRODUCTION
  ? 'https://your-production-domain.vercel.app'
  : 'http://localhost:3000';

async function triggerWorker(): Promise<void> {
  try {
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';

    console.log(`⚙️  Triggering worker at ${BASE_URL}/api/direction/worker`);

    const response = await fetch(`${BASE_URL}/api/direction/worker`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Worker failed (HTTP ${response.status}):`, data);
      return;
    }

    if (data.processed) {
      console.log(`✅ Worker processed:`, {
        jobId: data.jobId,
        step: data.step,
        message: data.message,
      });
    } else {
      console.log(`ℹ️  ${data.message}`);
    }

  } catch (error) {
    console.error('❌ Error triggering worker:', error);
  }
}

async function runLoop() {
  console.log('\n🔄 Running worker in loop mode (every 3 seconds)');
  console.log('Press Ctrl+C to stop\n');

  while (true) {
    await triggerWorker();
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Main
if (LOOP_MODE) {
  runLoop();
} else {
  triggerWorker();
}
