# Vercel Resource Optimization - Deployment Setup

## Changes Implemented

This setup addresses your exceeded Vercel free tier limits:

### 1. Speed Insights Disabled (vercel.json)
- **Problem**: 53K data points vs 10K limit (5.3x exceeded)
- **Fix**: Disabled Speed Insights in `vercel.json`
- **Impact**: Stops data point usage immediately

### 2. GitHub Actions Build Workflow (.github/workflows/deploy.yml)
- **Problem**: 2h 6m build minutes vs 0s on free tier
- **Fix**: Builds run on GitHub Actions (free), deploy prebuilt artifacts to Vercel
- **Impact**: Zero Vercel build minutes used

### 3. API Route Caching
- **Problem**: 1.6M Edge Requests, 1.4M Function Invocations
- **Fix**: Added `Cache-Control` headers to:
  - `/api/maps/list` - 60s cache, 300s stale-while-revalidate
  - `/api/spotify/search` - 300s cache, 600s stale-while-revalidate  
  - `/api/deezer/search` - 300s cache, 600s stale-while-revalidate
  - `/api/apple-music/search` - 300s cache, 600s stale-while-revalidate
  - `/api/assignments` - 30s cache, 120s stale-while-revalidate
  - `/api/maps` - 60s cache, 300s stale-while-revalidate
- **Impact**: Reduced function calls by serving cached responses

### 4. Rate Limiting Middleware (middleware.ts)
- **Problem**: Potential abuse causing high request volume
- **Fix**: 100 requests/minute per IP for API routes
- **Impact**: Prevents abuse, reduces unnecessary invocations

## Required Setup

### 1. GitHub Secrets

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

```
VERCEL_TOKEN          # Get from: vercel tokens create
VERCEL_ORG_ID         # Get from: vercel teams list (or vercel whoami for personal)
VERCEL_PROJECT_ID     # Get from: .vercel/project.json or vercel projects list
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

To get Vercel credentials:
```bash
# Login to Vercel CLI
vercel login

# Get token
vercel tokens create

# Get org and project ID
cat .vercel/project.json
```

### 2. Vercel Project Settings

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > General
4. Set **Build Command**: `echo "Build handled by GitHub Actions"`
5. Set **Output Directory**: `.vercel/output`

This prevents Vercel from running its own builds.

### 3. Disable Speed Insights (if not already)

Go to Vercel dashboard > Your Project > Speed Insights > Disable

## Expected Impact

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Build Minutes | 2h 6m | ~0 | 100% |
| Speed Insights | 53K | 0 | 100% |
| Edge Requests | 1.6M | ~800K | ~50% |
| Function Invocations | 1.4M | ~700K | ~50% |

## Monitoring

Watch your Vercel usage dashboard after deployment:
https://vercel.com/dashboard

If still exceeding limits after these changes, consider:
1. Upgrading to Pro ($20/month)
2. More aggressive caching (increase s-maxage values)
3. Adding a CDN like Cloudflare in front of Vercel

## Next Steps

1. Add GitHub secrets listed above
2. Push this branch to trigger GitHub Actions workflow
3. Verify the workflow runs successfully
4. Monitor Vercel usage for 24-48 hours
5. Adjust cache durations in middleware.ts if needed