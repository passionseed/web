# NPC Conversation JSON Format

## Overview

This document describes the JSON format for importing NPC conversations into PathLab.

## Basic Structure

```json
{
  "nodes": [...],
  "choices": [...],
  "root_node": "node_1"
}
```

## Nodes Array

Each node represents a dialogue point in the conversation.

### Node Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for this node (e.g., "node_1") |
| `type` | string | Yes | Node type: "question", "statement", or "end" |
| `text` | string | Yes | What the NPC says |
| `title` | string | No | Optional short title for the node |
| `npc_name` | string | No | Name of NPC avatar (must match existing NPC) |
| `metadata` | object | No | Additional data (emotion, urgency, etc.) |

### Node Types

**question**: Presents choices to the user
```json
{
  "id": "node_1",
  "type": "question",
  "text": "What interests you?",
  "metadata": {
    "emotion": "happy"
  }
}
```

**statement**: NPC speaks, auto-advances to next node
```json
{
  "id": "node_2",
  "type": "statement",
  "text": "Great choice! Let me explain more...",
  "metadata": {
    "emotion": "thoughtful",
    "auto_advance_delay_ms": 2000
  }
}
```

**end**: Terminal node, marks conversation complete
```json
{
  "id": "node_3",
  "type": "end",
  "title": "Success!",
  "text": "You've completed the conversation!",
  "metadata": {
    "emotion": "happy"
  }
}
```

### Metadata Options

Common metadata fields:

```json
"metadata": {
  "emotion": "happy",          // happy, sad, neutral, angry, surprised, thoughtful
  "urgency": "medium",         // low, medium, high
  "background_color": "#1a1a2e",
  "auto_advance_delay_ms": 3000
}
```

## Choices Array

Each choice represents a branch from one node to another.

### Choice Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Source node ID |
| `to` | string | Yes | Destination node ID (can be null for terminal) |
| `text` | string | Yes | Text shown to user |
| `label` | string | No | Short label (e.g., "Q1", "A", "B") |
| `order` | number | Yes | Display order (0, 1, 2...) |
| `conditions` | object | No | Conditions for showing this choice |
| `metadata` | object | No | Additional choice data |

### Choice Example

```json
{
  "from": "node_1",
  "to": "node_2",
  "text": "I'm interested in technology",
  "label": "Q1",
  "order": 0,
  "metadata": {
    "personality_affect": {
      "trait": "curiosity",
      "value": 5
    }
  }
}
```

### Choice Conditions

```json
"conditions": {
  "requires_previous_choice": "choice_id_here",
  "requires_visited_node": "node_id_here",
  "min_relationship_points": 10
}
```

## Root Node

The `root_node` field specifies which node the conversation starts from.

```json
"root_node": "node_1"
```

## Complete Example

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "question",
      "title": "Welcome!",
      "text": "Hi! What would you like to explore today?",
      "npc_name": "Academic Advisor",
      "metadata": {
        "emotion": "happy"
      }
    },
    {
      "id": "tech_path",
      "type": "question",
      "text": "Technology is exciting! Which area interests you most?",
      "metadata": {
        "emotion": "thoughtful"
      }
    },
    {
      "id": "ai_ending",
      "type": "end",
      "title": "AI Journey",
      "text": "Artificial Intelligence is a great choice! Start with Python and machine learning basics.",
      "metadata": {
        "emotion": "happy"
      }
    },
    {
      "id": "web_ending",
      "type": "end",
      "title": "Web Development",
      "text": "Web development is in high demand! Begin with HTML, CSS, and JavaScript.",
      "metadata": {
        "emotion": "happy"
      }
    }
  ],
  "choices": [
    {
      "from": "start",
      "to": "tech_path",
      "text": "Technology and programming",
      "label": "A",
      "order": 0
    },
    {
      "from": "tech_path",
      "to": "ai_ending",
      "text": "Artificial Intelligence",
      "label": "A",
      "order": 0
    },
    {
      "from": "tech_path",
      "to": "web_ending",
      "text": "Web Development",
      "label": "B",
      "order": 1
    }
  ],
  "root_node": "start"
}
```

## Best Practices

### 1. Clear Node IDs
Use descriptive IDs that indicate the node's purpose:
- `start` - Starting node
- `tech_path` - Technology path question
- `ai_ending` - AI career ending

### 2. Logical Flow
Ensure every "question" node has at least one choice, and every choice leads somewhere.

### 3. Multiple Endings
Provide different endings for different paths to encourage exploration.

### 4. Use Labels
Add labels to choices for better UI display (Q1, Q2, A, B, etc.).

### 5. Add Emotions
Use metadata emotions to make NPCs feel more alive and responsive.

## Validation

The import will fail if:
- Missing required fields (id, type, text for nodes)
- Missing required fields (from, to, text, order for choices)
- Invalid node type
- Choice references non-existent nodes
- No root_node specified
- Root node doesn't exist in nodes array

## NPC Avatars

If you specify an `npc_name`, it must match an existing NPC avatar name in your seed. You can create NPC avatars separately, then reference them by name in your conversation.

To find available NPCs for your seed, check the seed's NPC avatars in the admin panel.

---

**Last Updated:** March 18, 2026
