# PathLab Page Builder - Deployment Guide

**Version:** 1.0
**Target Date:** TBD
**Status:** Ready for Testing

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All PR reviews approved
- [ ] No merge conflicts with main branch
- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] Linting passes (`pnpm lint`)
- [ ] No console.errors in production code

### 2. Database Preparation
- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify migration rollback scripts
- [ ] Check Supabase connection pool limits (60 connections)

### 3. Environment Variables
```bash
# Add to Vercel/production environment:
NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER=false  # Start disabled
NEXT_PUBLIC_ENABLE_TEMPLATES=true
NEXT_PUBLIC_MAX_ACTIVITIES_PER_PAGE=20
NEXT_PUBLIC_AUTO_SAVE_DEBOUNCE_MS=2000
```

### 4. Testing on Staging
- [ ] All migrations applied successfully
- [ ] API endpoints return expected responses
- [ ] XSS sanitization working (test with `<script>alert(1)</script>`)
- [ ] Authorization checks working (try accessing other users' pages)
- [ ] Auto-save working (edit, wait 2s, refresh page)
- [ ] Drag-drop working (reorder activities)

---

## Deployment Steps

### Step 1: Database Migrations (5 minutes)

**Run migrations in this order:**

```bash
# 1. Connect to production DB
supabase link --project-ref <your-project-ref>

# 2. Check current migration status
supabase db diff

# 3. Apply migrations
supabase db push

# Expected output:
# ✓ Creating activity_templates table
# ✓ Creating page_templates table
# ✓ Adding indexes (6 new indexes)
# ✓ Adding path_days.activity_count column
# ✓ Backfilling activity_count (may take 1-2 minutes for large datasets)
```

**Verify migrations:**

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('activity_templates', 'page_templates');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'activity_templates';

-- Check column added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'path_days'
AND column_name = 'activity_count';
```

### Step 2: Deploy Code (10 minutes)

**Via Vercel CLI:**

```bash
# 1. Build locally first (catch errors early)
pnpm build

# 2. Deploy to preview
vercel

# 3. Test preview deployment
# Visit: https://<preview-url>.vercel.app/seeds/<test-seed-id>/pathlab-builder-new

# 4. Deploy to production (if preview works)
vercel --prod
```

**Via GitHub (recommended):**

```bash
# 1. Merge to main branch
git checkout main
git merge feature/page-builder
git push origin main

# 2. Vercel auto-deploys from main
# Monitor: https://vercel.com/<your-project>/deployments

# 3. Verify deployment succeeds (check logs)
```

### Step 3: Smoke Tests (5 minutes)

**Run these tests immediately after deployment:**

```bash
# 1. Health check
curl https://passionseed.com/api/health

# 2. Template library loads
curl https://passionseed.com/api/pathlab/library \
  -H "Cookie: <your-session-cookie>"

# Expected: 200 OK with templates array

# 3. Create test activity (batch endpoint)
curl -X POST https://passionseed.com/api/pathlab/pages/<test-page-id>/activities \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "activities": [{
      "path_day_id": "<test-page-id>",
      "title": "Smoke Test Activity",
      "activity_type": "learning",
      "display_order": 0,
      "is_required": true
    }]
  }'

# Expected: 200 OK with created activity

# 4. Delete test activity
curl -X DELETE https://passionseed.com/api/pathlab/activities?activityId=<created-id> \
  -H "Cookie: <your-session-cookie>"

# Expected: 200 OK
```

### Step 4: Enable for Admins (Week 1)

```bash
# Update environment variable
vercel env add NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER production
# Value: true

