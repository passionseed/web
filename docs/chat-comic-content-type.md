# Chat Comic Content Type — Backend Guide

**Version:** 1.0
**Date:** April 25, 2026
**For:** Mobile app frontend team

---

## Overview

`chat_comic` is a new content type for hackathon phase activities. It presents learning content as an interactive group chat where the student is an observer. Students click to reveal new messages, creating a conversational, immersive learning experience.

---

## Database Schema

### Content Type Enum

Updated in `types/hackathon-phase-activity.ts`:

```typescript
export type ContentType =
  | 'video'
  | 'short_video'
  | 'canva_slide'
  | 'text'
  | 'image'
  | 'pdf'
  | 'ai_chat'
  | 'npc_chat'
  | 'chat_comic';  // <-- NEW
```

Database constraint updated to allow `chat_comic` in `hackathon_phase_activity_content.content_type`.

### Content Table Structure

The chat comic data is stored in `hackathon_phase_activity_content`:

| Column | Type | Notes |
|--------|------|-------|
| `activity_id` | uuid | FK to hackathon_phase_activities |
| `content_type` | text | `'chat_comic'` |
| `content_title` | text | Chat title (e.g., "The Hypothesis Chat") |
| `content_body` | text | **JSON string** containing messages array |
| `display_order` | int | Order within activity |
| `metadata` | jsonb | UI configuration (chat_style, click_to_reveal, etc.) |

---

## Content Body JSON Format

The `content_body` field contains a JSON string with this structure:

```json
{
  "messages": [
    {
      "sender": "Mentor Kai",
      "avatar": "👨‍🏫",
      "type": "text",
      "content": "Hey team! So you finished Phase 1..."
    },
    {
      "sender": "Team Alpha",
      "avatar": "🧑‍💻",
      "type": "image",
      "content": "https://storage.passionseed.com/hackathon/phase2/hypothesis-example.png",
      "caption": "See the difference?"
    },
    {
      "sender": "Mentor Kai",
      "avatar": "👨‍🏫",
      "type": "video",
      "content": "https://storage.passionseed.com/hackathon/phase2/hypothesis-guide.mp4",
      "caption": "Watch this 2-min guide"
    }
  ]
}
```

### Message Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sender` | string | ✅ | Display name of the message sender |
| `avatar` | string | ✅ | Emoji or URL to avatar image |
| `type` | string | ✅ | One of: `text`, `image`, `video` |
| `content` | string | ✅ | The message text, image URL, or video URL |
| `caption` | string | ❌ | Optional caption for image/video |

### Sender Types Used

| Sender | Avatar | Role |
|--------|--------|------|
| Mentor Kai | 👨‍🏫 | Instructor/mentor character |
| Team Alpha | 🧑‍💻 | Example student team (curious) |
| Team Beta | 👩‍💻 | Example student team (skeptical) |

---

## Metadata JSON Format

The `metadata` field configures UI behavior:

```json
{
  "chat_style": "whatsapp",
  "click_to_reveal": true,
  "show_typing_indicator": true
}
```

### Metadata Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `chat_style` | string | `"whatsapp"` | Visual theme. Options: `"whatsapp"`, `"messenger"`, `"line"` |
| `click_to_reveal` | boolean | `true` | If true, user must tap to show next message. If false, all messages shown at once |
| `show_typing_indicator` | boolean | `true` | Show "..." typing animation before revealing next message |

---

## API — Fetching Chat Comic Content

### Existing API (No changes needed)

The existing `lib/hackathonPhaseActivity.ts` functions already return chat comic content:

```typescript
// Returns all activities with content for a phase
const phase = await getPhaseBySlug(programId, "phase-2-prototyping");

// Content is in phase.activities[].content[]
// Filter for chat_comic type:
const chatComicContent = activity.content?.filter(
  c => c.content_type === 'chat_comic'
);
```

### Response Shape

```typescript
{
  id: "e57f39f5-4764-43cf-a452-3db157befb73",
  activity_id: "c08b9d37-4637-45bc-9834-4cc082747e84",
  content_type: "chat_comic",
  content_title: "The Hypothesis Chat",
  content_body: '{"messages":[...]}',  // JSON string — PARSE THIS
  display_order: 1,
  metadata: {
    chat_style: "whatsapp",
    click_to_reveal: true,
    show_typing_indicator: true
  },
  created_at: "2026-04-26T02:50:58.217052+00"
}
```

### Important: Parse content_body

The `content_body` is a **JSON string**, not a JSON object. You must parse it:

```typescript
const parsed = JSON.parse(contentBody);
const messages = parsed.messages;
```

---

## Current Phase 2 Chat Comics in Database

| Activity | Chat Title | Messages | Media Types |
|----------|-----------|----------|-------------|
| 1. From Problem to Hypothesis | The Hypothesis Chat | 10 | text, image, video |
| 2. Choose Your Pretotype | The Pretotype Chat | 14 | text, image, video |
| 3. Build the Pretotype | The Build Chat | 15 | text, image, video |
| 4. Run the Test + Decide | The Test Chat | 16 | text, image, video |
| 5. Build High-Fidelity Prototype | The Build Chat (High-Fi) | 14 | text, image, video |

