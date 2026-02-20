/**
 * Load Testing Script for Direction Finder Background Jobs
 *
 * Tests if the system can handle 10 concurrent users submitting
 * direction finder jobs simultaneously.
 *
 * Usage:
 *   npx tsx scripts/test-concurrent-jobs.ts
 *   npx tsx scripts/test-concurrent-jobs.ts --users 20
 *   npx tsx scripts/test-concurrent-jobs.ts --production
 *   npx tsx scripts/test-concurrent-jobs.ts --users=100 --token=YOUR_SUPABASE_ACCESS_TOKEN
 */

import { AssessmentAnswers } from '../types/direction-finder';

// Configuration
const CONCURRENT_USERS = parseInt(process.argv.find(arg => arg.startsWith('--users='))?.split('=')[1] || '10');
const IS_PRODUCTION = process.argv.includes('--production');
const AUTH_TOKEN = process.argv.find(arg => arg.startsWith('--token='))?.split('=')[1];
const BASE_URL = IS_PRODUCTION
  ? 'https://your-production-domain.vercel.app'
  : 'http://localhost:3000';

// Test data generator
function generateTestAssessment(userId: number): AssessmentAnswers {
  const domains = [
    'Technology', 'Art & Design', 'Music', 'Sports', 'Science',
    'Writing', 'Business', 'Teaching', 'Healthcare', 'Engineering'
  ];

  const interests = [9, 8, 7, 6] as const;
  const capabilities = [8, 7, 6, 5] as const;

  return {
    q1_flow: {
      description: `User ${userId}: I love coding and building things. Time flies when I'm working on a challenging problem.`,
      activities: ['creating', 'solving', 'building'],
    },
    q2_zone_grid: {
      items: domains.slice(0, 6).map((domain, idx) => ({
        domain,
        interest: interests[idx % interests.length],
        capability: capabilities[idx % capabilities.length],
      })),
    },
    q3_work_style: {
      indoor_outdoor: 'indoor',
      structured_flexible: 'flexible',
      solo_team: 'team',
      hands_on_theory: 'hands_on',
      steady_fast: 'fast',
    },
    q4_reputation: [
      `Solving technical problems`,
      `Helping others learn`,
      `Creative solutions`,
    ],
    q5_proud: {
      story: `User ${userId}: I built a web app that helped my school manage events better. It was used by 200+ students.`,
      role_description: 'I led the development and designed the user interface',
      tags: ['leadership', 'problem_solving', 'creativity'],
    },
    q6_unique: {
      description: `User ${userId}: I can explain complex technical concepts in simple terms that anyone can understand.`,
      skipped: false,
    },
  };
}

// Conversation history generator
function generateTestHistory(userId: number) {
  return [
    {
      role: 'user' as const,
      content: `Hi, I'm user ${userId}. I want to find my career direction.`,
    },
    {
      role: 'assistant' as const,
      content: 'Great! Let me help you discover your direction.',
    },
    {
      role: 'user' as const,
      content: 'I love building things and helping people.',
    },
  ];
}

// Job status type
interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: { current: number; total: number };
  steps: {
    core: string;
    programs: string;
    commitments: string;
  };
  result?: any;
  error?: string;
}

// Create a job
async function createJob(userId: number, authToken?: string): Promise<{ jobId: string; startTime: number }> {
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BASE_URL}/api/direction/enqueue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        answers: generateTestAssessment(userId),
        history: generateTestHistory(userId),
        language: 'en',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.jobId) {
      throw new Error('No jobId returned from API');
    }

    console.log(`✅ User ${userId}: Job created (${data.jobId.slice(0, 8)}...)`);

    return { jobId: data.jobId, startTime };
  } catch (error) {
    console.error(`❌ User ${userId}: Failed to create job:`, error);
    throw error;
  }
}

