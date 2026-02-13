# Quick Test Guide - 10 Concurrent Users

> **⚠️ DEPRECATED**: The cron job system has been removed from this repository. This guide is kept for reference only and may not work as expected.

## Previous Setup (One-Time)

```bash
# 1. Install dependencies
pnpm add -D tsx

# 2. Apply database migration
npx supabase db push --local
```

## Previous Test Instructions (No Longer Functional)

The previous testing workflow relied on the cron job system which has been removed. The following commands are no longer functional:

- ~~`pnpm jobs:trigger:loop`~~ - Worker endpoint removed
- ~~`pnpm jobs:monitor:watch`~~ - May not work without worker system

Please refer to the new scheduling mechanism documentation for updated testing procedures.

## What Was Removed

- Vercel cron configuration for `/api/direction/worker` and `/api/direction/cleanup`
- `CRON_SECRET` environment variable requirement
- Manual worker trigger scripts

Please refer to the project documentation for information about the replacement job processing mechanism (to be implemented).
