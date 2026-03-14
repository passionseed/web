# AI Expert Interview System Implementation Plan

**Date**: 2026-03-13
**Status**: Ready for implementation

---

## Overview

Build an unauthenticated AI chat interview system where industry experts can share their career experiences in ~10 minutes. The extracted data feeds into the existing PathLab generator pipeline to create career exploration content for students.

### Core Goals

1. **Zero friction to start** - Experts land on page and begin chatting immediately, no login required
2. **Structured data extraction** - AI extracts career insights through conversational interview
3. **Expert attribution** - Collect profile data at end for proper attribution on generated PathLabs
4. **Mentoring revenue stream** - Optional paid/free mentoring sessions for parents
5. **Quality control** - Admin review before any content reaches students

### Integration Points

- **PathLab Generator** (`lib/ai/pathlab-generator.ts`) - Interview data becomes seed input
- **Seeds System** (`seeds` table with `seed_type = 'pathlab'`) - Generated content storage
- **Landing CTA** (`components/landing-expert-cta.tsx`) - Entry point already exists

---

## User Flow Diagram

```
                           EXPERT INTERVIEW FLOW
                           ====================

[Landing Page CTA]
        |
        v
[/expert-interview]
        |
        +---> [Rate Limit Check] --FAIL--> [429 Too Many Requests]
        |
        +---> [Honeypot Check] --FAIL--> [Silent Reject]
        |
        v
+-------------------+
|  Interview Chat   |  <--- Unauthenticated
|  (AI-guided)      |
|                   |
|  Q1: Field/Role   |
|  Q2: Daily Tasks  |
|  Q3: Challenges   |
|  Q4: Rewards      |
|  Q5: Misconceptions
|  Q6: Skills       |
|  Q7: Advice       |
|  Q8: Entry Path   |
+-------------------+
        |
        v
+-------------------+
|  Profile Setup    |
|                   |
|  - Name*          |
|  - Title*         |
|  - Company*       |
|  - Photo (upload) |
|  - LinkedIn URL   |
+-------------------+
        |
        v
+-------------------+
|  Mentoring Opt-in |
|                   |
|  [ ] No mentoring |
|  [x] Free sessions|
|  [ ] Paid sessions| --> Booking URL input
+-------------------+
        |
        v
+-------------------+
|  Review & Submit  |
|                   |
|  Show summary     |
|  [Edit] [Submit]  |
+-------------------+
        |
        v
[Thank You Page]
        |
        v
[Admin Review Queue]


     ADMIN REVIEW FLOW
     ================

[/admin/experts]
        |
        v
+-------------------+
|  Expert Queue     |
|  status: pending  |
+-------------------+
        |
        v
[Review Expert]
        |
        +---> [Reject] --> Notify expert (optional)
        |
        +---> [Approve] --> [Generate PathLab]
                              |
                              v
                        [expert_pathlabs record]
                              |
                              v
                        [Published PathLab]
                        with expert attribution
```

---

## Data Model

### New Tables

