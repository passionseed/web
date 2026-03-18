# Draft Activity System

## Overview

The **Draft Activity System** allows administrators and teachers to save incomplete activities while preventing students from accessing them. This enables a work-in-progress workflow where activities can be saved partially and completed later.

## Features

- ✅ **Partial Saves** - Save activities even when required fields are missing
- ✅ **Draft Detection** - Automatically detects which activities are incomplete
- ✅ **Visual Indicators** - Shows draft badge and warning messages
- ✅ **Student Protection** - RLS policies prevent students from seeing/accessing drafts
- ✅ **Admin Access** - Admins and path creators can see and edit all activities including drafts
- ✅ **Smart Validation** - Identifies exactly what's missing from incomplete activities

## Database Schema

### New Columns in `path_activities`

```sql
is_draft BOOLEAN NOT NULL DEFAULT false
draft_reason TEXT
```

**Fields:**
- `is_draft` - Boolean flag indicating if activity is incomplete
- `draft_reason` - Human-readable explanation of what's missing

### Helper Function

```sql
is_activity_complete(activity_id UUID) RETURNS BOOLEAN
```

Checks if an activity has either content or assessment configured.

## Draft Detection Logic

Activities are marked as draft when ANY required field is missing:

| Activity Type | Required Fields | Draft Reason |
|--------------|----------------|--------------|
| Video/PDF/Link | `content_url` | "Missing content URL" |
| Text/Article | `content_body` | "Missing content body" |
| AI Chat | `system_prompt` AND `objective` | "Missing AI chat system prompt" or "Missing AI chat objective" |
| **NPC Conversation** | `conversation_id` | **"Missing conversation selection"** |
| Quiz/Assessment | Assessment configuration | Varies by type |

## User Experience

### For Admins/Teachers (Activity Builder)

#### Draft Warning Banner
When saving an incomplete activity, a yellow warning banner appears:

```
⚠️ Activity Incomplete (Draft Mode)
Missing conversation selection

Students will not be able to access this activity until all required
fields are completed. You can save this as a draft and finish it later.
```

#### Draft Badge in Activity List
Draft activities show a yellow "DRAFT" badge next to their title with the reason:

```
[Activity Title] [DRAFT]
npc_dialogue • Missing conversation selection
```

#### Save Button Label
- **Complete:** "Create Activity" / "Update Activity"
- **Draft:** "Save as Draft" / "Save Draft"

#### Toast Notifications
- **Complete:** "Activity created!" / "Activity updated!"
- **Draft:** "Activity saved as draft!" with draft reason as description

### For Students

Students **cannot see or access** draft activities:
- Draft activities are filtered from activity lists
- Students cannot create progress entries for draft activities
- Attempting to access a draft activity will fail silently

## Row-Level Security (RLS)

### Activity Visibility Policy

```sql
CREATE POLICY "Students can view published activities in enrolled paths"
  ON public.path_activities
  FOR SELECT
  USING (
    is_draft = false
    OR
    -- Admins can see all activities
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
    OR
    -- Path creators can see their own drafts
    EXISTS (SELECT 1 FROM path_days pd JOIN paths p ON p.id = pd.path_id
            WHERE pd.id = path_day_id AND p.created_by = auth.uid())
  );
```

### Progress Tracking Policy

```sql
CREATE POLICY "Students cannot track progress on draft activities"
  ON public.path_activity_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM path_activities WHERE id = activity_id AND is_draft = false)
    OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'teacher'))
  );
```

## Implementation Details

### PathActivityEditor Component

