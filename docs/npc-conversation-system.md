# NPC Conversation System (QTE)

## Overview

The **NPC Conversation System** (Question Tree Event - QTE) enables branching, interactive dialogues with NPC characters in PathLab activities. Users navigate through conversations by making choices that lead to different story paths and outcomes.

## Features

- 🌳 **Branching Conversation Trees** - Create complex dialogue flows with multiple paths
- 👥 **NPC Characters** - Link conversations to custom NPC avatars from your seed
- 🎭 **Rich Interactions** - Support for questions, statements, and multiple endings
- 📊 **Progress Tracking** - Track user choices, visited nodes, and completion status
- 🎨 **Customizable Metadata** - Add emotions, urgency levels, and custom properties
- 🔄 **Conditional Choices** - Show/hide choices based on previous selections

## Architecture

### Database Tables

#### `path_npc_conversations`
Root container for conversation trees.

**Key Fields:**
- `root_node_id` - Starting point of the conversation
- `seed_id` - Links conversation to a specific seed
- `estimated_minutes` - Approximate completion time

#### `path_npc_conversation_nodes`
Individual conversation nodes representing questions, statements, or endings.

**Node Types:**
- `question` - Asks user to choose between options
- `statement` - NPC speaks and auto-continues
- `end` - Terminal node (conversation complete)

**Key Fields:**
- `npc_avatar_id` - Reference to NPC character
- `text_content` - What the NPC says
- `metadata` - Emotions, timing, styling

#### `path_npc_conversation_choices`
User choice options that create branches in the conversation.

**Key Fields:**
- `from_node_id` - Source node
- `to_node_id` - Destination node (null for terminal choices)
- `choice_text` - Text shown to user
- `choice_label` - Short label (e.g., "Q1", "A", "B")
- `conditions` - Optional requirements for showing this choice

#### `path_npc_conversation_progress`
Tracks user progress through conversations.

**Key Fields:**
- `current_node_id` - Where user is now
- `visited_node_ids` - Array of visited nodes
- `choice_history` - Ordered array of choices made
- `is_completed` - Whether conversation reached an end node

## Usage

### 1. Create NPC Avatars

First, create NPC characters for your seed:

```typescript
const advisor = await supabase
  .from('seed_npc_avatars')
  .insert({
    seed_id: 'your-seed-id',
    name: 'Academic Advisor',
    svg_data: '<svg>...</svg>',
    description: 'Helpful advisor character',
  });
```

### 2. Create Conversation Tree

```typescript
// Create conversation
const conversation = await supabase
  .from('path_npc_conversations')
  .insert({
    seed_id: 'your-seed-id',
    title: 'Career Exploration',
    description: 'Discover your career path',
    estimated_minutes: 10,
  });

// Create nodes
const rootNode = await supabase
  .from('path_npc_conversation_nodes')
  .insert({
    conversation_id: conversation.id,
    npc_avatar_id: advisor.id,
    node_type: 'question',
    text_content: 'What interests you most?',
    metadata: { emotion: 'happy' },
  });

const artNode = await supabase
  .from('path_npc_conversation_nodes')
  .insert({
    conversation_id: conversation.id,
    node_type: 'end',
    text_content: 'Art is a wonderful path!',
  });

// Create choices
await supabase
  .from('path_npc_conversation_choices')
  .insert({
    from_node_id: rootNode.id,
    to_node_id: artNode.id,
    choice_text: 'I love art and design',
    choice_label: 'A',
    display_order: 0,
  });

// Set root node
await supabase
  .from('path_npc_conversations')
  .update({ root_node_id: rootNode.id })
  .eq('id', conversation.id);
```

### 3. Add to PathLab Activity

```typescript
// Create activity
const activity = await supabase
  .from('path_activities')
  .insert({
    path_day_id: 'your-day-id',
    title: 'Career Exploration Chat',
    activity_type: 'npc_dialogue',
    display_order: 0,
  });

// Add NPC chat content
await supabase
  .from('path_content')
  .insert({
    activity_id: activity.id,
    content_type: 'npc_chat',
    metadata: {
      conversation_id: conversation.id,
      allow_restart: false,
      show_history: true,
    },
  });
```

### 4. Use in React Component

```tsx
import { NPCConversation } from '@/components/pathlab/NPCConversation';

export default function MyActivity() {
  return (
    <NPCConversation
      conversationId="conversation-uuid"
      progressId="activity-progress-uuid"
      onComplete={() => console.log('Conversation completed!')}
    />
  );
}
```

