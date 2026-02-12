# Direction Finder Background Job System

## Problem Solved

The Direction Finder AI generation took 130-190 seconds, which exceeded Vercel's 60-second timeout limit. This system splits the work into 3 steps, each under 60 seconds, and processes them asynchronously in the background.

## Architecture

### 3-Step Process

1. **Step 1 (Core)**: Generate profile + career vectors (~40-60s)
2. **Step 2 (Programs)**: Generate recommended programs (~30-40s)
3. **Step 3 (Commitments)**: Generate commitments (~20-30s)

Each step is independent, resumable, and completes under Vercel's 60s limit.

### Flow

```
User Request
    ↓
POST /api/direction/enqueue (returns jobId in <1s)
    ↓
Vercel Cron runs every 1 minute
    ↓
POST /api/direction/worker (processes one step)
    ↓
Frontend polls GET /api/direction/status/[jobId] (every 3s)
    ↓
Job complete! Return results to user
```

### Database Schema

Jobs are tracked in `direction_finder_jobs` table with:
- Overall status: `pending`, `processing`, `completed`, `failed`
- Per-step status tracking
- Atomic locking (SELECT FOR UPDATE SKIP LOCKED)
- Retry logic (max 3 retries)
- Stuck job recovery (resets after 10 min)

## Setup Instructions

### 1. Apply Database Migration

```bash
npx supabase db push --local
```

This creates:
- `direction_finder_jobs` table
- Helper functions (`get_next_direction_job`, `cleanup_old_direction_jobs`, etc.)
- RLS policies
- Indexes

### 2. Set Environment Variables

Add to `.env.local`:

```bash
# Supabase (you already have these)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Secret (generate a random string)
CRON_SECRET=your_random_secret_here
```

Generate CRON_SECRET:
```bash
openssl rand -base64 32
```

### 3. Configure Vercel Cron

The `vercel.json` file is already configured with:

```json
{
  "crons": [
    {
      "path": "/api/direction/worker",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/direction/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- Worker runs every 1 minute
- Cleanup runs daily at 2 AM

### 4. Deploy to Vercel

```bash
git add .
git commit -m "Add background job system for direction finder"
git push origin main
```

### 5. Add Environment Variables to Vercel

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add `CRON_SECRET` (same value as local)
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

### 6. Enable Cron in Vercel

Vercel automatically enables cron for projects with `vercel.json` crons.

Check status at: `https://vercel.com/[your-team]/[your-project]/settings/cron`

## Usage

### Frontend Implementation

```tsx
import { useDirectionJob } from '@/lib/hooks/use-direction-job';

function DirectionFinderPage() {
  const {
    startJob,
    status,
    progress,
    result,
    partialResults,
    error,
    isPolling,
  } = useDirectionJob();

  const handleGenerate = async () => {
    try {
      await startJob(assessmentAnswers, conversationHistory, 'en');
    } catch (err) {
      console.error('Failed to start job:', err);
    }
  };

  if (isPolling) {
    return (
      <div>
        <p>Status: {status}</p>
        <p>Progress: {progress?.current} / {progress?.total}</p>

        {/* Show partial results as they complete */}
        {partialResults?.core && (
          <ProfileDisplay profile={partialResults.core.profile} />
        )}
      </div>
    );
  }

  if (status === 'completed' && result) {
    return <DirectionFinderResults result={result} />;
  }

  return <button onClick={handleGenerate}>Generate Direction Profile</button>;
}
```

### API Routes

**Start a job:**
```bash
POST /api/direction/enqueue
{
  "answers": { /* AssessmentAnswers */ },
  "history": [ /* conversation history */ ],
  "language": "en"
}

Response:
{
  "jobId": "uuid",
  "status": "pending"
}
```

**Check job status:**
```bash
GET /api/direction/status/[jobId]

Response:
{
  "jobId": "uuid",
  "status": "processing",
  "progress": { "current": 2, "total": 3 },
  "steps": {
    "core": "completed",
    "programs": "completed",
    "commitments": "processing"
  },
  "partialResults": {
    "core": { /* profile + vectors */ },
    "programs": { /* programs */ }
  }
}
```

