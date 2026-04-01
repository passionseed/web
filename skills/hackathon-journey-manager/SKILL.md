---
name: hackathon-journey-manager
description: Manage hackathon journey phases and activities — create, edit, and organize multi-phase hackathon programs with activities, content, and assessments. Works like PathLab but for hackathon programs.
---

# Hackathon Journey Manager

Manage hackathon programs with dynamic phases, activities, content, and assessments. Same model as PathLab but optimized for hackathon workflows.

## Overview

- **Migration** creates tables (one-time setup)
- **UI/API** creates and edits content (ongoing)
- **RLS**: Authenticated users can view; service_role only for writes

## Schema

```
hackathon_programs
  └── hackathon_program_phases (phases within a program)
        └── hackathon_phase_activities (activities within a phase)
              ├── hackathon_phase_activity_content (videos, text, AI chats, etc.)
              └── hackathon_phase_activity_assessments (submissions, grading)
```

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hackathon_programs` | Hackathon programs | `slug`, `title`, `description`, `status` |
| `hackathon_program_phases` | Phases within a program | `program_id`, `slug`, `title`, `phase_number`, `starts_at`, `ends_at`, `due_at` |
| `hackathon_phase_activities` | Activities within a phase | `phase_id`, `title`, `instructions`, `display_order`, `estimated_minutes`, `is_required`, `is_draft` |
| `hackathon_phase_activity_content` | Content items per activity | `activity_id`, `content_type`, `content_title`, `content_url`, `content_body`, `display_order`, `metadata` |
| `hackathon_phase_activity_assessments` | Assessment per activity | `activity_id`, `assessment_type`, `points_possible`, `is_graded`, `metadata` |

### Content Types

- `video` — Full-length video content
- `short_video` — Short video clips
- `canva_slide` — Canva presentation slides
- `text` — Text content/instructions
- `image` — Image content
- `pdf` — PDF documents
- `ai_chat` — AI-powered chat experiences (links to `/chat/*` routes)
- `npc_chat` — NPC conversation journeys

### Assessment Types

- `text_answer` — Written response (metadata: `min_words`, `submission_label`)
- `file_upload` — File submission (metadata: `rubric`, `submission_label`)
- `image_upload` — Image submission

## API Functions

**File:** `lib/hackathonPhaseActivity.ts`

### Read Operations

```typescript
// Get single phase with all activities, content, and assessments
const phase = await getPhaseBySlug(programId, 'ideation')

// Get all phases for a program
const phases = await getAllPhases(programId)

// Get single activity with content and assessment
const activity = await getActivityById(activityId)
```

### Create Operations

```typescript
// Create a phase
const phase = await createPhase({
  program_id: programId,
  slug: 'ideation',
  title: 'Ideation',
  description: 'Discover your interests...',
  phase_number: 1,
  starts_at: '2026-04-01T00:00:00Z',
  ends_at: '2026-04-08T00:00:00Z'
})

// Create an activity
const activity = await createActivity({
  phase_id: phaseId,
  title: 'Know Yourself',
  instructions: 'Complete a self-assessment...',
  display_order: 1,
  estimated_minutes: 30,
  is_required: true
})

// Add content to an activity
await addActivityContent({
  activity_id: activityId,
  content_type: 'ai_chat',
  content_title: 'Career Interest Chat',
  content_url: '/chat/career-interests',
  display_order: 1
})

// Add assessment to an activity
await addActivityAssessment({
  activity_id: activityId,
  assessment_type: 'text_answer',
  points_possible: 10,
  is_graded: true,
  metadata: { min_words: 50, submission_label: 'My Top 3 Interests' }
})
```

### Update Operations

```typescript
// Update phase
await updatePhase(phaseId, { title: 'New Title', description: '...' })

// Update activity (e.g., toggle draft status)
await updateActivity(activityId, { is_draft: false, display_order: 2 })

// Update content
await updateContent(contentId, { content_title: 'Updated Title' })

// Update assessment
await updateAssessment(activityId, { points_possible: 15 })
```

### Delete Operations

```typescript
await deletePhase(phaseId)           // CASCADE deletes activities
await deleteActivity(activityId)      // CASCADE deletes content/assessments
await deleteContent(contentId)
await deleteAssessment(activityId)
```

## Database Helper Functions

Migration includes PostgreSQL functions for admin UI:

```sql
SELECT create_hackathon_phase(
  p_program_id := '...',
  p_slug := 'ideation',
  p_title := 'Ideation',
  p_phase_number := 1
)

SELECT create_hackathon_activity(
  p_phase_id := '...',
  p_title := 'Know Yourself',
  p_display_order := 1,
  p_estimated_minutes := 30
)

SELECT add_hackathon_activity_content(
  p_activity_id := '...',
  p_content_type := 'ai_chat',
  p_content_title := 'Career Chat',
  p_content_url := '/chat/career'
)

SELECT add_hackathon_activity_assessment(
  p_activity_id := '...',
  p_assessment_type := 'text_answer',
  p_points_possible := 10,
  p_is_graded := true
)
```

## Typical Hackathon Structure

| Phase | Activities | Duration | Purpose |
|-------|------------|----------|---------|
| 1. Ideation | Self-assessment, Problem discovery, Solution brainstorming | 7 days | Find problem worth solving |
| 2. Build | Project planning, Development, Mentor check-ins | 14 days | Build solution |
| 3. Reflection | Portfolio creation, Learnings documentation | 3 days | Document journey |
| 4. Showcase | Final pitch, Judging, Awards | 2 days | Present and celebrate |

## Activity Template

```typescript
{
  title: string,
  instructions: string,
  display_order: number,
  estimated_minutes: number,
  is_required: true,
  content: [
    { content_type: 'text' | 'video' | 'ai_chat', ... },
    { content_type: 'ai_chat', content_url: '/chat/...' }
  ],
  assessment: {
    assessment_type: 'text_answer' | 'file_upload',
    points_possible: number,
    metadata: { min_words?, rubric?, submission_label? }
  }
}
```

## Draft Workflow

1. Create activities with `is_draft: true`
2. Add/edit content freely
3. Set `is_draft: false` when ready to publish
4. Users only see non-draft activities

## Pitfalls

- **program_id required** — Must create `hackathon_programs` record first
- **CASCADE deletes** — Deleting phase deletes all activities; deleting activity deletes content/assessments
- **One assessment per activity** — `UNIQUE(activity_id)` constraint
- **Service role only** — Write operations require service role key (server-side)
- **display_order** — Must set explicitly for content items within activity

## Files

- **Migration:** `supabase/migrations/20260401000000_hackathon_phase_activities.sql`
- **Types:** `types/hackathon-phase-activity.ts`
- **API:** `lib/hackathonPhaseActivity.ts`

## Related

- pathlab — Similar dynamic content model for learning paths
- hackathon-submissions — Submission tracking (individual and team)
- submission-grades — Grading and rubric scoring
