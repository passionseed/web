# AI Chat with Objective Tracking - Technical Documentation

## Overview

The AI Chat system allows students to have guided conversations with an AI that tracks progress towards a specific learning objective. This is used in PathLab activities to create dynamic, goal-oriented learning experiences.

**Key Feature:** Automatic completion percentage tracking based on conversation progress towards the objective.

---

## Core Concepts

### 1. Objective-Driven Conversations
Each AI chat session has a clear **objective** that defines what the student should accomplish:
- Example: "Understand the key differences between machine learning and deep learning"
- Example: "Identify three potential use cases for AI in your field of study"

### 2. Completion Percentage (%)
The system automatically tracks how close the student is to achieving the objective:
- **0%** - Just started
- **50%** - Halfway through discussion
- **100%** - Objective fully achieved ✓

### 3. AI-Powered Progress Analysis
After each message exchange, a separate AI call analyzes the entire conversation to determine:
- Current completion percentage (0-100)
- Whether the objective has been fully met

---

## System Architecture

### Database Tables

#### `path_ai_chat_sessions`
Stores chat sessions and tracks objective progress.

```sql
CREATE TABLE path_ai_chat_sessions (
  id UUID PRIMARY KEY,
  progress_id UUID REFERENCES path_activity_progress(id),
  activity_id UUID REFERENCES path_activities(id),
  user_id UUID REFERENCES auth.users(id),

  -- Progress tracking
  objective TEXT NOT NULL,
  completion_percentage INT DEFAULT 0 CHECK (0-100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,

  total_messages INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### `path_ai_chat_messages`
Stores individual messages in the conversation.

```sql
CREATE TABLE path_ai_chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES path_ai_chat_sessions(id),

  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP
);
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Student sends message                                     │
│    "What is machine learning?"                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. System builds conversation context                        │
│    - System prompt with objective                            │
│    - Previous messages                                       │
│    - New user message                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AI generates response                                     │
│    "Machine learning is a subset of AI that..."              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Progress analysis (separate AI call)                      │
│    Analyzes full conversation → returns % complete           │
│    Example: {"percentage": 35, "isComplete": false}          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Update UI with progress bar                               │
│    Progress: ████████░░░░░░░░ 35%                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Guide

### 1. Activity Configuration (Editor)

In `PathActivityEditor`, configure AI Chat metadata:

```typescript
interface AIChatMetadata {
  system_prompt: string;           // AI personality & role
  objective: string;                // Goal to achieve
  completion_criteria?: string;     // Optional: How to detect completion
  model?: string;                   // AI model (default: "passion-6")
  max_messages?: number;            // Optional: Message limit
}
```

**Example Configuration:**
```typescript
{
  system_prompt: "You are an expert interviewer helping students explore career paths in software engineering. Ask thoughtful questions and provide insights.",

  objective: "Help the student identify their top 3 interests in software engineering and explain why each appeals to them",

  completion_criteria: "The conversation is complete when the student has:\n1. Named 3 specific areas of software engineering\n2. Explained their reasoning for each\n3. Showed genuine reflection on their interests",

  model: "passion-6"
}
```

### 2. Student Interface (Component)

The `PathAIChatStudent` component renders the chat interface:

**Key Features:**
- Real-time progress bar showing completion %
- Message history with user/AI messages
- Visual completion indicator when objective is met
- Disabled input after completion

**Component Structure:**
```tsx
<PathAIChatStudent
  activityId="uuid"
  progressId="uuid"
  objective="Help student identify 3 interests..."
  onComplete={() => console.log('Objective achieved!')}
/>
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ✨ AI Chat                                        ✓ │
│ Help student identify 3 interests in software eng   │
│                                                      │
│ Progress  ████████████████░░░░  75%                │
├─────────────────────────────────────────────────────┤
│                                                      │
│  User: What areas of software engineering exist?    │
│                                                      │
│        AI: There are many exciting areas! Let me    │
│           help you explore frontend, backend...     │
│                                                      │
│  User: I'm interested in frontend development       │
│                                                      │
│        AI: Great choice! What specifically about    │
│           frontend appeals to you?                  │
│                                                      │
├─────────────────────────────────────────────────────┤
│ Type your message...                    [Send] →    │
└─────────────────────────────────────────────────────┘
```

### 3. Backend API (Completion Tracking)

**POST `/api/pathlab/ai-chat/[activityId]`**

Process flow:
1. Save user message to database
2. Fetch conversation history
3. Call AI to generate response
4. **Analyze progress** (separate AI call)
5. Update completion percentage
6. Return response + progress