# Redeploy to apply
vercel --prod
```

**Verify:**
- [ ] Admins can access `/seeds/[id]/pathlab-builder-new`
- [ ] Non-admins still see legacy builder (or 404)
- [ ] No errors in Sentry/logs

### Step 5: Gradual Rollout (Weeks 2-4)

**Week 2: 10% of instructors**
```typescript
// In page.tsx, add percentage rollout:
const shouldUseLegacy = !user.isAdmin && Math.random() > 0.1;
```

**Week 3: 50% of instructors**
```typescript
const shouldUseLegacy = !user.isAdmin && Math.random() > 0.5;
```

**Week 4: 100% (full launch)**
```bash
# Make PageBuilder the default at /seeds/[id]/pathlab-builder
# Move legacy to /seeds/[id]/pathlab-builder-legacy
```

**Week 5-6: Monitor & Remove Flag**
```bash
# If no issues, remove feature flag entirely
# Delete old PathDayBuilder component
```

---

## Rollback Procedures

### Immediate Rollback (30 seconds)

**If critical issue detected:**

```bash
# Option 1: Disable via Vercel dashboard
# Go to: Settings > Environment Variables
# Set: NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER = false
# Click: Redeploy

# Option 2: Via CLI
vercel env rm NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER production
vercel --prod
```

**What this does:**
- Users revert to legacy PathDayBuilder
- No data loss (all created activities persist)
- New PageBuilder code still in codebase (inactive)

### Git Revert Rollback (5 minutes)

**If feature flag doesn't help:**

```bash
# 1. Find the merge commit
git log --oneline | grep "page-builder"

# 2. Revert the merge
git revert -m 1 <merge-commit-hash>

# 3. Push revert
git push origin main

# 4. Vercel auto-deploys reverted code
```

**What this does:**
- Removes all PageBuilder code
- Restores only legacy PathDayBuilder
- Database tables remain (safe, unused)

### Database Rollback (2 minutes, DESTRUCTIVE)

**⚠️ Only if database corruption detected:**

```sql
-- BACKUP FIRST
pg_dump -h <host> -U <user> -d <db> > backup.sql

-- Drop new tables (DATA LOSS for templates)
DROP TABLE activity_templates CASCADE;
DROP TABLE page_templates CASCADE;

-- Remove column (safe, just removes count cache)
ALTER TABLE path_days DROP COLUMN activity_count;

-- Remove indexes
DROP INDEX idx_activity_templates_public;
DROP INDEX idx_activity_templates_search;
-- ... (drop all 6 indexes)
```

**When to use:**
- Migration caused data corruption
- Tables blocking other operations
- Feature is permanently cancelled

**What you lose:**
- All activity templates created by users
- All page templates
- Activity count cache (will recalculate on query)

**What you keep:**
- All path_activities (student-facing content)
- All path_days (pages)
- All student progress

---

## Monitoring

### Key Metrics to Watch

**Day 1 (First 24 hours):**
- Error rate: Should be <1%
- Page load time: p95 <3s
- API response time: p95 <500ms
- Auto-save failure rate: <5%
- XSS attempts blocked: Any >0 triggers alert

**Week 1:**
- User adoption: % of instructors using new builder
- Activity creation rate: Activities created/day
- Template usage: % of activities from templates
- Average activities per page: Should be 5-10

**Week 2-4:**
- Feedback score: User satisfaction surveys
- Support tickets: Issues reported
- Performance trends: Page load times over time

### Alerts to Configure

**Critical (PagerDuty):**
- Error rate >10% (5 min window)
- API timeouts >50% (5 min window)
- XSS attempt detected (immediate)
- Authorization failures >20 (5 min window)

**Warning (Slack):**
- Error rate >5% (15 min window)
- Auto-save failure rate >10% (15 min window)
- Page load time p95 >5s (15 min window)

### Dashboard to Create

**Grafana panels:**
1. Error Rate (line graph, last 24h)
2. API Response Times (histogram, p50/p95/p99)
3. Activities Created (counter, last 7d)
4. Template Library Size (gauge)
5. Active Page Builders (gauge, real-time)

---

## Troubleshooting

### Issue: "Failed to load activity library"

**Symptoms:**
- Empty library in left sidebar
- Console error: `Failed to fetch templates`

**Diagnosis:**
```bash
# Check API endpoint
curl https://passionseed.com/api/pathlab/library \
  -H "Cookie: <session>"

