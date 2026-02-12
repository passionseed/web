# Testing Concurrent Direction Finder Jobs

This guide shows how to test if the background job system can handle 10+ concurrent users submitting direction finder jobs simultaneously.

## Prerequisites

### 1. Install tsx (TypeScript executor)

```bash
pnpm add -D tsx
```

### 2. Make sure your local server is running

```bash
pnpm dev
```

### 3. Apply the database migration

```bash
npx supabase db push --local
```

### 4. Set environment variables

Make sure `.env.local` has:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_random_secret
```

---

## Testing Commands

### 🧪 Load Test (10 Concurrent Users)

This simulates 10 users submitting jobs at exactly the same time.

```bash
pnpm test:load
```

**What it does:**
1. Creates 10 jobs simultaneously
2. Polls each job status every 3 seconds
3. Reports success/failure for each user
4. Shows timing statistics

**Expected output:**

```
============================================================
🧪 DIRECTION FINDER LOAD TEST
============================================================
📊 Testing 10 concurrent users
🌐 Target: http://localhost:3000
⏰ Started: 2/13/2024, 10:30:00 AM
============================================================

📤 PHASE 1: Creating 10 jobs simultaneously...

✅ User 1: Job created (a7b3c4d5...)
✅ User 2: Job created (b8c4d5e6...)
...
✅ User 10: Job created (j1k2l3m4...)

✅ Created 10/10 jobs successfully

⏳ PHASE 2: Monitoring 10 jobs...

⏳ User 1: [█░░] 1/3 steps - 15.2s
⏳ User 2: [█░░] 1/3 steps - 15.3s
...
✅ User 1: COMPLETED in 125.4s
✅ User 2: COMPLETED in 127.1s
...

============================================================
📊 TEST RESULTS
============================================================

✅ Successful: 10/10
❌ Failed: 0/10
⏱️  Total test duration: 185.3s

📈 Timing Statistics:
   Average: 126.5s
   Fastest: 125.4s
   Slowest: 132.1s

============================================================
⏰ Completed: 2/13/2024, 10:33:05 AM
============================================================
```

### 🔥 Test with More Users

Test with 20 concurrent users:

```bash
pnpm test:load:20
```

Or custom number:

```bash
npx tsx scripts/test-concurrent-jobs.ts --users=50
```

### 🌐 Test Production

Test against production (update URL in script first):

```bash
pnpm test:load:prod
```

---

## Manual Testing

### 1. Monitor Jobs in Real-Time

Watch the database for job status changes:

```bash
pnpm jobs:monitor:watch
```

**Output:**

```
================================================================================
📊 DIRECTION FINDER JOBS STATUS
================================================================================
⏰ 10:35:42 AM

🔄 ACTIVE JOBS (5)
────────────────────────────────────────────────────────────────────────────────

Job: a7b3c4d5...
  Status: ⏳ PROCESSING
  Steps: ✅ ⏳ ⏸️ [Core | Programs | Commitments]
  Created: 10:35:20 AM
  Processing: 22s by worker-1707825342-abc123

Job: b8c4d5e6...
  Status: ⏳ PROCESSING
  Steps: ✅ ✅ ⏳ [Core | Programs | Commitments]
  Created: 10:35:20 AM
  Processing: 22s by worker-1707825342-def456

...

📋 RECENT COMPLETED/FAILED (Last 5)
────────────────────────────────────────────────────────────────────────────────
✅ c9d5e6f7... - completed - 10:34:45 AM (57s ago)
✅ d0e6f7g8... - completed - 10:34:42 AM (60s ago)
❌ e1f7g8h9... - failed - 10:34:30 AM (72s ago)
   Error: AI timeout after 3 retries

📈 LAST 24 HOURS STATISTICS
────────────────────────────────────────────────────────────────────────────────
  Pending:    2
  Processing: 5
  Completed:  23 ✅
  Failed:     1 ❌
  Total:      31

================================================================================
Refreshing in 3 seconds... (Press Ctrl+C to stop)
```

### 2. Manually Trigger Worker

Instead of waiting for cron, manually trigger the worker:

```bash
pnpm jobs:trigger
```

**Run continuously** (processes jobs as they come in):

```bash
pnpm jobs:trigger:loop
```

This simulates cron running every 3 seconds.

---

## Testing Workflow

### Full Test Flow

Here's how to do a complete test:

**Terminal 1: Start dev server**

```bash
pnpm dev
```

**Terminal 2: Monitor jobs**

```bash
pnpm jobs:monitor:watch
```

**Terminal 3: Run worker loop** (simulates cron)

```bash
pnpm jobs:trigger:loop
```

**Terminal 4: Run load test**

```bash
pnpm test:load
```

Now watch:
- Terminal 2 shows job status updates in real-time
- Terminal 3 shows worker processing each step
- Terminal 4 shows user-by-user completion

---

## Understanding the Results

### ✅ Success Criteria

The system is working correctly if:

1. **All jobs complete** - No timeouts or failures
2. **Steps process sequentially** - Core → Programs → Commitments
3. **No race conditions** - Each job processed by one worker at a time
4. **Average time < 180s** - Total time for 3 steps should be under 3 minutes

### ❌ Common Failures

#### Jobs Stuck in Processing

**Symptom:** Jobs stay in "processing" forever

**Cause:** Worker crashed or didn't update status

**Fix:**
```sql
-- Reset stuck jobs manually
UPDATE direction_finder_jobs
SET status = 'pending',
    step_core = CASE WHEN step_core = 'processing' THEN 'pending' ELSE step_core END,
    processing_started_at = NULL