All use:
- `chat_style`: `"whatsapp"`
- `click_to_reveal`: `true`
- `show_typing_indicator`: `true`

---

## Frontend Implementation Guide

### Recommended Component Structure

```
ChatComicViewer
├── ChatHeader (title, optional)
├── MessageList
│   ├── ChatMessage (text)
│   ├── ChatImage (image + caption)
│   └── ChatVideo (video + caption)
├── TypingIndicator ("..." animation)
└── TapToRevealOverlay (if click_to_reveal)
```

### Interaction Flow (click_to_reveal: true)

1. Show first message immediately
2. Show "Tap to continue" hint
3. On tap:
   - Show typing indicator (if enabled) for 0.5-1s
   - Reveal next message with slide-in animation
   - Scroll to bottom
4. Repeat until all messages shown
5. Show "Continue to activity" button

### Message Rendering Rules

| Type | Render As | Notes |
|------|-----------|-------|
| `text` | Text bubble | Support links (auto-detect URLs) |
| `image` | Image thumbnail | Tap to expand full-screen |
| `video` | Video thumbnail | Tap to play inline or fullscreen |

### Chat Bubble Styling

```
Mentor Kai messages:
- Left-aligned
- Light gray background (#f0f0f0)
- Avatar on left

Team Alpha/Beta messages:
- Right-aligned
- Green background (WhatsApp style) or blue (Messenger style)
- Avatar on right
```

Style determined by `metadata.chat_style`.

### State Management

```typescript
interface ChatComicState {
  revealedCount: number;        // How many messages shown
  isTyping: boolean;            // Show typing indicator
  isComplete: boolean;          // All messages revealed
  expandedImage: string | null; // Full-screen image URL
  playingVideo: string | null;  // Currently playing video URL
}
```

### Progress Tracking

Track progress locally (AsyncStorage/LocalStorage):

```typescript
// Key: chat_comic_progress_{activityId}
{
  revealedCount: 5,      // Resume from here
  completedAt: null,     // Set when all messages revealed
  lastViewedAt: "2026-04-25T10:00:00Z"
}
```

---

## Adding New Chat Comics

### SQL Template

```sql
INSERT INTO hackathon_phase_activity_content (
  activity_id, 
  content_type, 
  content_title, 
  content_body, 
  display_order, 
  metadata
) VALUES (
  'YOUR_ACTIVITY_ID',
  'chat_comic',
  'Your Chat Title',
  '{
    "messages": [
      {"sender": "Mentor Kai", "avatar": "👨‍🏫", "type": "text", "content": "Hello!"},
      {"sender": "Team Alpha", "avatar": "🧑‍💻", "type": "text", "content": "Hi!"}
    ]
  }',
  1,
  '{"chat_style": "whatsapp", "click_to_reveal": true, "show_typing_indicator": true}'
);
```

### Content Guidelines

1. **Keep it conversational** — 10-20 messages max per activity
2. **Mix media types** — Don't use only text. Add images/videos every 3-5 messages
3. **Character consistency** — Mentor Kai asks questions, teams respond with concerns/curiosity
4. **End with a call-to-action** — Last message should prompt the student to complete the activity
5. **Thai + English** — Match the language pattern of Phase 1 content

---

## Testing

### Verify Content in Database

```sql
SELECT 
  a.title as activity,
  c.content_title as chat_title,
  c.content_type,
  jsonb_array_length((c.content_body::jsonb)->'messages') as message_count
FROM hackathon_phase_activities a
JOIN hackathon_phase_activity_content c ON c.activity_id = a.id
WHERE c.content_type = 'chat_comic'
ORDER BY a.display_order;
```

### Expected Result (Phase 2)

| activity | chat_title | content_type | message_count |
|----------|-----------|--------------|---------------|
| From Problem to Hypothesis | The Hypothesis Chat | chat_comic | 10 |
| Choose Your Pretotype | The Pretotype Chat | chat_comic | 14 |
| Build the Pretotype | The Build Chat | chat_comic | 15 |
| Run the Test + Decide | The Test Chat | chat_comic | 16 |
| Build High-Fidelity Prototype | The Build Chat (High-Fi) | chat_comic | 14 |

---

## Migration Notes

### Already Applied

1. ✅ Added `chat_comic` to TypeScript `ContentType` enum
2. ✅ Updated database check constraint to allow `chat_comic`
3. ✅ Inserted 5 Phase 2 activities
4. ✅ Inserted chat comic content for all 5 activities
5. ✅ Inserted assessments for all 5 activities

### No Further Migrations Needed

The frontend can start consuming `chat_comic` content immediately using existing APIs.

---

## Questions?

Contact: Backend team / Check `lib/hackathon/phase-specs/phase-2.md` for activity details
