# PathLab AI Chat Activity - Mobile App Documentation

## Overview

The **AI Chat** activity enables students to have objective-driven conversations with an AI assistant. Unlike scripted NPC conversations, AI chats are dynamic, adaptive, and goal-oriented. The system tracks conversation progress and automatically completes the activity when the objective is achieved.

**Key Features:**
- Dynamic AI conversations with custom system prompts
- Objective-based completion tracking with progress percentage
- Automatic completion detection via AI analysis
- Full conversation history persistence
- Real-time progress visualization

---

## Activity Type Detection

AI Chat activities are identified by checking the `content_type` field in the activity's content:

```typescript
function isAIChatActivity(activity: FullPathActivity): boolean {
  const content = activity.path_content?.[0];
  return content?.content_type === 'ai_chat';
}
```

---

## Activity Structure

### API Response Format

When fetching an AI chat activity from `/api/pathlab/activities`:

```json
{
  "activity": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "path_day_id": "f334c2cd-b840-4227-a98c-563d716b1cff",
    "title": "Career Exploration Chat",
    "instructions": "Chat with the AI to explore potential career paths that match your interests.",
    "display_order": 0,
    "estimated_minutes": 15,
    "is_required": true,
    "is_draft": false,
    "path_content": [
      {
        "id": "71e7b493-d9ec-44c9-98e7-80762ff990ae",
        "content_type": "ai_chat",
        "content_url": null,
        "content_body": null,
        "metadata": {
          "system_prompt": "You are a supportive career counselor...",
          "objective": "Help student identify 3 potential career paths",
          "completion_criteria": "Student has: 1) Listed 3 careers, 2) Explained why each interests them, 3) Identified next steps",
          "model": "passion-6",
          "max_messages": 30
        }
      }
    ],
    "path_assessment": null
  }
}
```

### Metadata Fields

The `metadata` object contains AI chat configuration:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `system_prompt` | string | **Yes** | Instructions for the AI on how to behave and guide the conversation |
| `objective` | string | **Yes** | The learning goal that defines when the chat is complete |
| `completion_criteria` | string | No | Specific criteria for marking the chat complete (helps AI know when to wrap up) |
| `model` | string | No | AI model to use (default: `"passion-6"`) |
| `max_messages` | number | No | Optional message limit to prevent endless conversations |

---

## Database Schema

AI chat uses two tables to track sessions and messages:

### `path_ai_chat_sessions`

Stores chat session state and progress tracking:

```sql
CREATE TABLE path_ai_chat_sessions (
  id UUID PRIMARY KEY,
  progress_id UUID REFERENCES path_activity_progress(id),
  activity_id UUID REFERENCES path_activities(id),
  user_id UUID REFERENCES auth.users(id),

  -- Progress tracking
  objective TEXT NOT NULL,
  completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  total_messages INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(progress_id)  -- One session per activity progress
);
```

### `path_ai_chat_messages`

Stores individual messages in the conversation:

```sql
CREATE TABLE path_ai_chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES path_ai_chat_sessions(id),

  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE
);
```

---

## API Endpoints

### 1. **Send Message** - `POST /api/pathlab/ai-chat/[activityId]`

Send a user message and receive an AI response.

**Request Body:**
```json
{
  "message": "I'm interested in technology careers",
  "progressId": "progress-uuid-here"
}
```

**Response:**
```json
{
  "message": "That's great! Technology offers many exciting paths. What specifically interests you about technology?",
  "completion_percentage": 15,
  "is_completed": false,
  "session_id": "session-uuid-here"
}
```

**How It Works:**
1. Creates or retrieves existing chat session for the progress ID
2. Saves user message to database
3. Builds message history with system prompt
4. Calls AI API to generate response
5. Saves AI response to database
6. **Analyzes progress** towards objective using AI
7. Updates session with completion percentage
8. Auto-completes activity if objective is achieved

### 2. **Get Chat History** - `GET /api/pathlab/ai-chat/[activityId]?progressId={uuid}`

Retrieve existing chat session and message history.