WHERE status = 'processing'
  AND processing_started_at < NOW() - INTERVAL '10 minutes';
```

Or wait for daily cleanup cron to auto-reset.

#### Jobs Failing with AI Errors

**Symptom:** Jobs marked as "failed" with AI errors

**Possible causes:**
- AI API key missing/invalid
- Schema too complex (grammar error)
- AI service down
- Rate limit exceeded

**Check logs:**
```bash
# In terminal running pnpm dev, look for:
❌ Error generating core profile: ...
```

#### Worker Not Processing

**Symptom:** Jobs stuck in "pending", worker never picks them up

**Cause:** Worker not running (no cron in local)

**Fix:** Run worker manually:
```bash
pnpm jobs:trigger:loop
```

---

## Database Queries for Debugging

### Check Active Jobs

```sql
SELECT
  id,
  status,
  step_core,
  step_programs,
  step_commitments,
  retry_count,
  created_at,
  processing_started_at
FROM direction_finder_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC;
```

### Check Failed Jobs

```sql
SELECT
  id,
  error,
  retry_count,
  step_core,
  step_programs,
  step_commitments,
  created_at
FROM direction_finder_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Performance Statistics

```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (completed_at - created_at))) as min_duration,
  MAX(EXTRACT(EPOCH FROM (completed_at - created_at))) as max_duration
FROM direction_finder_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### Check for Race Conditions

```sql
-- Should return 0 rows (no duplicate processing)
SELECT
  processing_started_at,
  COUNT(*) as concurrent_jobs
FROM direction_finder_jobs
WHERE status = 'processing'
  AND processing_started_at IS NOT NULL
GROUP BY processing_started_at
HAVING COUNT(*) > 1;
```

---

## Expected Performance

### For 10 Concurrent Users

| Metric | Expected Value |
|--------|---------------|
| Job creation time | < 1s per job |
| Step 1 (Core) duration | 40-60s |
| Step 2 (Programs) duration | 30-40s |
| Step 3 (Commitments) duration | 20-30s |
| Total per job | 90-130s |
| Total test duration | 120-180s |
| Success rate | 100% |
| Race conditions | 0 |

### Bottlenecks

The worker processes **one job at a time** sequentially:

```
Job 1: [Core] → [Programs] → [Commitments]  ✅ (120s)
Job 2:                                      [Core] → [Programs] → [Commitments] ✅ (120s)
Job 3:                                                                          [Core]...
```

So 10 jobs will take:
- **Best case:** ~120s (if worker is fast)
- **Worst case:** ~180s (if AI is slow)

This is **by design** on Vercel Free tier to avoid overwhelming the system.

---

## Scaling Considerations

### When to Parallelize

If you have:
- ✅ More than 100 users/day
- ✅ Upgraded to Vercel Pro ($20/month)
- ✅ Need faster processing

Then you can modify `app/api/direction/worker/route.ts` to process **multiple jobs in parallel**:

```typescript
// Process 3 jobs at once instead of 1
const { data: jobs } = await supabase.rpc('get_next_direction_job');
const jobsToProcess = jobs.slice(0, 3);

await Promise.all(jobsToProcess.map(job => processJob(job)));
```

But for 70 users/day, **one at a time is fine**.

---

## Cleanup

After testing, clean up test jobs:

```sql
DELETE FROM direction_finder_jobs
WHERE user_id = 'test-user-id';
```

Or wait for auto-cleanup (deletes completed jobs after 30 days).

---

## Troubleshooting

### "Module not found: tsx"

Install tsx:
```bash
pnpm add -D tsx
```

### "Could not find function get_next_direction_job"

Apply migration:
```bash
npx supabase db push --local
```

### "Unauthorized" Error

Set CRON_SECRET in `.env.local`:
```bash
CRON_SECRET=$(openssl rand -base64 32)
```

### Jobs Complete but No Result

Check if all 3 steps completed:
```sql
SELECT step_core, step_programs, step_commitments
FROM direction_finder_jobs
WHERE id = 'your-job-id';
```

All should be "completed" for full result.

---

## Next Steps

After successful testing:

1. ✅ Deploy to production
2. ✅ Set up Vercel cron (automatic)
3. ✅ Monitor via Vercel Dashboard → Functions
4. ✅ Set up alerts for failed jobs
5. ✅ Update frontend to use `useDirectionJob` hook

Good luck! 🚀
