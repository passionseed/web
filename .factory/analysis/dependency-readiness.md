# Dependency Readiness Report

## Packages: PASS
- pnpm install: Completed successfully in 782ms. Lockfile up to date, no errors.

## Tools: PASS
- node: v25.9.0
- supabase CLI: v2.95.4 (newer v2.98.1 available, but current version is functional)
- curl: 8.7.1
- gh: authenticated (account: xb1g, scopes: admin:public_key, gist, read:org, repo)

## Environment: PASS
- NEXT_PUBLIC_SUPABASE_URL: set (http://127.0.0.1:54321)
- NEXT_PUBLIC_SUPABASE_ANON_KEY: set (masked)
- SUPABASE_SERVICE_ROLE_KEY: set (masked)
- B2_BUCKET_NAME: set (pseed-dev) — matches expected value ✓
- B2_ENDPOINT: set (s3.us-east-005.backblazeb2.com) — matches expected value ✓
- B2_APPLICATION_KEY_ID: set (masked)
- B2_APPLICATION_KEY: set (masked)

## Supabase: NOT RUNNING
- `supabase status` failed: Docker daemon is not running (OrbStack socket unreachable).
- Local Supabase at http://127.0.0.1:54321 is unavailable for direct DB work.
- Workers needing local DB access must either start Docker/OrbStack or operate against a remote Supabase instance.

## GitHub: PASS
- Authenticated via SSH as xb1g with `repo` scope. Git operations will work.

## Blockers
- Docker/OrbStack daemon is not running, which prevents `supabase status`, `supabase db push`, and any local Supabase operations. Workers needing to apply SQL migrations or test DB changes locally will need Docker started first.

## Recommendations
1. Start Docker/OrbStack daemon before any worker that needs local Supabase DB access (SQL migration workers, DB testing workers).
2. Supabase CLI upgrade (v2.95.4 → v2.98.1) is optional but not blocking.
3. Environment variables are all configured — no .env.local changes needed before starting.
4. For Cloudflare API and Vercel Analytics workers, ensure Cloudflare API token and Vercel token are available (not checked here — may need separate verification if those workers require them).
5. The SQL migration worker can draft the B2→CDN URL rewrite script without a running Supabase, but testing it will require a DB connection.
