# Vercel Resource Optimization - Deployment Setup

## Changes Implemented

This setup addresses your exceeded Vercel free tier limits:

### 1. Speed Insights Disabled (vercel.json)
- **Problem**: 53K data points vs 10K limit (5.3x exceeded)
- **Fix**: Disabled Speed Insights in `vercel.json`
- **Impact**: Stops data point usage immediately

### 2. GitHub Actions Build Workflow (.github/workflows/deploy.yml)
- **Problem**: 2h 6m build minutes vs 0s on free tier
- **Fix**: Uses `vercel build` on GitHub Actions (free), deploys prebuilt artifacts
- **Impact**: Zero Vercel build minutes used
- **Note**: Uses `vercel build` (not `next build`) to produce correct `.vercel/output`

### 3. API Route Caching (proxy.ts)
- **Problem**: 1.6M Edge Requests, 1.4M Function Invocations
- **Fix**: Added cache headers in proxy.ts (merged with existing session handling):
  - `/api/maps/*` - 60s s-maxage, 300s stale-while-revalidate
  - `/api/assignments/*` - 30s s-maxage, 120s stale-while-revalidate
  - `/api/hero-galaxy` - 300s s-maxage, 600s stale-while-revalidate
  - `/api/tcas/*` - 300s s-maxage, 600s stale-while-revalidate
  - `*/search`, `*/list` endpoints - 300s s-maxage, 600s stale-while-revalidate
- **Matcher scope**: Tight allowlist to avoid unnecessary edge executions
- **Impact**: CDN caching reduces function invocations

### 4. Data Folder Caching (vercel.json)
- **Source**: `/data/hackathon/problems/*`
- **Cache**: 3600s s-maxage, 86400s stale-while-revalidate

## Required Setup

### 1. CRITICAL: Disable Vercel Git Integration

**This is mandatory** - otherwise Vercel will still build on every push:

1. Go to Vercel Dashboard → Your Project
2. Settings → Git
3. **Uncheck** "Build every push" or disconnect the Git integration
4. Only deploy via GitHub Actions CLI from now on

### 2. GitHub Secrets

Add these secrets (Settings → Secrets and variables → Actions):

```
VERCEL_TOKEN          # vercel tokens create
VERCEL_ORG_ID         # cat .vercel/project.json
VERCEL_PROJECT_ID     # cat .vercel/project.json
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Get credentials:
```bash
vercel login
vercel tokens create
cat .vercel/project.json
```

### 3. Verify Cache is Working (After Deployment)

Test that caching actually reduces invocations:

```bash
# Test an API endpoint
curl -I https://your-app.vercel.app/api/maps

# Check for these headers:
# cache-control: public, s-maxage=60, stale-while-revalidate=300
# x-vercel-cache: HIT (or STALE on first request)
```

If you see `x-vercel-cache: MISS` on repeat requests, caching isn't working.

## Expected Impact

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Build Minutes | 2h 6m | ~0 | 100% |
| Speed Insights | 53K | 0 | 100% |
| Edge Requests | 1.6M | Variable* | Depends on cache HIT rate |
| Function Invocations | 1.4M | Variable* | Depends on cache HIT rate |

*Cache effectiveness depends on traffic patterns and whether requests vary by cookies/auth.

## Monitoring

Watch your Vercel usage dashboard:
https://vercel.com/dashboard

Check for:
- Build minutes stopped increasing
- `x-vercel-cache: HIT` on repeat API requests
- Reduced function invocation count

## Troubleshooting

**Build minutes still increasing?**
→ Vercel Git Integration not disabled. Check project settings.

**Cache always showing MISS?**
→ Requests may have cookies/auth headers that prevent caching. Check with `curl -I`.

**Function invocations not decreasing?**
→ Most traffic may be authenticated (can't be cached). Consider:
- Reducing client-side polling intervals
- Adding client-side caching (SWR with longer dedupe intervals)
- Upgrading to Pro plan ($20/month)

## Next Steps

1. **Disable Vercel Git Integration** (critical)
2. Add GitHub secrets
3. Push to trigger GitHub Actions workflow
4. Verify `x-vercel-cache: HIT` on API endpoints
5. Monitor usage for 48 hours

If still exceeding limits, the Pro plan ($20/month) may be necessary for your traffic volume.