# PathLab Page Builder Architecture

**Version:** 1.0
**Status:** Ready for Testing
**Created:** March 17, 2026

---

## Overview

The PathLab Page Builder is a complete refactor of the PathLab content creation system, transforming from a single-activity-per-session workflow to a modern three-panel interface inspired by visual page builders.

### Key Changes

**Before (PathDayBuilder):**
- Terminology: "Activities" at day level (confusing)
- One activity edited at a time
- Must save before adding more
- Node-based (map dependency)
- 937-line monolithic component

**After (PageBuilder):**
- Clear hierarchy: Page → Activities → Content/Assessment
- Multi-activity creation in one session
- Drag-drop from template library
- Direct content creation (no map needed)
- Modular architecture (<300 lines per component)

---

## Architecture

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Page Title, Save Button, Metadata                 │
├──────────────┬──────────────────────────┬──────────────────┤
│              │                          │                  │
│  Activity    │   Page Timeline          │  Page Settings   │
│  Library     │   (Center Canvas)        │  (Right Panel)   │
│  (Left)      │                          │                  │
│              │                          │                  │
│  [Template]  │  ┌─────────────────┐    │  Title: _____    │
│  [Template]  │  │ Activity 1      │    │  Context: ____   │
│  [Template]  │  │ - Video         │    │  Prompts: ____   │
│              │  │ - 15 min        │    │                  │
│  [+ Custom]  │  └─────────────────┘    │  Stats:          │
│              │                          │  - 3 activities  │
│              │  ┌─────────────────┐    │  - 45 min total  │
│              │  │ Activity 2      │    │                  │
│              │  │ - Reading       │    │                  │
│              │  └─────────────────┘    │                  │
│              │                          │                  │
│              │  [+ Add Activity]        │                  │
└──────────────┴──────────────────────────┴──────────────────┘
```

### Component Hierarchy

```
PageBuilder (index.tsx)
├── ActivityLibrary (left sidebar)
│   └── Fetches templates from /api/pathlab/library
│
├── PageTimeline (center canvas)
│   ├── SortableActivityCard (drag-drop)
│   └── Uses @dnd-kit for reordering
│
└── PageSettings (right sidebar)
    └── Page metadata (title, context, prompts)

Hooks:
├── usePageBuilder - State management
├── useAutoSave - Debounced auto-save + localStorage backup
└── useUnsavedChanges - Browser navigation warning
```

### Data Flow

**Activity Creation Flow:**
```
1. User selects template from library
   ↓
2. Template data pre-fills PathActivityEditor
   ↓
3. User customizes (title, URL, instructions)
   ↓
4. Click "Create Activity"
   ↓
5. POST /api/pathlab/pages/[id]/activities (batch)
   ↓
6. Activity + Content + Assessment created in one transaction
   ↓
7. UI updates optimistically
   ↓
8. Auto-save triggers (2s debounce)
   ↓
9. localStorage draft cleared on success
```

**Auto-Save Flow:**
```
User edits page
   ↓
Immediate: Save to localStorage (crash recovery)
   ↓
Debounce 2s
   ↓
API call: POST /api/pathlab/days
   ↓
Success: Clear localStorage draft
Failure: Keep draft, show retry toast
```

---

## Database Schema

### New Tables

**activity_templates**
- Reusable activity blueprints
- `is_public` for sharing (admin-only public templates)
- `use_count` for popularity ranking
- Full-text search on title + description

**page_templates**
- Pre-built page structures (multiple activities)
- `visibility`: private | organization | public
- JSONB `activities` array

**path_days.activity_count** (new column)
- Cached count, updated via trigger
- Prevents COUNT(*) queries on page load

### Indexes Added

```sql
-- Activity templates
CREATE INDEX idx_activity_templates_public ON activity_templates(is_public);
CREATE INDEX idx_activity_templates_search USING gin(to_tsvector(...));