## API Endpoints

### GET `/api/pathlab/npc-conversations/:conversationId`
Fetches complete conversation tree with all nodes and choices.

**Response:**
```json
{
  "conversation": {
    "conversation": { ... },
    "nodes": [ ... ],
    "root_node": { ... }
  }
}
```

### GET `/api/pathlab/npc-conversations/progress/:progressId`
Fetches or creates user's conversation progress.

**Response:**
```json
{
  "progress": { ... },
  "current_node": { ... },
  "available_choices": [ ... ]
}
```

### POST `/api/pathlab/npc-conversations/choice`
Records user's choice and advances conversation.

**Request:**
```json
{
  "progress_id": "uuid",
  "choice_id": "uuid"
}
```

**Response:**
```json
{
  "progress": { ... },
  "next_node": { ... },
  "is_completed": false
}
```

## Metadata Options

### Node Metadata
```typescript
{
  emotion: 'happy' | 'sad' | 'neutral' | 'angry' | 'surprised' | 'thoughtful',
  urgency: 'low' | 'medium' | 'high',
  background_color: '#hex',
  auto_advance_delay_ms: 3000  // For statement nodes
}
```

### Choice Metadata
```typescript
{
  personality_affect: {
    trait: 'kindness',
    value: 5
  },
  relationship_points: 10,
  unlock_content: 'content-id'
}
```

### Choice Conditions
```typescript
{
  requires_previous_choice: 'choice-uuid',
  requires_visited_node: 'node-uuid',
  min_relationship_points: 50,
  custom: { ... }
}
```

## Example Conversation Flow

```
[Root Node] "What interests you?"
  ├─ Choice A: "Academic studies"
  │   └─> [Question Node] "Which level?"
  │       ├─ Choice A1: "Undergraduate"
  │       │   └─> [End Node] "Great choice!"
  │       └─ Choice A2: "Graduate"
  │           └─> [End Node] "Excellent path!"
  │
  ├─ Choice B: "Creative arts"
  │   └─> [End Node] "Follow your passion!"
  │
  └─ Choice C: "Technology"
      └─> [End Node] "The future is tech!"
```

## Best Practices

### 1. Clear Navigation
- Use descriptive choice labels (Q1, Q2, A, B)
- Keep choice text concise but informative
- Provide context in node text

### 2. Engaging Content
- Use emotions to add personality
- Vary node types (questions, statements, endings)
- Write natural, conversational dialogue

### 3. Meaningful Choices
- Ensure choices lead to distinct outcomes
- Avoid dead-end paths unless intentional
- Provide multiple endings for replayability

### 4. Progress Tracking
- Mark completion when user reaches end nodes
- Save choice history for analytics
- Allow conversation restart if desired

### 5. Testing
- Test all conversation paths
- Verify choices connect correctly
- Check for orphaned nodes

## Seed Script

Run the included seed script to create a sample conversation:

```bash
npx tsx scripts/seed-npc-conversation.ts
```

This creates a complete example conversation tree with:
- Academic Advisor NPC
- Multiple branching paths
- Different ending scenarios
- Thai language content (based on TCAS flowchart example)

## TypeScript Types

All types are available in `/types/npc-conversations.ts`:

- `NPCConversation` - Root conversation
- `NPCConversationNode` - Individual node
- `NPCConversationChoice` - User choice option
- `NPCConversationProgress` - User progress
- `NPCConversationTree` - Full tree structure
- And many more...

## Migration File

Database schema: `/supabase/migrations/20260318140000_create_npc_conversation_system.sql`

This migration:
- Creates all necessary tables
- Adds RLS policies
- Updates activity and content type enums
- Includes helper function `get_npc_conversation_tree()`

## Component

React component: `/components/pathlab/NPCConversation.tsx`

Features:
- Automatic progress loading/creation
- Choice selection and submission
- Conversation history display
- Completion detection
- Error handling
- Loading states

## Future Enhancements

Potential additions:
- [ ] Conversation builder UI
- [ ] Visual flow editor (drag-and-drop)
- [ ] AI-assisted dialogue generation
- [ ] Analytics dashboard
- [ ] Conversation templates library
- [ ] Multi-NPC conversations
- [ ] Voice acting support
- [ ] Conversation replay system

---

**Created:** March 18, 2026
**Version:** 1.0.0