## How It Works

### Worker Process

1. Cron triggers `/api/direction/worker` every minute
2. Worker atomically grabs ONE job with pending work
3. Determines next pending step (core → programs → commitments)
4. Processes that step (calls AI function)
5. Saves result to database
6. Next cron iteration processes next step

### Atomic Locking

Uses PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` to prevent:
- Race conditions (two workers processing same job)
- Double execution
- Lost updates

### Retry Logic

- Each step retries up to 3 times on failure
- Exponential backoff handled by cron schedule
- After 3 failures, job marked as `failed`

### Stuck Job Recovery

- Daily cleanup cron resets jobs stuck in `processing` > 10 minutes
- Prevents jobs from getting permanently stuck due to crashes

### Old Job Cleanup

- Completed jobs older than 30 days are automatically deleted
- Keeps database size manageable
- Failed jobs kept for debugging

## Monitoring

### Check Job Status (SQL)

```sql
-- Active jobs
SELECT id, status, step_core, step_programs, step_commitments, created_at
FROM direction_finder_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;

-- Failed jobs
SELECT id, error, retry_count, created_at
FROM direction_finder_jobs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Job statistics
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM direction_finder_jobs
GROUP BY status;
```

### Check Worker Logs (Vercel)

Go to Vercel Dashboard → Deployments → Functions → `/api/direction/worker`

Look for log messages:
- `[Worker xxx] Processing job yyy`
- `[Worker xxx] Processing step: core/programs/commitments`
- `[Worker xxx] Step completed`

## Troubleshooting

### Job Stuck in Processing

**Cause**: Worker crashed or timed out

**Fix**: Wait for daily cleanup cron (2 AM) or manually reset:

```sql
UPDATE direction_finder_jobs
SET status = 'pending',
    step_core = CASE WHEN step_core = 'processing' THEN 'pending' ELSE step_core END,
    processing_started_at = NULL
WHERE id = 'your-job-id';
```

### Job Failing Repeatedly

**Cause**: AI timeout or error

**Check logs**:
1. Go to Vercel Dashboard → Functions → `/api/direction/worker`
2. Look for error messages

**Fix**:
- Check AI model availability
- Verify Supabase connection
- Check if prompt is too large

### Worker Not Running

**Cause**: Cron not configured

**Fix**:
1. Check `vercel.json` exists
2. Verify `CRON_SECRET` is set in Vercel
3. Check cron status in Vercel Dashboard

### Polling Not Updating

**Cause**: Frontend not polling correctly

**Debug**:
```tsx
useEffect(() => {
  console.log('Job status:', status, progress);
}, [status, progress]);
```

## Cost Considerations

### Vercel Free Tier

- Cron runs: Unlimited (every 1 min = 1,440/day)
- Function executions: 100GB-hours/month
- Each worker call: ~0.5-1 GB-seconds

**Your usage** (70 users/day):
- 70 jobs × 3 steps = 210 worker calls/day
- 210 × 45s avg × 1GB = ~2.6 GB-hours/day
- Monthly: ~78 GB-hours (well under 100 limit)

### Database Storage

- Each job: ~50-100 KB
- 70 jobs/day × 30 days = 2,100 jobs/month
- Storage: ~150 MB/month (negligible)
- Auto-deleted after 30 days

## Future Improvements

1. **Add job priorities**: Process urgent jobs first
2. **Parallel processing**: Process multiple jobs if traffic increases
3. **Real-time updates**: Use Supabase real-time instead of polling
4. **Job cancellation**: Allow users to cancel in-progress jobs
5. **Better progress UI**: Show which specific step is processing

## Summary

This system solves the Vercel timeout issue by:
- ✅ Splitting work into 3 steps (each < 60s)
- ✅ Processing asynchronously in background
- ✅ Using database for job queue (no external services)
- ✅ Atomic locking (no race conditions)
- ✅ Retry logic (handles transient failures)
- ✅ Auto-recovery (resets stuck jobs)
- ✅ Auto-cleanup (deletes old jobs)
- ✅ Production-safe (tested patterns)

All within Vercel Free tier constraints!