-- Performance
CREATE INDEX idx_path_activities_bulk_fetch ON path_activities(path_day_id, display_order);
CREATE INDEX idx_path_content_display_order ON path_content(activity_id, display_order);
```

---

## API Endpoints

### Batch Activity Creation

`POST /api/pathlab/pages/[id]/activities`

**Request:**
```json
{
  "activities": [
    {
      "path_day_id": "uuid",
      "title": "Intro Video",
      "activity_type": "learning",
      "display_order": 0,
      "estimated_minutes": 15,
      "is_required": true
    }
  ],
  "content": [
    {
      "content_type": "video",
      "content_url": "https://youtube.com/..."
    }
  ],
  "assessments": []
}
```

**Response (Success):**
```json
{
  "message": "5 activities created",
  "activities": [...]
}
```

**Response (Partial Failure):**
```json
{
  "error": "3 of 5 operations succeeded",
  "succeeded": [...],
  "failed": [
    { "index": 3, "error": "Title is required" },
    { "index": 4, "error": "Invalid URL" }
  ]
}
```
**Status:** 207 Multi-Status

### Activity Library

`GET /api/pathlab/library?type=learning&search=video&sortBy=popular`

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "title": "Short Video Template",
      "description": "For videos under 2 minutes",
      "activity_type": "learning",
      "content_template": { "content_type": "short_video" },
      "estimated_minutes": 5,
      "is_public": true,
      "use_count": 42
    }
  ],
  "total": 15
}
```

---

## Security

### XSS Prevention

**All user content sanitized:**
```typescript
import sanitizeHtml from 'sanitize-html';

// In lib/pathlab/sanitization.ts
export function sanitizeContent(body: string): string {
  return sanitizeHtml(body, {
    allowedTags: ['p', 'br', 'strong', 'em', 'h1', 'h2', ...],
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
```

**Blocked URL schemes:**
- `javascript:`
- `data:`
- `file:`
- `vbscript:`

**Security logging:**
```typescript
if (sanitized !== original) {
  logXssAttempt(userId, content, 'activity_content');
}
```

### Authorization

**Ownership verification chain:**
```
Activity → Page (path_day) → Path → Seed → created_by
```

Every API call verifies:
1. User is authenticated
2. User owns the seed OR is admin
3. Resource exists
4. No student progress (for deletes)

**RLS Policies:**
- Users can only view/edit their own templates + public templates
- Only admins can create public templates
- All activity/content operations scoped to seed ownership

---

## Performance

### N+1 Query Prevention

**Before:**
```typescript
for (const day of days) {
  const activities = await fetch(`/api/pathlab/activities?dayId=${day.id}`);
}
// 10 days = 10 API calls
```

**After:**
```typescript
const { data } = await supabase
  .from('path_activities')
  .select('*, path_content(*), path_assessment(*)')
  .in('path_day_id', dayIds);
// 1 API call for all days
```

### Activity Limit

**20 activities per page** (enforced at API level)

**Rationale:**
- Performance: 20 activities = ~2s page load
- Pedagogy: Forces focused page design
- User experience: Prevents overwhelming students

**Alternative considered:** Virtual scrolling (deferred to Phase 2)

---

## Feature Flags

**Environment Variables:**

```bash
# Enable new PageBuilder UI (default: false)
NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER=true

# Enable activity templates (default: true)
NEXT_PUBLIC_ENABLE_TEMPLATES=true

# Max activities per page (default: 20)
NEXT_PUBLIC_MAX_ACTIVITIES_PER_PAGE=20

# Auto-save debounce (default: 2000ms)
NEXT_PUBLIC_AUTO_SAVE_DEBOUNCE_MS=2000
```

**Usage:**
```typescript
import { FEATURE_FLAGS } from '@/lib/feature-flags';

if (FEATURE_FLAGS.USE_NEW_PAGE_BUILDER) {
  return <PageBuilder />;
} else {
  return <PathDayBuilder />; // Legacy
}
```

---

## Error Handling

### Partial Batch Failures

When creating 10 activities, if 3 fail:
1. API returns 207 Multi-Status
2. UI shows which activities succeeded/failed
3. User can retry failed activities individually
4. Succeeded activities are already saved

### Auto-Save Failures

