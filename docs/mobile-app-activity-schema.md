# Mobile App - Activity Schema Changes

## Overview

The activity system has been simplified to remove redundant type fields. Each activity now has a **single primary type** determined by its content or assessment.

## Breaking Changes

### REMOVED: `activity_type` field

The `path_activities` table **no longer has** an `activity_type` column.

**Before:**
```json
{
  "id": "1ba074b9-6b23-4a4c-ae21-a0ea09d1b61f",
  "activity_type": "learning",  // ❌ REMOVED
  "title": "Chat",
  "path_content": [{
    "content_type": "npc_chat",  // ✅ THIS is the activity type
    ...
  }]
}
```

**After:**
```json
{
  "id": "1ba074b9-6b23-4a4c-ae21-a0ea09d1b61f",
  "title": "Chat",
  "path_content": [{
    "content_type": "npc_chat",  // ✅ Use THIS to determine activity type
    ...
  }]
}
```

### REMOVED: `content_count` and `assessments_count`

These derived fields are no longer returned. Each activity has **exactly ONE** of the following:
- **Content** (path_content array with 1 item) - for media/interactive activities
- **Assessment** (path_assessment object) - for quizzes/reflections

## How to Determine Activity Type

### Step 1: Check if activity has content or assessment

```typescript
if (activity.path_content && activity.path_content.length > 0) {
  // This is a CONTENT activity
  const activityType = activity.path_content[0].content_type;
  // activityType will be: 'npc_chat', 'ai_chat', 'video', 'text', etc.
}
else if (activity.path_assessment) {
  // This is an ASSESSMENT activity
  const activityType = activity.path_assessment.assessment_type;
  // activityType will be: 'quiz', 'daily_reflection', 'daily_prompt', etc.
}
```

### Step 2: Render based on type

```typescript
// Example activity type detection
function getActivityType(activity: FullPathActivity): string {
  if (activity.path_content?.[0]) {
    return activity.path_content[0].content_type;
  }
  if (activity.path_assessment) {
    return activity.path_assessment.assessment_type;
  }
  return 'unknown';
}

// Example rendering logic
function renderActivity(activity: FullPathActivity) {
  const type = getActivityType(activity);

  switch (type) {
    case 'npc_chat':
      return <NPCConversationScreen
        conversationId={activity.path_content[0].metadata.conversation_id}
        progressId={progressId}
      />;

    case 'ai_chat':
      return <AIChatScreen
        systemPrompt={activity.path_content[0].metadata.system_prompt}
        objective={activity.path_content[0].metadata.objective}
      />;

    case 'video':
      return <VideoPlayer url={activity.path_content[0].content_url} />;

    case 'text':
      return <TextContent body={activity.path_content[0].content_body} />;

    case 'quiz':
      return <QuizScreen
        questions={activity.path_assessment.quiz_questions}
        assessmentId={activity.path_assessment.id}
      />;

    case 'daily_reflection':
      return <ReflectionScreen
        prompts={activity.path_assessment.metadata.prompts}
      />;

    default:
      return <ErrorScreen message={`Unknown activity type: ${type}`} />;
  }
}
```

## Activity Types Reference

### Content Types (`path_content.content_type`)

| Type | Description | Metadata |
|------|-------------|----------|
| `npc_chat` | Branching NPC conversation | `{ conversation_id }` |
| `ai_chat` | AI chatbot with objective | `{ system_prompt, objective }` |
| `video` | Video content | `content_url` |
| `short_video` | Short video (< 2min) | `content_url` |
| `text` | Text/article | `content_body` |
| `image` | Image content | `content_url` |
| `pdf` | PDF document | `content_url` |
| `canva_slide` | Canva presentation | `content_url` |
| `resource_link` | External link | `content_url` |
| `daily_prompt` | Daily question | `content_body` |

### Assessment Types (`path_assessment.assessment_type`)

| Type | Description | Fields |
|------|-------------|--------|
| `quiz` | Multiple choice quiz | `quiz_questions[]` |
| `daily_reflection` | Daily reflection prompts | `metadata.prompts` |
| `daily_prompt` | Daily writing prompt | `metadata.prompt` |
| `text_answer` | Long-form text answer | - |
| `file_upload` | File submission | - |
| `checklist` | Task checklist | `metadata.items` |

## Migration Guide

### Before (Old Code)

```typescript
// ❌ OLD: Checking activity_type
if (activity.activity_type === 'learning') {
  if (activity.content_types.includes('npc_chat')) {
    renderNPCChat();
  }
}

// ❌ OLD: Using content_count
if (activity.content_count > 0) {
  // handle content
}
if (activity.assessments_count > 0) {
  // handle assessment
}
```

### After (New Code)

```typescript
// ✅ NEW: Check content_type directly
const contentType = activity.path_content?.[0]?.content_type;
if (contentType === 'npc_chat') {
  renderNPCChat();
}

// ✅ NEW: Check for content or assessment
if (activity.path_content && activity.path_content.length > 0) {
  // handle content
  const content = activity.path_content[0];
  renderContent(content);
}
else if (activity.path_assessment) {
  // handle assessment
  renderAssessment(activity.path_assessment);
}
```

## Example API Responses

### NPC Chat Activity

```json
{
  "activity": {
    "id": "1ba074b9-6b23-4a4c-ae21-a0ea09d1b61f",
    "path_day_id": "f334c2cd-b840-4227-a98c-563d716b1cff",
    "title": "Chat with Career Expert",
    "instructions": null,
    "display_order": 0,
    "estimated_minutes": null,
    "is_required": true,
    "is_draft": false,
    "path_content": [
      {
        "id": "71e7b493-d9ec-44c9-98e7-80762ff990ae",
        "content_type": "npc_chat",
        "content_url": null,
        "content_body": null,
        "metadata": {
          "conversation_id": "2b2eebd1-ec97-4fbc-8ef3-13d1c44f4b54",
          "allow_restart": false,
          "show_history": true
        }
      }
    ],
    "path_assessment": null
  }
}
```

### Quiz Activity

```json
{
  "activity": {
    "id": "abc123...",
    "title": "Understanding Variables",
    "path_content": [],
    "path_assessment": {
      "id": "def456...",
      "assessment_type": "quiz",
      "points_possible": 100,
      "is_graded": true,
      "quiz_questions": [
        {
          "question_text": "What is a variable?",
          "question_type": "multiple_choice",
          "options": ["A storage location", "A function", "A loop"],
          "correct_answer": 0
        }
      ]
    }
  }
}
```

## Testing Checklist

- [ ] Update mobile app TypeScript types to remove `activity_type`
- [ ] Remove references to `content_count` and `assessments_count`
- [ ] Update activity rendering logic to use `content_type` or `assessment_type`
- [ ] Test all activity types: npc_chat, ai_chat, video, quiz, etc.
- [ ] Ensure backward compatibility if needed (gradual rollout)

## Questions?

If you encounter issues or need clarification, check:
1. `types/pathlab-content.ts` - TypeScript type definitions
2. `docs/npc-conversation-system.md` - NPC chat system docs
3. `/api/pathlab/activities` - Activity API endpoints