```sql
-- ========================================
-- Migration: Expert Interview System
-- Created: 2026-03-13
-- Description: Tables for expert profiles, interviews, and mentoring
-- ========================================

-- Ensure we have required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- EXPERT PROFILES TABLE
-- ========================================

CREATE TABLE public.expert_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Optional link to authenticated user (for future account claiming)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Profile information
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    photo_url TEXT,
    field_category TEXT NOT NULL,  -- e.g., "Software Engineering", "Medicine"
    linkedin_url TEXT,

    -- Interview data
    interview_session_id TEXT UNIQUE NOT NULL,  -- Session token for continuity
    interview_data JSONB NOT NULL DEFAULT '{}', -- Structured extracted data
    interview_transcript JSONB NOT NULL DEFAULT '[]', -- Full chat history

    -- Mentoring configuration
    mentoring_preference TEXT NOT NULL DEFAULT 'none'
        CHECK (mentoring_preference IN ('none', 'free', 'paid')),
    booking_url TEXT,  -- Calendly, etc.

    -- Status and moderation
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'claimed')),

    -- Admin notes
    admin_notes TEXT,

    -- Tracking
    ip_address TEXT,  -- For rate limiting (hashed)
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Indexes for expert_profiles
CREATE INDEX idx_expert_profiles_status ON public.expert_profiles(status);
CREATE INDEX idx_expert_profiles_user_id ON public.expert_profiles(user_id);
CREATE INDEX idx_expert_profiles_session_id ON public.expert_profiles(interview_session_id);
CREATE INDEX idx_expert_profiles_created_at ON public.expert_profiles(created_at);
CREATE INDEX idx_expert_profiles_field_category ON public.expert_profiles(field_category);

-- ========================================
-- EXPERT PATHLABS TABLE
-- ========================================

CREATE TABLE public.expert_pathlabs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Link to expert profile
    expert_profile_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,

    -- Generated content references
    seed_id UUID REFERENCES public.seeds(id) ON DELETE SET NULL,
    path_id UUID REFERENCES public.paths(id) ON DELETE SET NULL,

    -- Generation status
    generation_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    generation_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_at TIMESTAMPTZ
);

-- Indexes for expert_pathlabs
CREATE INDEX idx_expert_pathlabs_expert_profile ON public.expert_pathlabs(expert_profile_id);
CREATE INDEX idx_expert_pathlabs_seed ON public.expert_pathlabs(seed_id);
CREATE INDEX idx_expert_pathlabs_status ON public.expert_pathlabs(generation_status);

-- ========================================
-- EXPERT INTERVIEW RATE LIMITS TABLE
-- ========================================

CREATE TABLE public.expert_interview_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- IP-based rate limiting (store hashed IP for privacy)
    ip_hash TEXT NOT NULL,

    -- Time window tracking
    hour_bucket TIMESTAMPTZ NOT NULL,

    -- Count of attempts in this hour
    attempt_count INTEGER NOT NULL DEFAULT 1,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique constraint: one record per IP per hour
    UNIQUE(ip_hash, hour_bucket)
);

-- Index for fast rate limit lookups
CREATE INDEX idx_expert_rate_limits_lookup ON public.expert_interview_rate_limits(ip_hash, hour_bucket);

-- Auto-cleanup: Delete records older than 2 hours
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM public.expert_interview_rate_limits
    WHERE hour_bucket < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MENTORING SESSIONS TABLE (for bookings)
-- ========================================

CREATE TABLE public.mentor_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Expert providing the session
    expert_profile_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,

    -- Parent/student booking the session
    booked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Session details
    session_type TEXT NOT NULL DEFAULT 'free'
        CHECK (session_type IN ('free', 'paid')),
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),

    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,

    -- Notes
    notes_from_booker TEXT,
    notes_from_expert TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for mentor_sessions
CREATE INDEX idx_mentor_sessions_expert ON public.mentor_sessions(expert_profile_id);
CREATE INDEX idx_mentor_sessions_booker ON public.mentor_sessions(booked_by_user_id);
CREATE INDEX idx_mentor_sessions_status ON public.mentor_sessions(status);
CREATE INDEX idx_mentor_sessions_scheduled ON public.mentor_sessions(scheduled_at);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_pathlabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_interview_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

-- Expert Profiles Policies
-- Public can insert (unauthenticated interview submission)
CREATE POLICY "public_insert_expert_profiles" ON public.expert_profiles
    FOR INSERT
    WITH CHECK (true);

-- Public can view approved profiles (for PathLab attribution)
CREATE POLICY "public_view_approved_experts" ON public.expert_profiles
    FOR SELECT
    USING (status = 'approved');

-- Admins can manage all expert profiles
CREATE POLICY "admins_manage_expert_profiles" ON public.expert_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'instructor')
        )
    );

-- Expert PathLabs Policies
-- Public can view completed expert pathlabs
CREATE POLICY "public_view_expert_pathlabs" ON public.expert_pathlabs
    FOR SELECT
    USING (generation_status = 'completed');

-- Admins can manage all expert pathlabs
CREATE POLICY "admins_manage_expert_pathlabs" ON public.expert_pathlabs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'instructor')
        )
    );

-- Rate Limits Policies
-- Only service role can manage rate limits (via API)
CREATE POLICY "service_role_rate_limits" ON public.expert_interview_rate_limits
    FOR ALL
    USING (auth.role() = 'service_role');

-- Mentor Sessions Policies
-- Users can view their own bookings
CREATE POLICY "users_view_own_sessions" ON public.mentor_sessions
    FOR SELECT
    USING (booked_by_user_id = auth.uid());

-- Users can create bookings
CREATE POLICY "users_create_sessions" ON public.mentor_sessions
    FOR INSERT
    WITH CHECK (booked_by_user_id = auth.uid());

-- Experts can view sessions for their profile
CREATE POLICY "experts_view_own_sessions" ON public.mentor_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.expert_profiles
            WHERE id = expert_profile_id
            AND user_id = auth.uid()
        )
    );

-- Admins can manage all sessions
CREATE POLICY "admins_manage_sessions" ON public.mentor_sessions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ========================================
-- TRIGGERS
-- ========================================

-- Updated at trigger for expert_profiles
CREATE TRIGGER update_expert_profiles_updated_at
    BEFORE UPDATE ON public.expert_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Updated at trigger for mentor_sessions
CREATE TRIGGER update_mentor_sessions_updated_at
    BEFORE UPDATE ON public.mentor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- GRANTS
-- ========================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE public.expert_profiles IS 'Industry experts who contribute career insights via AI interview';
COMMENT ON TABLE public.expert_pathlabs IS 'Links expert profiles to generated PathLab content';
COMMENT ON TABLE public.expert_interview_rate_limits IS 'IP-based rate limiting for unauthenticated interviews';
COMMENT ON TABLE public.mentor_sessions IS 'Booked mentoring sessions between experts and parents/students';
```