// Poll job status
async function pollJobStatus(
  jobId: string,
  userId: number,
  startTime: number,
  authToken?: string
): Promise<{ success: boolean; duration: number; error?: string }> {
  const maxAttempts = 120; // 6 minutes max (120 * 3s)
  let attempts = 0;

  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  while (attempts < maxAttempts) {
    attempts++;

    try {
      // Trigger one processing step per polling cycle (request-driven worker)
      await fetch(`${BASE_URL}/api/direction/process/${jobId}`, {
        method: 'POST',
        headers,
      });

      const response = await fetch(`${BASE_URL}/api/direction/status/${jobId}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: JobStatus = await response.json();

      // Log progress
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const progressBar = '█'.repeat(data.progress.current) + '░'.repeat(data.progress.total - data.progress.current);
      console.log(`⏳ User ${userId}: [${progressBar}] ${data.progress.current}/${data.progress.total} steps - ${elapsed}s`);

      if (data.status === 'completed') {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ User ${userId}: COMPLETED in ${duration.toFixed(1)}s`);
        return { success: true, duration };
      }

      if (data.status === 'failed') {
        const duration = (Date.now() - startTime) / 1000;
        console.error(`❌ User ${userId}: FAILED after ${duration.toFixed(1)}s - ${data.error}`);
        return { success: false, duration, error: data.error };
      }

      // Wait 3 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`⚠️  User ${userId}: Polling error:`, error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Timeout
  const duration = (Date.now() - startTime) / 1000;
  console.error(`⏱️  User ${userId}: TIMEOUT after ${duration.toFixed(1)}s`);
  return { success: false, duration, error: 'Timeout after 6 minutes' };
}

// Main test runner
async function runLoadTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 DIRECTION FINDER LOAD TEST');
  console.log('='.repeat(60));
  console.log(`📊 Testing ${CONCURRENT_USERS} concurrent users`);
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log(`🔐 Auth token: ${AUTH_TOKEN ? 'provided' : 'not provided (will likely fail with 401)'}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60) + '\n');

  // Phase 1: Create all jobs simultaneously
  console.log(`📤 PHASE 1: Creating ${CONCURRENT_USERS} jobs simultaneously...\n`);

  const testStartTime = Date.now();

  const jobPromises = Array.from({ length: CONCURRENT_USERS }, (_, i) =>
    createJob(i + 1, AUTH_TOKEN)
  );

  let jobs: { jobId: string; startTime: number; userId: number }[];

  try {
    const results = await Promise.allSettled(jobPromises);

    jobs = results
      .map((result, idx) => {
        if (result.status === 'fulfilled') {
          return { ...result.value, userId: idx + 1 };
        }
        return null;
      })
      .filter((job): job is { jobId: string; startTime: number; userId: number } => job !== null);

    console.log(`\n✅ Created ${jobs.length}/${CONCURRENT_USERS} jobs successfully`);

    if (jobs.length === 0) {
      console.error('❌ All job creations failed. Aborting test.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Critical error creating jobs:', error);
    process.exit(1);
  }

  // Phase 2: Poll all jobs
  console.log(`\n⏳ PHASE 2: Monitoring ${jobs.length} jobs...\n`);

  const pollPromises = jobs.map(job =>
    pollJobStatus(job.jobId, job.userId, job.startTime, AUTH_TOKEN)
  );

  const results = await Promise.allSettled(pollPromises);

  // Phase 3: Report results
  const testEndTime = Date.now();
  const totalDuration = (testEndTime - testStartTime) / 1000;

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60));

  const successfulResults = results
    .map((result, idx) => {
      if (result.status === 'fulfilled') {
        return { ...result.value, userId: jobs[idx].userId };
      }
      return null;
    })
    .filter((r): r is { success: boolean; duration: number; error?: string; userId: number } => r !== null);

  const successful = successfulResults.filter(r => r.success);
  const failed = successfulResults.filter(r => !r.success);

  console.log(`\n✅ Successful: ${successful.length}/${jobs.length}`);
  console.log(`❌ Failed: ${failed.length}/${jobs.length}`);
  console.log(`⏱️  Total test duration: ${totalDuration.toFixed(1)}s`);

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log(`\n📈 Timing Statistics:`);
    console.log(`   Average: ${avgDuration.toFixed(1)}s`);
    console.log(`   Fastest: ${minDuration.toFixed(1)}s`);
    console.log(`   Slowest: ${maxDuration.toFixed(1)}s`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed Jobs:`);
    failed.forEach(r => {
      console.log(`   User ${r.userId}: ${r.error || 'Unknown error'}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`⏰ Completed: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the test
runLoadTest().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