**Progress Analysis Function:**
```typescript
async function analyzeProgress(
  messages: Message[],
  objective: string,
  completionCriteria?: string
): Promise<{ percentage: number; isComplete: boolean }> {

  // Build analysis prompt
  const prompt = `
    Analyze this conversation and determine progress towards the objective.

    **Objective:** ${objective}

    **Conversation:**
    ${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

    Respond ONLY with JSON:
    {"percentage": 0-100, "isComplete": true/false}
  `;

  // Call AI for analysis
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    body: JSON.stringify({
      model: 'passion-6',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  // Parse and validate response
  const data = await response.json();
  const analysis = JSON.parse(data.choices[0].message.content);

  return {
    percentage: Math.min(100, Math.max(0, analysis.percentage)),
    isComplete: analysis.isComplete === true
  };
}
```

**Fallback Logic (if analysis fails):**
```typescript
// Default: increment by 10% per user message, max 90% until declared complete
const messageCount = messages.filter(m => m.role === 'user').length;
return {
  percentage: Math.min(90, messageCount * 10),
  isComplete: false
};
```

---

## How Completion Percentage Works

### AI Analysis Prompt

The system asks a separate AI call to analyze the conversation:

```
Analyze this conversation and determine progress towards the objective.

**Objective:** Help student identify 3 interests in software engineering

**Conversation:**
user: What areas exist?
assistant: There are frontend, backend, mobile...
user: I like frontend because of UI/UX
assistant: Great! What else interests you?
user: Maybe backend for scalability
assistant: Excellent! One more area?

Respond with JSON:
{"percentage": 0-100, "isComplete": true/false}
```

### AI Response Example

```json
{
  "percentage": 65,
  "isComplete": false
}
```

**Reasoning:** Student has identified 2/3 interests and explained 1 reason. Still needs to identify the 3rd interest and provide more detailed reasoning.

### Completion Detection

When `isComplete: true`:
1. Progress bar shows 100% in green
2. Input is disabled
3. Success message: "Objective completed! Great work! 🎉"
4. Activity progress is marked as "completed"
5. Student can move to next activity

---

## UI States

### 1. Initial State (0%)
```
Progress: ░░░░░░░░░░░░░░░░░░░░ 0%
[Start chatting to work towards your objective]
```

### 2. In Progress (35%)
```
Progress: ████████░░░░░░░░░░░░ 35%
[Active conversation with message history]
```

### 3. Near Completion (85%)
```
Progress: ██████████████████░░ 85%
[Conversation progressing well]
```

### 4. Completed (100%) ✓
```
Progress: ████████████████████ 100% ✓
✓ Objective completed! Great work!
[Input disabled - objective achieved]
```

---

## Use Cases

### 1. Expert Interview Activity
**Objective:** "Conduct an informational interview with an AI expert to learn about career paths in [field]"

**Completion Criteria:**
- Asked at least 5 meaningful questions
- Explored 2-3 different career paths
- Identified next steps for their own journey

### 2. Concept Exploration
**Objective:** "Understand the difference between supervised and unsupervised learning through conversation"

**Completion Criteria:**
- Can explain both concepts in own words
- Provided at least one example of each
- Demonstrated understanding through follow-up questions

### 3. Reflection & Synthesis
**Objective:** "Reflect on your learning experience and identify 3 key takeaways"

**Completion Criteria:**
- Listed 3 specific takeaways
- Explained why each is meaningful
- Connected to personal goals or interests

---

## Best Practices

### For Educators Creating AI Chat Activities

1. **Write Clear Objectives**
   - ✓ "Identify 3 career paths and explain why each interests you"
   - ✗ "Learn about careers"

2. **Define Completion Criteria**
   - Be specific about what "done" looks like
   - Include both quantity (3 items) and quality (explained reasoning)

3. **System Prompt Guidelines**
   - Define AI's role clearly (interviewer, tutor, mentor)
   - Include tone/personality instructions
   - Mention objective so AI can guide conversation

4. **Test the Activity**
   - Have someone complete it end-to-end
   - Check if completion % tracks accurately
   - Ensure objective is achievable in reasonable time

### For Developers

1. **Handle AI Failures Gracefully**
   - Fallback to simple increment if analysis fails
   - Log errors for debugging
   - Don't block user progress

2. **Optimize API Calls**
   - Analysis happens AFTER each message pair
   - Don't analyze on every keystroke
   - Cache results appropriately

3. **Progress Bar Updates**
   - Update immediately after receiving analysis
   - Smooth transitions (avoid jumping from 20% to 80%)
   - Visual feedback on completion

---

## Example Activity: Expert Interview

### Configuration
```typescript
{
  system_prompt: `You are a senior software engineer with 15 years of experience across multiple domains (web, mobile, AI/ML, DevOps).

Your role is to help students explore career paths in software engineering through a conversational interview. Be warm, encouraging, and insightful. Share real-world experiences and ask thoughtful questions to help them discover their interests.

Guide the conversation naturally towards the objective, but let the student lead with their questions and curiosity.`,

  objective: "Help the student identify and articulate their top 3 areas of interest in software engineering, with clear reasons for each",

  completion_criteria: `The conversation is complete when:
1. The student has named 3 specific areas of software engineering (e.g., frontend, ML, DevOps)
2. For each area, they've explained WHY it appeals to them (at least 2-3 sentences)
3. They've asked follow-up questions showing genuine curiosity
4. The conversation feels natural and student-led, not checklist-like`
}
```

### Sample Conversation with Progress

**Message 1-2 (Progress: 10%)**
```
Student: Hi! I'm interested in learning about software engineering careers.
AI: Welcome! I'm excited to help you explore. With 15 years in the field,
    I've seen many paths. What drew you to software engineering?
```

**Message 3-6 (Progress: 35%)**
```
Student: I like building things and solving problems. What areas exist?
AI: Great question! There's frontend (user interfaces), backend (servers/databases),
    mobile development, AI/ML, DevOps, security... What aspects of "building
    things" excite you most?

Student: I love seeing my work come to life visually. That's why frontend
         sounds interesting.
AI: That's our first area! Frontend is perfect for visual creators. What
    specifically about UI/UX design appeals to you?
```

**Message 7-12 (Progress: 65%)**
```
Student: I like making interfaces intuitive and beautiful. But I'm also curious
         about the backend - how does data actually get stored and retrieved?
AI: Excellent question! That's a natural connection. Backend work involves...
    [explains backend]. Does the problem-solving aspect of backend appeal to you?

Student: Yes! I think I'd like both frontend for creativity and backend for
         the logic and scalability challenges.
AI: Perfect! That's two areas with clear reasons. Many engineers work across
    both (full-stack). Is there a third area that interests you?
```

**Message 13-16 (Progress: 90%)**
```
Student: What about AI and machine learning? I hear it's growing fast.
AI: ML is booming! What specifically interests you about it? The algorithms,
    the data, or the applications?

Student: The applications - like recommendation systems or image recognition.
         Seems like it could have huge impact.
AI: That's a great third area! So we have: (1) Frontend for visual creativity,
    (2) Backend for logic/scale, (3) ML for impactful applications. These are
    all excellent paths. Do these feel right for your interests?
```

**Message 17 (Progress: 100%) ✓**
```
Student: Yes! I feel like I have a much clearer picture now. Thanks!
AI: Wonderful! You've identified three distinct paths with clear reasoning.
    Next steps: try building a small project in each area to see which
    you enjoy most. Great work in this conversation!

✓ Objective completed! Great work! 🎉
```

---

## Technical Specifications

### API Endpoints

**POST `/api/pathlab/ai-chat/[activityId]`**
- **Body:** `{ message: string, progressId: string }`
- **Response:** `{ message: string, completion_percentage: number, is_completed: boolean }`

**GET `/api/pathlab/ai-chat/[activityId]?progressId=xxx`**
- **Response:** `{ session: Session, messages: Message[] }`

### Database Schema

```typescript
interface PathAIChatSession {
  id: string;
  progress_id: string;
  activity_id: string;
  user_id: string;
  objective: string;
  completion_percentage: number;  // 0-100
  is_completed: boolean;
  completed_at: string | null;
  total_messages: number;
  created_at: string;
  updated_at: string;
}

interface PathAIChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}
```

### Frontend Component Props

```typescript
interface PathAIChatStudentProps {
  activityId: string;      // Activity containing AI chat
  progressId: string;      // Student's progress record
  objective: string;       // Display to student
  onComplete?: () => void; // Callback when objective is met
}
```

---

## Troubleshooting

### Progress Stuck at 0%
- Check if progress analysis API is returning valid JSON
- Verify objective is clear and achievable
- Review AI model response format

### Progress Not Updating
- Confirm API is successfully analyzing conversation
- Check network tab for failed requests
- Verify session is being updated in database

### Completion Not Detected
- Review completion criteria - may be too strict
- Check AI's analysis logic
- Ensure `isComplete` field is properly handled

### Progress Jumps Too Quickly
- AI may be over-estimating progress
- Refine completion criteria to be more specific
- Adjust fallback increment (currently 10% per message)

---

## Future Enhancements

1. **Progress Milestones**
   - Show checkpoints (25%, 50%, 75%)
   - Celebrate reaching each milestone

2. **Conversation Branching**
   - Different paths based on student interests
   - Dynamic objectives that adapt

3. **Multi-Objective Activities**
   - Track multiple sub-objectives
   - Composite progress calculation

4. **Analytics Dashboard**
   - View average completion time
   - Identify common conversation patterns
   - Optimize objectives based on data

---

## Summary

The AI Chat with Objective Tracking system creates engaging, goal-oriented learning experiences by:

1. ✓ **Clear Objectives** - Students know what they're working towards
2. ✓ **Real-time Progress** - Visual feedback on completion percentage
3. ✓ **AI-Powered Analysis** - Intelligent detection of objective completion
4. ✓ **Natural Conversations** - Feels like chatting with a mentor, not a form
5. ✓ **Automatic Completion** - System knows when student is done

This approach works exceptionally well for activities like:
- Expert interviews
- Concept exploration
- Reflective conversations
- Problem-solving dialogues
- Career path discovery

The % completion feature ensures students stay motivated and understand their progress throughout the learning journey.