# Check Supabase logs
supabase logs --project <ref> --type api
```

**Solutions:**
1. Check RLS policies on `activity_templates`
2. Check user has `instructor` or `admin` role
3. Check Supabase connection pool (may be exhausted)

### Issue: Activities not saving

**Symptoms:**
- Auto-save shows "Saving..." forever
- Manual save button disabled
- No errors in console

**Diagnosis:**
```javascript
// Open browser console
localStorage.getItem('draft_page_<page-id>')
// Should show draft data
```

**Solutions:**
1. Check network tab for failed API calls
2. Check localStorage quota (may be full)
3. Clear old drafts: `localStorage.clear()`
4. Check auth session (may have expired)

### Issue: XSS content getting through

**Symptoms:**
- Script tags executing in activity content
- Alert boxes appearing

**Diagnosis:**
```bash
# Check sanitization logs
grep "XSS attempt" /var/log/app.log
```

**Solutions:**
1. Verify `sanitize-html` is installed
2. Check `sanitizeContent()` is called before save
3. Update allowedTags list if needed
4. Report to security team immediately

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates daily
- [ ] Review Sentry errors
- [ ] Check user feedback in support tickets
- [ ] Measure page load times

### Week 2
- [ ] Send survey to early adopters (admins)
- [ ] Analyze usage metrics (activities created, templates used)
- [ ] Fix any critical bugs reported
- [ ] Prepare for 10% rollout

### Week 3-4
- [ ] Gradual rollout to all instructors
- [ ] Continue monitoring + fixing bugs
- [ ] Document common issues

### Week 5-6
- [ ] Full launch (100%)
- [ ] Remove feature flag
- [ ] Delete legacy PathDayBuilder code
- [ ] Write retrospective

### Month 2
- [ ] Plan Phase 2 features (cross-seed templates)
- [ ] Optimize based on real-world usage
- [ ] Add missing features (undo, duplicate page)

---

## Success Criteria

**Define success before launch:**

✅ **Must Have (Launch Blockers):**
- Zero critical security issues
- Error rate <1%
- No data loss reported
- Authorization working correctly

✅ **Should Have (Quality Targets):**
- Page load time p95 <3s
- User satisfaction score >4/5
- 80% of instructors adopt new builder within 4 weeks
- Support tickets <5/week

✅ **Nice to Have (Future Improvements):**
- Template library >50 public templates
- Average page build time <10 minutes
- Student engagement metrics improve

---

## Contacts

**Technical Issues:**
- Slack: #pathlab-dev
- On-call: Check PagerDuty rotation

**Product Questions:**
- Product Manager: [Name]
- Design Lead: [Name]

**Security Issues:**
- Security Team: security@passionseed.com
- Escalation: Immediate PagerDuty alert

---

## Appendix: Migration SQL Reference

**Rollback migration (if needed):**

```sql
-- Save this as: rollback_page_builder.sql
BEGIN;

-- 1. Drop new tables
DROP TABLE IF EXISTS activity_templates CASCADE;
DROP TABLE IF EXISTS page_templates CASCADE;

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_activity_templates_created_by;
DROP INDEX IF EXISTS idx_activity_templates_public;
DROP INDEX IF EXISTS idx_activity_templates_search;
DROP INDEX IF EXISTS idx_page_templates_visibility;
DROP INDEX IF EXISTS idx_page_templates_search;
DROP INDEX IF EXISTS idx_path_activities_bulk_fetch;

-- 3. Remove column (optional, data loss of count cache)
-- ALTER TABLE path_days DROP COLUMN IF EXISTS activity_count;

COMMIT;
```

**Run rollback:**
```bash
psql <connection-string> < rollback_page_builder.sql
```

---

**Last Updated:** March 17, 2026
**Next Review:** Post-launch (Week 6)