```typescript
// Validation
const isValid = title.trim().length > 0; // Only need title to save

// Completeness check
const isComplete =
  title.trim().length > 0 &&
  (!needsUrl || contentUrl.trim().length > 0) &&
  (!needsBody || contentBody.trim().length > 0) &&
  (!isAIChat || (aiChatMetadata.system_prompt && aiChatMetadata.objective)) &&
  (!isNPCChat || npcChatMetadata.conversation_id);

// Draft reason
const getDraftReason = (): string | null => {
  if (isComplete) return null;
  if (needsUrl && !contentUrl.trim()) return 'Missing content URL';
  if (needsBody && !contentBody.trim()) return 'Missing content body';
  if (isAIChat && !aiChatMetadata.system_prompt) return 'Missing AI chat system prompt';
  if (isAIChat && !aiChatMetadata.objective) return 'Missing AI chat objective';
  if (isNPCChat && !npcChatMetadata.conversation_id) return 'Missing conversation selection';
  return 'Incomplete configuration';
};

// Save with draft status
const activityData = {
  title,
  instructions,
  activity_type: 'learning',
  estimated_minutes,
  is_required,
  is_draft: !isComplete,
  draft_reason: getDraftReason(),
};
```

### PathDayBuilder Component

Shows draft badge in activity list:

```tsx
<div className="flex items-center gap-2">
  <div className="font-medium text-white">{activity.title}</div>
  {activity.is_draft && (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700/50">
      DRAFT
    </span>
  )}
</div>
```

## Workflow Example

### Creating an NPC Conversation Activity (Draft Mode)

1. **Admin creates new activity**
   - Enters title: "Career Exploration Chat"
   - Selects type: "NPC Conversation (Branching Dialogue)"
   - *Doesn't select a conversation yet*

2. **Saves as draft**
   - System detects missing `conversation_id`
   - Sets `is_draft = true`
   - Sets `draft_reason = "Missing conversation selection"`
   - Shows warning banner
   - Button says "Save as Draft"

3. **Activity appears in builder**
   - Shows [DRAFT] badge
   - Shows reason: "Missing conversation selection"
   - Admin can edit anytime

4. **Students cannot access**
   - Activity doesn't appear in student view
   - RLS blocks access even if URL is guessed

5. **Admin completes activity**
   - Selects a conversation from dropdown
   - Clicks "Update Activity"
   - System sets `is_draft = false`
   - Removes `draft_reason`
   - Activity now visible to students

## API Updates

### TypeScript Types

Updated `PathActivity` interface:

```typescript
export interface PathActivity {
  // ... existing fields ...
  is_draft: boolean;
  draft_reason: string | null;
}
```

### Activity Create/Update

API automatically sets draft status based on completeness:

```typescript
POST /api/pathlab/activities
{
  "title": "...",
  "activity_type": "npc_dialogue",
  "is_draft": true,
  "draft_reason": "Missing conversation selection"
}
```

## Migration Files

1. **20260318150000_add_activity_draft_status.sql**
   - Adds `is_draft` and `draft_reason` columns
   - Creates `is_activity_complete()` helper function
   - Adds index for querying published activities

2. **20260318150001_add_draft_activity_rls.sql**
   - Creates RLS policies for draft filtering
   - Prevents students from seeing draft activities
   - Prevents progress tracking on drafts

## Benefits

### For Administrators
- Save work in progress without publishing to students
- No pressure to complete activities in one session
- Clear visibility of what needs to be completed
- Flexible workflow for iterative content creation

### For Students
- Only see complete, ready-to-use activities
- No confusion from incomplete or broken activities
- Better learning experience with quality content
- Protected from accessing unfinished work

### For System
- Data integrity maintained (activities always have valid data)
- Clear separation between draft and published content
- Audit trail of incomplete activities
- Prevents edge cases with missing required data

## Future Enhancements

Potential improvements:
- [ ] Bulk publish/unpublish activities
- [ ] Draft activity dashboard
- [ ] Scheduled publishing (auto-publish at specific time)
- [ ] Draft activity templates
- [ ] Collaborative editing with draft locks
- [ ] Version history for drafts
- [ ] Draft preview mode for students (with admin permission)

---

**Created:** March 18, 2026
**Version:** 1.0.0