---

## API Routes Design

### 1. Interview Session Management

#### `POST /api/expert-interview/session`

Create a new interview session. Handles rate limiting and honeypot validation.

**Request:**
```typescript
{
  honeypot?: string;  // Hidden field - should be empty
}
```

**Response:**
```typescript
{
  sessionId: string;  // UUID for session continuity
  firstQuestion: {
    id: string;
    text: string;
    field?: string;  // For structured input if needed
  };
}
```

**Security:**
- Check honeypot field (reject if non-empty)
- Rate limit: 3 sessions per IP per hour
- Return 429 if rate limited

#### `POST /api/expert-interview/chat`

Continue the interview conversation.

**Request:**
```typescript
{
  sessionId: string;
  message: string;  // Expert's response
  currentQuestionId?: string;
}
```

**Response:**
```typescript
{
  nextQuestion?: {
    id: string;
    text: string;
    field?: string;
  };
  progress: {
    current: number;
    total: number;
  };
  extractedData?: {
    // Partially extracted structured data
    field?: string;
    role?: string;
    dailyTasks?: string[];
    // ...
  };
  isComplete: boolean;
}
```

### 2. Profile Submission

#### `POST /api/expert-interview/submit`

Complete the interview and submit profile.

**Request:**
```typescript
{
  sessionId: string;
  profile: {
    name: string;
    title: string;
    company: string;
    photo?: File;  // Multipart form data
    linkedinUrl?: string;
  };
  mentoring: {
    preference: 'none' | 'free' | 'paid';
    bookingUrl?: string;
  };
}
```

**Response:**
```typescript
{
  success: true;
  expertProfileId: string;
  message: string;
}
```

### 3. Admin Endpoints

#### `GET /api/admin/experts`

List all expert profiles with filtering.

**Query params:**
- `status`: Filter by status
- `page`, `limit`: Pagination

#### `POST /api/admin/experts/[id]/approve`

Approve an expert and trigger PathLab generation.

#### `POST /api/admin/experts/[id]/reject`

Reject an expert profile.

**Request:**
```typescript
{
  reason?: string;  // Optional rejection reason
}
```

#### `POST /api/admin/experts/[id]/generate-pathlab`

Trigger PathLab generation for approved expert.

---

## AI Chat Interview Design

### Interview Structure

The interview follows a structured but conversational flow:

```typescript
const INTERVIEW_QUESTIONS = [
  {
    id: 'field_role',
    prompt: "Hi! I'm here to learn about your career to help young people explore it. What field do you work in, and what's your current role?",
    extract: ['field', 'role'],
    followUp: (answer) => generateFollowUp(answer),
  },
  {
    id: 'daily_tasks',
    prompt: "Walk me through a typical day. What are the main things you actually do?",
    extract: ['dailyTasks'],
    guidance: "Focus on concrete activities, not abstract responsibilities",
  },
  {
    id: 'challenges',
    prompt: "What are the hardest parts of your job? What challenges do you regularly face?",
    extract: ['challenges'],
    guidance: "Be specific - real problems make the career feel authentic",
  },
  {
    id: 'rewards',
    prompt: "What makes the hard work worth it? What do you find most rewarding?",
    extract: ['rewards'],
    guidance: "This helps students understand intrinsic motivation",
  },
  {
    id: 'misconceptions',
    prompt: "What do people get wrong about your job? What surprises people when they learn what you actually do?",
    extract: ['misconceptions'],
    guidance: "Debunking myths is valuable for career exploration",
  },
  {
    id: 'skills',
    prompt: "What skills are essential for your work? Which ones took you the longest to develop?",
    extract: ['skills'],
    guidance: "Focus on transferable and learnable skills",
  },
  {
    id: 'advice',
    prompt: "If you could go back and tell your 18-year-old self something about this career path, what would you say?",
    extract: ['advice'],
    guidance: "Personal and specific advice resonates most",
  },
  {
    id: 'entry_path',
    prompt: "How did you get into this field? What was your path from school to where you are now?",
    extract: ['entryPath'],
    guidance: "Multiple valid paths, not just one 'right' way",
  },
];
```

### Data Extraction Schema

```typescript
interface ExtractedCareerData {
  // Basic identification
  field: string;           // e.g., "Software Engineering"
  role: string;            // e.g., "Senior Backend Engineer"
  industry?: string;       // e.g., "FinTech"

  // Content for PathLab generation
  dailyTasks: string[];    // ["Writing code", "Code reviews", "Debugging"]
  challenges: string[];    // ["Tight deadlines", "Legacy code", "On-call rotations"]
  rewards: string[];       // ["Solving complex problems", "Building useful products"]
  misconceptions: string[];// ["That it's just typing", "That you work alone"]
  skills: {
    technical: string[];   // ["Python", "System design", "SQL"]
    soft: string[];        // ["Communication", "Problem-solving", "Time management"]
    hardToDevelop: string[]; // Skills that took longest to learn
  };
  advice: string;          // Personal advice for young people
  entryPath: {
    education?: string;    // "Computer Science degree"
    firstJob?: string;     // "Junior Developer at startup"
    keySteps: string[];    // Career progression milestones
    alternatives?: string[]; // Other valid paths into the field
  };

  // Metadata
  experienceLevel: string; // "Senior", "Mid-level", etc.
  yearsInField: number;

  // Raw transcript for reference
  _rawTranscript: ChatMessage[];
}
```

### AI Chat Implementation