**Response:**
```json
{
  "session": {
    "id": "session-uuid",
    "completion_percentage": 45,
    "is_completed": false,
    "objective": "Help student identify 3 potential career paths",
    "total_messages": 8,
    "created_at": "2026-03-18T10:00:00Z"
  },
  "messages": [
    {
      "id": "msg-1",
      "role": "assistant",
      "content": "Hi! I'm here to help you explore careers. What are your interests?",
      "created_at": "2026-03-18T10:00:00Z"
    },
    {
      "id": "msg-2",
      "role": "user",
      "content": "I like solving problems and building things",
      "created_at": "2026-03-18T10:01:00Z"
    }
  ]
}
```

**Use Case:** Load existing conversation when user returns to the activity.

---

## Objective Completion Tracking

### How Progress Analysis Works

After each AI response, the system makes a **second AI call** to analyze progress:

**Analysis Prompt:**
```
Analyze this conversation and determine progress towards the objective.

**Objective:** Help student identify 3 potential career paths

**Completion Criteria:**
Student has: 1) Listed 3 careers, 2) Explained why each interests them, 3) Identified next steps

**Conversation:**
user: I'm interested in technology careers
assistant: That's great! What specifically interests you?
user: I like building websites and apps
assistant: Web development could be perfect for you! Have you considered mobile app development or full-stack engineering?

Based on the conversation, provide:
1. Completion percentage (0-100)
2. Whether the objective is fully met (true/false)

Respond ONLY with valid JSON:
{"percentage": 30, "isComplete": false}
```

**Response Parsing:**
```typescript
const analysis = {
  percentage: 30,  // 0-100
  isComplete: false
};
```

### Fallback Completion Logic

If AI analysis fails, the system uses a **simple fallback**:
- Each user message = +10% progress
- Maximum 90% until AI explicitly marks complete
- Prevents false completions

```typescript
// Fallback calculation
const messageCount = messages.filter(m => m.role === 'user').length;
const percentage = Math.min(90, messageCount * 10);
```

### Auto-Completion Behavior

When `isComplete: true`:
1. Session marked as completed (`is_completed = true`)
2. Activity progress status updated to `'completed'`
3. `completed_at` timestamp set
4. Student can view chat history but cannot send new messages
5. Activity UI shows completion badge

---

## Mobile App Implementation

### TypeScript Types

```typescript
import type { AIChatMetadata } from '@/types/pathlab-content';

interface AIChatActivityProps {
  activityId: string;
  progressId: string;
  metadata: AIChatMetadata;
  onComplete?: () => void;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatSession {
  id: string;
  completion_percentage: number;
  is_completed: boolean;
  objective: string;
  total_messages: number;
  created_at: string;
}
```

### Component Structure

```typescript
function AIChatActivity({ activityId, progressId, metadata, onComplete }: AIChatActivityProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 1. Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, [activityId, progressId]);

  const loadChatHistory = async () => {
    const response = await fetch(
      `/api/pathlab/ai-chat/${activityId}?progressId=${progressId}`
    );
    const data = await response.json();
    setSession(data.session);
    setMessages(data.messages || []);
  };

  // 2. Send message
  const handleSendMessage = async () => {
    if (!input.trim() || isSending || session?.is_completed) return;

    const userMessage = input.trim();
    setInput('');

    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    setIsSending(true);
    try {
      const response = await fetch(`/api/pathlab/ai-chat/${activityId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          progressId,
        }),
      });

      const data = await response.json();

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
      }]);

      // Update session
      setSession(prev => prev ? {
        ...prev,
        completion_percentage: data.completion_percentage,
        is_completed: data.is_completed,
      } : null);

      // Handle completion
      if (data.is_completed && !session?.is_completed) {
        showCompletionToast();
        onComplete?.();
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      {/* Header with objective and progress */}
      <div>
        <h3>{metadata.objective}</h3>
        <ProgressBar value={session?.completion_percentage || 0} />
      </div>

      {/* Messages */}
      <div>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
      </div>

      {/* Input (disabled when completed) */}
      <div>
        {session?.is_completed ? (
          <CompletionBadge />
        ) : (
          <MessageInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={isSending}
          />
        )}
      </div>
    </div>
  );
}
```

### UI Components

#### Progress Bar
```typescript
<div className="progress-container">
  <div className="progress-label">
    Progress: {completionPercentage}%
  </div>
  <div className="progress-bar">
    <div
      className="progress-fill"
      style={{ width: `${completionPercentage}%` }}
    />
  </div>
