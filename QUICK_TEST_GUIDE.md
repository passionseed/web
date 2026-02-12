# Quick Test Guide - 10 Concurrent Users

## Setup (One-Time)

```bash
# 1. Install dependencies
pnpm add -D tsx

# 2. Apply database migration
npx supabase db push --local

# 3. Make sure .env.local has CRON_SECRET
echo "CRON_SECRET=$(openssl rand -base64 32)" >> .env.local
```

## Run Test (4 Terminals)

### Terminal 1: Dev Server
```bash
pnpm dev
```

### Terminal 2: Monitor Jobs
```bash
pnpm jobs:monitor:watch
```

### Terminal 3: Worker (simulates cron)
```bash
pnpm jobs:trigger:loop
```

### Terminal 4: Run Load Test
```bash
pnpm test:load
```

## Watch the Magic ✨

- **Terminal 2** shows jobs progressing through steps in real-time
- **Terminal 3** shows worker processing each job
- **Terminal 4** shows completion status for each user

## Expected Result

```
✅ Successful: 10/10
❌ Failed: 0/10
⏱️  Total test duration: ~120-180s
📈 Average: ~130s per job
```

## If Something Fails

1. **Check Terminal 1** for errors
2. **Check Terminal 3** to see if worker is processing
3. **Run monitoring** to see job status:
   ```bash
   pnpm jobs:monitor
   ```

## Test Different Scenarios

```bash
# Test 20 users
pnpm test:load:20

# Test custom number
npx tsx scripts/test-concurrent-jobs.ts --users=50
```

That's it! 🚀

See `TESTING_CONCURRENT_JOBS.md` for detailed documentation.