1. Save to localStorage immediately (crash recovery)
2. API call fails → keep draft, show toast
3. Retry with exponential backoff (3 attempts)
4. If still failing → show "Saved locally" indicator

### localStorage Quota Exceeded

1. Catch `QuotaExceededError`
2. Clear old drafts (keep last 5, LRU eviction)
3. Retry save
4. If still fails → show warning, continue without draft

---

## Testing Strategy

### Unit Tests (lib/pathlab/)
- `sanitization.ts` - XSS prevention
- `validation.ts` - Input validation (20-activity limit)
- `authorization.ts` - Ownership verification
- `errors.ts` - Error handling + retry logic

### Integration Tests (app/api/pathlab/)
- Batch activity creation (success + partial failure)
- Activity library fetch (search + filter)
- Template creation (public vs private)
- Activity deletion (with student progress check)

### E2E Tests (Playwright)
- Full page building flow (add 5 activities, save)
- Drag-drop reordering
- Auto-save (edit → wait 2s → verify saved)
- Unsaved changes warning (navigate away)
- Offline mode (save to localStorage, sync on reconnect)

---

## Deployment

### Migration Order

1. **Apply migrations:**
   ```bash
   supabase db push
   # Creates: activity_templates, page_templates, indexes
   # Adds: path_days.activity_count column
   ```

2. **Deploy API code:**
   - New endpoints available immediately
   - Old endpoints unchanged (backward compatible)

3. **Deploy frontend code:**
   - PageBuilder available at `/seeds/[id]/pathlab-builder-new`
   - Legacy PathDayBuilder at `/seeds/[id]/pathlab-builder`

4. **Gradual rollout:**
   - Week 1: Admins only
   - Week 2: 10% of instructors
   - Week 3: 50% of instructors
   - Week 4: 100%

### Rollback Plan

**Option 1: Feature Flag (30 seconds)**
```bash
NEXT_PUBLIC_ENABLE_NEW_PAGE_BUILDER=false
```

**Option 2: Git Revert (5 minutes)**
```bash
git revert <commit-hash>
git push
# Trigger redeploy
```

**Option 3: DB Rollback (2 minutes, DATA LOSS)**
```sql
DROP TABLE activity_templates CASCADE;
DROP TABLE page_templates CASCADE;
ALTER TABLE path_days DROP COLUMN activity_count;
```

**Preferred:** Option 1 (safest, no data loss)

---

## Known Limitations

1. **No concurrent editing** - Last-write-wins (optimistic locking deferred to Phase 2)
2. **No undo/redo** - Deferred to Phase 2
3. **No page duplication** - Deferred to Phase 2
4. **No activity library import** - Deferred to Phase 2
5. **No real-time collaboration** - Deferred to Phase 3

---

## Future Enhancements

### Phase 2: Cross-Seed Templates (Q2 2026)
- Share templates between seeds
- Template marketplace (browse, clone, rate)
- Organization template libraries

### Phase 3: AI-Assisted Builder (Q3 2026)
- "Create a 3-day intro page" → AI generates activities
- AI suggests relevant templates
- Generate quiz questions from content

### Phase 4: Collaborative Editing (Q4 2026)
- Real-time cursors + presence
- Conflict-free replicated data types (CRDTs)
- Comment threads on activities

---

## Troubleshooting

### "Maximum 20 activities per page"
- This is intentional (performance + pedagogy)
- Split complex pages into multiple pages
- Contact admin to increase limit (not recommended)

### "Failed to load activity library"
- Check Supabase connection
- Check RLS policies (`SELECT` on `activity_templates`)
- Check browser console for CORS errors

### Auto-save not working
- Check feature flag: `NEXT_PUBLIC_ENABLE_AUTO_SAVE`
- Check debounce time (default 2s)
- Check browser localStorage (not full?)
- Check network tab for API errors

### Activities not reordering
- Check that `@dnd-kit` is installed
- Check for JS errors in console
- Verify activities have unique IDs

---

## Contact

**Maintainer:** PathLab Team
**Documentation:** This file + inline code comments
**Issues:** GitHub Issues or Slack #pathlab-dev

**Last Updated:** March 17, 2026