</div>
```

#### Message Bubble
```typescript
<div className={`message ${message.role === 'user' ? 'user' : 'assistant'}`}>
  <div className="message-content">
    {message.content}
  </div>
  <div className="message-time">
    {formatTime(message.created_at)}
  </div>
</div>
```

#### Completion Badge
```typescript
{isCompleted && (
  <div className="completion-badge">
    ✓ Objective completed! Great work!
  </div>
)}
```

---

## Testing Guide

### 1. Test Basic Chat Flow

```typescript
// Test sending a message
it('should send a message and receive AI response', async () => {
  const { user } = render(<AIChatActivity {...props} />);

  const input = screen.getByPlaceholderText('Type your message...');
  const sendButton = screen.getByText('Send');

  await user.type(input, 'Hello!');
  await user.click(sendButton);

  // Wait for AI response
  await waitFor(() => {
    expect(screen.getByText(/AI response/)).toBeInTheDocument();
  });
});
```

### 2. Test Progress Tracking

```typescript
it('should update progress percentage after each message', async () => {
  const { user } = render(<AIChatActivity {...props} />);

  // Initial progress
  expect(screen.getByText('0%')).toBeInTheDocument();

  // Send message
  await sendMessage(user, 'My first message');

  // Progress should increase
  await waitFor(() => {
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});
```

### 3. Test Completion Behavior

```typescript
it('should disable input when objective is completed', async () => {
  // Mock completed session
  mockApiResponse({
    session: { is_completed: true, completion_percentage: 100 },
    messages: [...],
  });

  render(<AIChatActivity {...props} />);

  await waitFor(() => {
    expect(screen.getByText('Objective completed!')).toBeInTheDocument();
  });

  const input = screen.getByPlaceholderText('Type your message...');
  expect(input).toBeDisabled();
});
```

### 4. Test Chat History Persistence

```typescript
it('should load existing chat history on mount', async () => {
  // Mock existing messages
  mockApiResponse({
    session: { completion_percentage: 30 },
    messages: [
      { role: 'user', content: 'Previous message 1' },
      { role: 'assistant', content: 'Previous response 1' },
    ],
  });

  render(<AIChatActivity {...props} />);

  await waitFor(() => {
    expect(screen.getByText('Previous message 1')).toBeInTheDocument();
    expect(screen.getByText('Previous response 1')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});
```

---

## Best Practices

### 1. **System Prompt Design**

**Good system prompts:**
- Are specific about the AI's role and expertise
- Include behavioral guidelines (tone, style, approach)
- Reference the objective explicitly
- Provide conversation strategies

**Example:**
```
You are a supportive career counselor helping high school students explore careers.

Your goal: Help the student identify 3 potential career paths that match their interests.

Guidelines:
- Ask open-ended questions about interests, strengths, and values
- Suggest specific careers with clear explanations
- Encourage the student to explain WHY each career interests them
- Help identify concrete next steps (skills, education, resources)
- Keep responses concise (2-3 sentences)
- Be encouraging and supportive

When the student has identified 3 careers, explained their interest in each, and discussed next steps, naturally wrap up the conversation.
```

### 2. **Objective Setting**

**Good objectives:**
- Are specific and measurable
- Have clear completion criteria
- Are achievable in 10-20 message exchanges
- Focus on learning outcomes, not just conversation length

**Examples:**
- ✅ "Identify 3 potential career paths and explain interest in each"
- ✅ "Create a weekly study schedule with 5 specific time blocks"
- ✅ "List 3 colleges that match your criteria with reasons"
- ❌ "Talk about careers" (too vague)
- ❌ "Have a conversation" (no clear outcome)

### 3. **Completion Criteria**

Use completion criteria to help the AI recognize when to wrap up:

```
Completion criteria:
1. Student has listed at least 3 careers
2. Student has explained what interests them about each career
3. Student has identified at least one next step (skill to learn, person to talk to, etc.)

When ALL criteria are met, conclude the conversation positively.
```

### 4. **Message Limits**

Set `max_messages` to prevent endless conversations:

```typescript
metadata: {
  system_prompt: "...",
  objective: "...",
  max_messages: 30  // Reasonable limit for most objectives
}
```

If the limit is reached without completion:
- Consider the objective too ambitious
- Or the system prompt needs refinement

### 5. **Error Handling**

```typescript
// Handle API errors gracefully
try {
  const response = await fetch(apiUrl, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  // ... process response
} catch (error) {
  // Show user-friendly error message
  showErrorToast('Failed to send message. Please try again.');

  // Remove optimistic UI updates
  setMessages(prev => prev.slice(0, -1));

  // Log for debugging
  console.error('AI chat error:', error);
}
```

### 6. **Auto-Scroll Behavior**

Keep the latest message visible:

```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

return (
  <div className="messages-container">
    {messages.map(msg => <Message key={msg.id} {...msg} />)}
    <div ref={messagesEndRef} />
  </div>
);
```

---

## Comparison: AI Chat vs NPC Chat

| Feature | AI Chat | NPC Chat |
|---------|---------|----------|
| **Conversation Flow** | Dynamic, adaptive | Scripted, branching |
| **Responses** | Generated by AI | Pre-written |
| **Completion** | Objective-based, automatic | Reaches specific end node |
| **Flexibility** | Responds to anything | Limited to pre-defined choices |
| **Progress Tracking** | Percentage (0-100%) | Node visit count |
| **Use Cases** | Open exploration, reflection, brainstorming | Guided scenarios, decision trees, role-play |
| **Setup Complexity** | Write system prompt + objective | Design full conversation tree |
| **Predictability** | Variable responses | Fully controlled narrative |

**When to use AI Chat:**
- Career exploration and brainstorming
- Personal reflection and goal-setting
- Problem-solving discussions
- Creative ideation
- Learning concept explanations

**When to use NPC Chat:**
- Scenario-based learning with specific paths
- Skill practice with controlled outcomes
- Story-driven experiences
- Assessment of decision-making
- Situations requiring exact dialogue

---

## Troubleshooting

### Issue: Progress Not Updating

**Possible causes:**
1. AI analysis is failing (check server logs)
2. `progressId` not provided in API call
3. Database permissions issue

**Debug:**
```typescript
console.log('Sending message:', {
  activityId,
  progressId,
  message: userMessage,
});

const response = await fetch(`/api/pathlab/ai-chat/${activityId}`, {
  method: 'POST',
  body: JSON.stringify({ message: userMessage, progressId }),
});

const data = await response.json();
console.log('Response:', data);
```

### Issue: Chat Never Completes

**Possible causes:**
1. Objective is too vague or ambitious
2. Completion criteria not clear
3. System prompt doesn't guide towards completion

**Solution:** Review and refine the objective and system prompt.

### Issue: Messages Not Loading

**Check:**
1. `progressId` exists and is valid
2. User has permission to view the session
3. Session exists in database

```sql
-- Check if session exists
SELECT * FROM path_ai_chat_sessions WHERE progress_id = 'uuid-here';

-- Check messages
SELECT * FROM path_ai_chat_messages WHERE session_id = 'uuid-here' ORDER BY created_at;
```

---

## Summary

AI Chat activities provide dynamic, objective-driven conversations for PathLab students. Key points:

1. **Activity Type:** `content_type === 'ai_chat'`
2. **Configuration:** `system_prompt` + `objective` in metadata
3. **Two API Endpoints:** POST to send messages, GET to retrieve history
4. **Progress Tracking:** AI analyzes each conversation for completion percentage
5. **Auto-Completion:** Activity marks complete when objective achieved
6. **Database:** Two tables (`path_ai_chat_sessions`, `path_ai_chat_messages`)
7. **Mobile UI:** Chat interface with progress bar and completion badge

**Reference Files:**
- API Implementation: `app/api/pathlab/ai-chat/[activityId]/route.ts`
- Student Component: `components/pathlab/PathAIChatStudent.tsx`
- Editor Component: `components/pathlab/PathAIChatEditor.tsx`
- Type Definitions: `types/pathlab-content.ts`
- Database Schema: `supabase/migrations/20260317120000_create_ai_chat_tables.sql`

---

**Last Updated:** March 18, 2026