```typescript
// lib/ai/expert-interview-agent.ts

import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

const EXTRACTED_DATA_SCHEMA = z.object({
  field: z.string(),
  role: z.string(),
  industry: z.string().optional(),
  dailyTasks: z.array(z.string()),
  challenges: z.array(z.string()),
  rewards: z.array(z.string()),
  misconceptions: z.array(z.string()),
  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    hardToDevelop: z.array(z.string()),
  }),
  advice: z.string(),
  entryPath: z.object({
    education: z.string().optional(),
    firstJob: z.string().optional(),
    keySteps: z.array(z.string()),
    alternatives: z.array(z.string()).optional(),
  }),
  experienceLevel: z.string(),
  yearsInField: z.number(),
});

export async function processInterviewMessage(
  sessionId: string,
  message: string,
  currentQuestionId: string | null,
  conversationHistory: ChatMessage[]
): Promise<InterviewResponse> {
  // 1. Add message to history
  const updatedHistory = [
    ...conversationHistory,
    { role: "user", content: message }
  ];

  // 2. Determine next question or extract data
  const questionIndex = INTERVIEW_QUESTIONS.findIndex(q => q.id === currentQuestionId);
  const isLastQuestion = questionIndex === INTERVIEW_QUESTIONS.length - 1;

  if (isLastQuestion) {
    // Extract final structured data
    const extracted = await extractCareerData(updatedHistory);

    return {
      isComplete: true,
      extractedData: extracted,
    };
  }

  // 3. Generate contextual follow-up or next question
  const nextQuestion = INTERVIEW_QUESTIONS[questionIndex + 1];
  const contextualPrompt = await generateContextualPrompt(
    message,
    nextQuestion,
    updatedHistory
  );

  // 4. Store updated history
  await storeConversationHistory(sessionId, [
    ...updatedHistory,
    { role: "assistant", content: contextualPrompt }
  ]);

  return {
    nextQuestion: {
      id: nextQuestion.id,
      text: contextualPrompt,
    },
    progress: {
      current: questionIndex + 2,
      total: INTERVIEW_QUESTIONS.length,
    },
    isComplete: false,
  };
}

async function extractCareerData(
  conversationHistory: ChatMessage[]
): Promise<ExtractedCareerData> {
  const { object } = await generateObject({
    model: openai("gpt-4o"),
    schema: EXTRACTED_DATA_SCHEMA,
    prompt: `
      Extract structured career data from this interview conversation.
      Be specific and concrete - avoid vague generalizations.

      Conversation:
      ${conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n\n")}

      Return structured data about the expert's career.
    `,
  });

  return {
    ...object,
    _rawTranscript: conversationHistory,
  };
}
```

---

## Security Measures

### 1. Prompt Injection Prevention

Expert answers flow into the PathLab generator, which then creates content for students. This requires careful sanitization.

```typescript
// lib/security/input-sanitization.ts

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize user input before using in prompts
 */
export function sanitizeExpertInput(input: string): string {
  // 1. Remove HTML/script tags
  let sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  // 2. Remove common prompt injection patterns
  const INJECTION_PATTERNS = [
    /ignore (all )?(previous|above) instructions/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /\[SYSTEM\]/gi,
    /\[ADMIN\]/gi,
    /```[\s\S]*?```/g,  // Code blocks might contain malicious content
  ];

  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  // 3. Truncate to reasonable length
  sanitized = sanitized.slice(0, 2000);

  // 4. Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

/**
 * Validate extracted data before PathLab generation
 */
export function validateExtractedData(data: ExtractedCareerData): {
  valid: boolean;
  sanitized: ExtractedCareerData;
  issues: string[];
} {
  const issues: string[] = [];
  const sanitized = { ...data };

  // Check for suspicious patterns in arrays
  for (const field of ["dailyTasks", "challenges", "rewards", "misconceptions"] as const) {
    sanitized[field] = data[field].map(item => {
      const clean = sanitizeExpertInput(item);
      if (clean !== item) {
        issues.push(`Sanitized content in ${field}`);
      }
      return clean;
    });
  }

  // Validate advice length
  if (data.advice.length > 1000) {
    sanitized.advice = data.advice.slice(0, 1000);
    issues.push("Advice truncated to 1000 characters");
  }

  return {
    valid: issues.length === 0,
    sanitized,
    issues,
  };
}
```

### 2. IP Rate Limiting

```typescript
// lib/security/rate-limiter.ts

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_ATTEMPTS_PER_HOUR = 3;

export async function checkRateLimit(
  ipAddress: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const supabase = createClient(/* ... */);

  // Hash IP for privacy
  const ipHash = crypto
    .createHash("sha256")
    .update(ipAddress + process.env.RATE_LIMIT_SALT)
    .digest("hex");

  // Get current hour bucket
  const hourBucket = new Date();
  hourBucket.setMinutes(0, 0, 0);

  // Check existing attempts
  const { data: existing } = await supabase
    .from("expert_interview_rate_limits")
    .select("attempt_count")
    .eq("ip_hash", ipHash)
    .eq("hour_bucket", hourBucket.toISOString())
    .single();

  const currentCount = existing?.attempt_count || 0;

  if (currentCount >= MAX_ATTEMPTS_PER_HOUR) {
    const resetAt = new Date(hourBucket);
    resetAt.setHours(resetAt.getHours() + 1);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Increment or create record
  if (existing) {
    await supabase
      .from("expert_interview_rate_limits")
      .update({ attempt_count: currentCount + 1 })
      .eq("ip_hash", ipHash)
      .eq("hour_bucket", hourBucket.toISOString());
  } else {
    await supabase.from("expert_interview_rate_limits").insert({
      ip_hash: ipHash,
      hour_bucket: hourBucket.toISOString(),
      attempt_count: 1,
    });
  }

  const resetAt = new Date(hourBucket);
  resetAt.setHours(resetAt.getHours() + 1);

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS_PER_HOUR - currentCount - 1,
    resetAt,
  };
}
```

### 3. Honeypot Spam Prevention

```typescript
// In the interview form component
<form onSubmit={handleSubmit}>
  {/* Honeypot field - hidden from users, visible to bots */}
  <input
    type="text"
    name="website"
    tabIndex={-1}
    autoComplete="off"
    className="absolute -left-[9999px]"
    value={honeypot}
    onChange={(e) => setHoneypot(e.target.value)}
  />

  {/* Real fields... */}
</form>

// In the API route
if (honeypot && honeypot.trim() !== "") {
  // Silently reject - bot detected
  console.warn("Honeypot triggered", { sessionId });
  // Return fake success to avoid revealing the trap
  return NextResponse.json({
    success: true,
    sessionId: "fake-" + crypto.randomUUID(),
  });
}
```

### 4. Admin Review Queue

All expert submissions require admin approval before:

1. The expert profile is publicly visible
2. A PathLab is generated from their interview
3. Mentoring sessions can be booked

```typescript
// Admin review checklist
interface AdminReviewChecklist {
  profileComplete: boolean;     // Name, title, company present
  interviewQuality: boolean;    // Sufficient detail in answers
  noInappropriateContent: boolean;
  noSpam: boolean;
  fieldCategoryValid: boolean;  // Matches known categories
}
```

---

## Integration with PathLab Generator

### Data Flow

```
Expert Interview
      |
      v
ExtractedCareerData (JSONB)
      |
      v
Transform to PathLabGeneratorRequest
      |
      v
POST /api/pathlab/generate
      |
      v
Draft PathLab with expert attribution
      |
      v
Admin review + publish
      |
      v
Public PathLab with:
  - Expert name
  - Expert title
  - Expert company
  - Expert photo
```

### Transformation Layer

```typescript
// lib/expert/expert-to-pathlab.ts

import { ExtractedCareerData } from "@/types/expert";
import { PathLabGeneratorRequestInput } from "@/lib/ai/pathlab-generator-schema";

export function transformExpertDataToPathLabRequest(
  expertData: ExtractedCareerData,
  expertProfile: { name: string; title: string; company: string }
): PathLabGeneratorRequestInput {
  // Build topic from expert's field and role
  const topic = `${expertData.field}: ${expertData.role}`;

  // Audience is students exploring careers
  const audience = "High school students (ages 15-18) exploring career options";

  // Difficulty depends on field complexity
  const difficulty = assessFieldDifficulty(expertData.field);

  // 5-day exploration format
  const totalDays = 5;

  // Tone should be engaging and personal
  const tone = `Conversational and encouraging. This PathLab features ${expertProfile.name}, a ${expertProfile.title} at ${expertProfile.company}. Weave in their real experiences and advice naturally.`;

  // Constraints from interview data
  const constraints = buildConstraints(expertData);

  return {
    topic,
    audience,
    difficulty,
    totalDays,
    tone,
    constraints,
  };
}

function buildConstraints(expertData: ExtractedCareerData): string {
  const parts: string[] = [];

  // Include real challenges
  if (expertData.challenges.length > 0) {
    parts.push(`Include activities that let students experience: ${expertData.challenges.slice(0, 3).join(", ")}.`);
  }

  // Include key skills
  if (expertData.skills.technical.length > 0 || expertData.skills.soft.length > 0) {
    const skills = [...expertData.skills.technical.slice(0, 3), ...expertData.skills.soft.slice(0, 2)];
    parts.push(`Build skill-building exercises around: ${skills.join(", ")}.`);
  }

  // Include expert's advice
  parts.push(`End with reflection on: "${expertData.advice.slice(0, 200)}"`);

  // Include entry path
  if (expertData.entryPath.keySteps.length > 0) {
    parts.push(`Include a day exploring paths into this field: ${expertData.entryPath.keySteps.join(" → ")}.`);
  }

  // Address misconceptions
  if (expertData.misconceptions.length > 0) {
    parts.push(`Address these misconceptions: ${expertData.misconceptions.slice(0, 2).join(", ")}.`);
  }

  return parts.join(" ");
}

function assessFieldDifficulty(field: string): "beginner" | "intermediate" | "advanced" {
  const advancedFields = ["Medicine", "Law", "Aerospace", "Quantum", "Research"];
  const intermediateFields = ["Engineering", "Data Science", "Finance", "Architecture"];

  const fieldLower = field.toLowerCase();

  if (advancedFields.some(f => fieldLower.includes(f.toLowerCase()))) {
    return "advanced";
  }
  if (intermediateFields.some(f => fieldLower.includes(f.toLowerCase()))) {
    return "intermediate";
  }
  return "beginner";
}
```

---

## File Structure

### New Files to Create

```
app/
  expert-interview/
    page.tsx                      # Main interview page (unauthenticated)
    layout.tsx                    # Minimal layout for interview flow
  api/
    expert-interview/
      session/
        route.ts                  # Create interview session
      chat/
        route.ts                  # Chat message handler
      submit/
        route.ts                  # Submit completed interview
    admin/
      experts/
        route.ts                  # List experts (admin)
        [id]/
          route.ts                # Get/update expert
          approve/
            route.ts              # Approve expert
          reject/
            route.ts              # Reject expert
          generate-pathlab/
            route.ts              # Trigger PathLab generation

components/
  expert-interview/
    InterviewChat.tsx             # Main chat interface
    ChatMessage.tsx               # Individual message bubble
    ChatInput.tsx                 # User input with send button
    ProgressIndicator.tsx         # Shows interview progress
    ProfileForm.tsx               # End-of-interview profile collection
    MentoringOptIn.tsx            # Mentoring preference selection
    ReviewSummary.tsx             # Final review before submit
    ThankYouPage.tsx              # Post-submission confirmation

  admin/
    experts/
      ExpertQueue.tsx             # Admin queue of pending experts
      ExpertDetail.tsx            # Full expert profile view
      ExpertReviewPanel.tsx       # Approve/reject actions

lib/
  ai/
    expert-interview-agent.ts     # AI chat logic for interview
    expert-data-extractor.ts      # Structured data extraction
  expert/
    expert-to-pathlab.ts          # Transform interview to PathLab
    expert-profile-storage.ts     # Database operations
  security/
    input-sanitization.ts         # Sanitization utilities
    rate-limiter.ts               # IP-based rate limiting

types/
  expert.ts                       # Expert-related type definitions

supabase/
  migrations/
    20260313000000_create_expert_interview_system.sql
```

### Files to Modify

```
components/landing-expert-cta.tsx  # Already links to /expert-interview
lib/ai/pathlab-generator.ts        # Add expert attribution support
types/pathlab-generator.ts         # Add expert attribution types
```

---

## Implementation Phases

### Phase 1: Core Interview Flow (Week 1)

**Goal:** Basic unauthenticated chat interview that works

- [ ] Database migration (all tables)
- [ ] Session creation API with rate limiting + honeypot
- [ ] Chat API endpoint
- [ ] Basic AI interview agent
- [ ] Interview chat UI component
- [ ] Progress indicator

**Acceptance:**
- Expert can complete a full interview
- Conversation state persists between messages
- Rate limiting works (test with multiple sessions)

### Phase 2: Profile & Submission (Week 1-2)

**Goal:** Complete interview with profile collection

- [ ] Profile form component
- [ ] Mentoring opt-in component
- [ ] Review summary screen
- [ ] Submit API endpoint
- [ ] Photo upload to Supabase Storage
- [ ] Thank you page

**Acceptance:**
- Expert can submit complete profile
- Photo uploads correctly
- Data stored in database with `pending` status

### Phase 3: Admin Review System (Week 2)

**Goal:** Admin can review and approve/reject

- [ ] Admin expert queue page
- [ ] Expert detail view
- [ ] Approve/reject API endpoints
- [ ] Admin notes capability
- [ ] Email notification (optional)

**Acceptance:**
- Admin sees pending experts
- Can approve or reject with notes
- Status updates correctly

### Phase 4: PathLab Generation Integration (Week 2-3)

**Goal:** Approved experts generate PathLabs

- [ ] Expert-to-PathLab transformation
- [ ] Generation trigger on approval
- [ ] Expert attribution in PathLab
- [ ] Generated PathLab review flow

**Acceptance:**
- Approved expert triggers PathLab generation
- PathLab includes expert attribution
- Generation errors are handled gracefully

### Phase 5: Mentoring System (Week 3-4)

**Goal:** Parents can book mentoring sessions

- [ ] Expert mentoring profile page
- [ ] Booking interface
- [ ] Calendar integration (optional)
- [ ] Session management

**Acceptance:**
- Expert can set mentoring preferences
- Parent can view available experts
- Booking creates session record

### Phase 6: Polish & Security (Week 4)

**Goal:** Production-ready system

- [ ] Prompt injection testing
- [ ] Rate limit tuning
- [ ] Error handling refinement
- [ ] Loading states and animations
- [ ] Mobile responsiveness
- [ ] Analytics/tracking

**Acceptance:**
- Passes security review
- Works on mobile devices
- No unhandled errors

---

## Success Metrics

### Engagement

- Expert interview completion rate (> 60%)
- Average time to complete (< 12 minutes)
- Profile submission rate after interview (> 90%)

### Quality

- Admin approval rate (> 70% of submissions)
- PathLab generation success rate (> 95%)
- Student engagement with expert-generated PathLabs

### Business

- Expert signups per month
- Mentoring session bookings
- Parent conversion from free to paid

---

## Open Questions

1. **Expert account claiming:** Should experts who later create accounts be able to claim their existing profiles?
   - Proposed: Yes, add flow where authenticated user can claim `expert_profile` with matching email

2. **Interview language:** Should interview be available in Thai?
   - Proposed: Start with English, add Thai in Phase 6 based on demand

3. **Expert categories:** How to standardize field categories for better PathLab matching?
   - Proposed: Use TCAS faculty categories as baseline, allow custom entries

4. **Mentoring pricing:** How should paid mentoring pricing work?
   - Proposed: Expert sets rate, platform takes 10% fee, parent pays through app

---

## Dependencies

- **Existing PathLab Generator** - Must be functional
- **Supabase Storage** - For expert photo uploads
- **Email Service** - For notifications (optional, can be Phase 6)
- **Calendar Integration** - For mentoring bookings (optional, Phase 5)

---

## Appendix: Type Definitions

```typescript
// types/expert.ts

export type MentoringPreference = "none" | "free" | "paid";
export type ExpertStatus = "pending" | "approved" | "rejected" | "claimed";
export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export interface ExpertProfile {
  id: string;
  userId?: string;
  name: string;
  title: string;
  company: string;
  photoUrl?: string;
  fieldCategory: string;
  linkedinUrl?: string;

  interviewSessionId: string;
  interviewData: ExtractedCareerData;
  interviewTranscript: ChatMessage[];

  mentoringPreference: MentoringPreference;
  bookingUrl?: string;

  status: ExpertStatus;
  adminNotes?: string;

  ipAddress?: string;
  userAgent?: string;

  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ExpertPathLab {
  id: string;
  expertProfileId: string;
  seedId?: string;
  pathId?: string;
  generationStatus: GenerationStatus;
  generationError?: string;
  createdAt: string;
  generatedAt?: string;
}

export interface MentorSession {
  id: string;
  expertProfileId: string;
  bookedByUserId?: string;
  sessionType: "free" | "paid";
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  scheduledAt: string;
  durationMinutes: number;
  notesFromBooker?: string;
  notesFromExpert?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  field?: string;
}

export interface InterviewProgress {
  current: number;
  total: number;
}
```