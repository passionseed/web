# Hackathon Growth Tracking & Parent Report — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pre-survey, per-session reflections, growth visualisation, and a shareable paid parent report to the month-long hackathon program.

**Architecture:** New Supabase tables sit alongside `hackathon_participants`. Cookie-based hackathon sessions (existing `SESSION_COOKIE` pattern) auth all student-facing routes. Admin routes use Supabase user roles. The parent report is a public page at `/hackathon/report/[token]` — no login required, paid tier unlocked manually by admin for Month 1.

**Tech Stack:** Next.js 15 App Router, Supabase (service role client for hackathon tables), Recharts for growth chart, TailwindCSS, existing hackathon session auth (`lib/hackathon/auth.ts` + `lib/hackathon/db.ts`).

**Design doc:** `docs/plans/2026-03-16-hackathon-growth-tracking-design.md`

---

## Task 1: Database Migration — 4 new tables

**Files:**
- Create: `supabase/migrations/20260316000001_hackathon_growth_tracking.sql`

**Step 1: Write the migration**

```sql
-- Pre-survey: one per participant, locked after submit
CREATE TABLE hackathon_pre_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  career_clarity_score     SMALLINT NOT NULL CHECK (career_clarity_score BETWEEN 1 AND 10),
  skills_confidence_score  SMALLINT NOT NULL CHECK (skills_confidence_score BETWEEN 1 AND 10),
  self_awareness_score     SMALLINT NOT NULL CHECK (self_awareness_score BETWEEN 1 AND 10),
  future_clarity_score     SMALLINT NOT NULL CHECK (future_clarity_score BETWEEN 1 AND 10),
  adaptability_score       SMALLINT NOT NULL CHECK (adaptability_score BETWEEN 1 AND 10),
  career_interest_text     TEXT,
  biggest_worry_text       TEXT,
  UNIQUE (participant_id)   -- one per participant, enforced at DB level
);

-- Admin-defined sessions (each class in the programme)
CREATE TABLE hackathon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  session_number INT NOT NULL UNIQUE,
  happens_at TIMESTAMPTZ,
  reflection_unlocked_at TIMESTAMPTZ  -- NULL = reflection not open yet
);

-- Per-session reflections (one per participant per session)
CREATE TABLE hackathon_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES hackathon_sessions(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  energy_score      SMALLINT NOT NULL CHECK (energy_score BETWEEN 1 AND 10),
  confidence_score  SMALLINT NOT NULL CHECK (confidence_score BETWEEN 1 AND 10),
  clarity_score     SMALLINT NOT NULL CHECK (clarity_score BETWEEN 1 AND 10),
  learning_text     TEXT,
  struggle_text     TEXT,
  UNIQUE (participant_id, session_id)
);

-- Parent reports: token-gated, unlocked_at set manually by admin
CREATE TABLE hackathon_parent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ,   -- NULL = free tier only
  project_title TEXT,
  project_url TEXT,
  UNIQUE (participant_id)
);

-- Indexes
CREATE INDEX idx_hackathon_reflections_participant ON hackathon_reflections(participant_id);
CREATE INDEX idx_hackathon_reflections_session ON hackathon_reflections(session_id);
CREATE INDEX idx_hackathon_parent_reports_token ON hackathon_parent_reports(token);
```

**Step 2: Push migration**

```bash
supabase db push --local
```
Expected: migration applied with no errors.

**Step 3: Commit**

```bash
git add supabase/migrations/20260316000001_hackathon_growth_tracking.sql
git commit -m "feat(db): add hackathon growth tracking tables"
```

---

## Task 2: DB Helper Functions

**Files:**
- Modify: `lib/hackathon/db.ts` (append — do not touch existing functions)

**Step 1: Add types and functions**

Append to the bottom of `lib/hackathon/db.ts`:

```typescript
// ─── Pre-Survey ─────────────────────────────────────────────────────────────

export type HackathonPreSurvey = {
  id: string;
  participant_id: string;
  submitted_at: string;
  career_clarity_score: number;
  skills_confidence_score: number;
  self_awareness_score: number;
  future_clarity_score: number;
  adaptability_score: number;
  career_interest_text: string | null;
  biggest_worry_text: string | null;
};

export async function getPreSurvey(participantId: string): Promise<HackathonPreSurvey | null> {
  const { data } = await getClient()
    .from("hackathon_pre_surveys")
    .select("*")
    .eq("participant_id", participantId)
    .single();
  return data;
}

export async function submitPreSurvey(
  participantId: string,
  survey: Omit<HackathonPreSurvey, "id" | "participant_id" | "submitted_at">
): Promise<HackathonPreSurvey> {
  const { data, error } = await getClient()
    .from("hackathon_pre_surveys")
    .insert({ participant_id: participantId, ...survey })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export type HackathonSession = {
  id: string;
  title: string;
  session_number: number;
  happens_at: string | null;
  reflection_unlocked_at: string | null;
};

export async function listSessions(): Promise<HackathonSession[]> {
  const { data } = await getClient()
    .from("hackathon_sessions")
    .select("*")
    .order("session_number", { ascending: true });
  return data ?? [];
}

export async function upsertSession(session: Omit<HackathonSession, "id"> & { id?: string }): Promise<HackathonSession> {
  const { data, error } = await getClient()
    .from("hackathon_sessions")
    .upsert(session)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function unlockReflection(sessionId: string): Promise<void> {
  const { error } = await getClient()
    .from("hackathon_sessions")
    .update({ reflection_unlocked_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

// ─── Reflections ─────────────────────────────────────────────────────────────

export type HackathonReflection = {
  id: string;
  participant_id: string;
  session_id: string;
  submitted_at: string;
  energy_score: number;
  confidence_score: number;
  clarity_score: number;
  learning_text: string | null;
  struggle_text: string | null;
};

export async function getReflectionsForParticipant(participantId: string): Promise<(HackathonReflection & { session: HackathonSession })[]> {
  const { data } = await getClient()
    .from("hackathon_reflections")
    .select("*, session:hackathon_sessions(*)")
    .eq("participant_id", participantId)
    .order("submitted_at", { ascending: true });
  return (data ?? []) as (HackathonReflection & { session: HackathonSession })[];
}

export async function submitReflection(
  participantId: string,
  sessionId: string,
  reflection: Pick<HackathonReflection, "energy_score" | "confidence_score" | "clarity_score" | "learning_text" | "struggle_text">
): Promise<HackathonReflection> {
  const { data, error } = await getClient()
    .from("hackathon_reflections")
    .insert({ participant_id: participantId, session_id: sessionId, ...reflection })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ─── Parent Reports ───────────────────────────────────────────────────────────

export type HackathonParentReport = {
  id: string;
  participant_id: string;
  token: string;
  generated_at: string;
  unlocked_at: string | null;
  project_title: string | null;
  project_url: string | null;
};

export async function getParentReportByToken(token: string): Promise<HackathonParentReport | null> {
  const { data } = await getClient()
    .from("hackathon_parent_reports")
    .select("*")
    .eq("token", token)
    .single();
  return data;
}

export async function createParentReport(
  participantId: string,
  details: Pick<HackathonParentReport, "project_title" | "project_url">
): Promise<HackathonParentReport> {
  const { data, error } = await getClient()
    .from("hackathon_parent_reports")
    .upsert({ participant_id: participantId, ...details })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function unlockParentReport(token: string): Promise<void> {
  const { error } = await getClient()
    .from("hackathon_parent_reports")
    .update({ unlocked_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw error;
}
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit 2>&1 | grep "lib/hackathon"
```
Expected: no output (no errors).

**Step 3: Commit**

```bash
git add lib/hackathon/db.ts
git commit -m "feat(hackathon): add growth tracking DB helpers"
```

---

## Task 3: API — Pre-Survey Routes

**Files:**
- Create: `app/api/hackathon/survey/route.ts`

**Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getPreSurvey, submitPreSurvey } from "@/lib/hackathon/db";

async function getParticipant(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionParticipant(token);
}

// GET — check if participant has already submitted
export async function GET(req: NextRequest) {
  const participant = await getParticipant(req);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const survey = await getPreSurvey(participant.id);
  return NextResponse.json({ survey });
}

// POST — submit the pre-survey (once only — DB UNIQUE constraint enforces this)
export async function POST(req: NextRequest) {
  const participant = await getParticipant(req);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { career_clarity_score, skills_confidence_score, self_awareness_score,
          future_clarity_score, adaptability_score, career_interest_text, biggest_worry_text } = body;

  // Validate all scores are integers 1–10
  const scores = [career_clarity_score, skills_confidence_score, self_awareness_score,
                  future_clarity_score, adaptability_score];
  if (scores.some((s) => typeof s !== "number" || s < 1 || s > 10 || !Number.isInteger(s))) {
    return NextResponse.json({ error: "All scores must be integers between 1 and 10" }, { status: 400 });
  }

  try {
    const survey = await submitPreSurvey(participant.id, {
      career_clarity_score, skills_confidence_score, self_awareness_score,
      future_clarity_score, adaptability_score,
      career_interest_text: career_interest_text || null,
      biggest_worry_text: biggest_worry_text || null,
    });
    return NextResponse.json({ survey }, { status: 201 });
  } catch (err: any) {
    // Postgres unique violation = already submitted
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Survey already submitted" }, { status: 409 });
    }
    console.error("Pre-survey submit error:", err);
    return NextResponse.json({ error: "Failed to submit survey" }, { status: 500 });
  }
}
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "api/hackathon/survey"
```
Expected: no output.

**Step 3: Commit**

```bash
git add app/api/hackathon/survey/route.ts
git commit -m "feat(api): add hackathon pre-survey GET/POST routes"
```

---

## Task 4: API — Reflection Routes

**Files:**
- Create: `app/api/hackathon/reflect/route.ts` (list my reflections)
- Create: `app/api/hackathon/reflect/[sessionId]/route.ts` (submit for a session)

**Step 1: Write `reflect/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getReflectionsForParticipant } from "@/lib/hackathon/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reflections = await getReflectionsForParticipant(participant.id);
  return NextResponse.json({ reflections });
}
```

**Step 2: Write `reflect/[sessionId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import {
  getSessionParticipant, submitReflection, listSessions,
} from "@/lib/hackathon/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const participant = await getSessionParticipant(token);
  if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify session exists and reflection window is open
  const sessions = await listSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!session.reflection_unlocked_at) {
    return NextResponse.json({ error: "Reflection not open for this session" }, { status: 403 });
  }

  const body = await req.json();
  const { energy_score, confidence_score, clarity_score, learning_text, struggle_text } = body;

  const scores = [energy_score, confidence_score, clarity_score];
  if (scores.some((s) => typeof s !== "number" || s < 1 || s > 10 || !Number.isInteger(s))) {
    return NextResponse.json({ error: "Scores must be integers 1–10" }, { status: 400 });
  }

  try {
    const reflection = await submitReflection(participant.id, sessionId, {
      energy_score, confidence_score, clarity_score,
      learning_text: learning_text || null,
      struggle_text: struggle_text || null,
    });
    return NextResponse.json({ reflection }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Already reflected on this session" }, { status: 409 });
    }
    console.error("Reflection submit error:", err);
    return NextResponse.json({ error: "Failed to submit reflection" }, { status: 500 });
  }
}
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "api/hackathon/reflect"
```
Expected: no output.

**Step 4: Commit**

```bash
git add app/api/hackathon/reflect/route.ts app/api/hackathon/reflect/[sessionId]/route.ts
git commit -m "feat(api): add hackathon reflection routes"
```

---

## Task 5: API — Admin Session Management

**Files:**
- Create: `app/api/admin/hackathon/sessions/route.ts`
- Create: `app/api/admin/hackathon/sessions/[sessionId]/unlock/route.ts`

**Step 1: Write `sessions/route.ts`** (list + create)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { listSessions, upsertSession } from "@/lib/hackathon/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin");
  return roles?.length ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sessions = await listSessions();
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { title, session_number, happens_at } = body;
  if (!title || typeof session_number !== "number") {
    return NextResponse.json({ error: "title and session_number required" }, { status: 400 });
  }
  const session = await upsertSession({ title, session_number, happens_at: happens_at ?? null, reflection_unlocked_at: null });
  return NextResponse.json({ session }, { status: 201 });
}
```

**Step 2: Write `sessions/[sessionId]/unlock/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { unlockReflection } from "@/lib/hackathon/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin");
  return roles?.length ? user : null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { sessionId } = await params;
  await unlockReflection(sessionId);
  return NextResponse.json({ success: true });
}
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "api/admin/hackathon/sessions"
```
Expected: no output.

**Step 4: Commit**

```bash
git add app/api/admin/hackathon/sessions/route.ts app/api/admin/hackathon/sessions/[sessionId]/unlock/route.ts
git commit -m "feat(api): add admin hackathon session management routes"
```

---

## Task 6: API — Admin Parent Report Routes

**Files:**
- Create: `app/api/admin/hackathon/report/route.ts` (generate report for participant)
- Create: `app/api/admin/hackathon/report/[token]/unlock/route.ts` (mark as paid)

**Step 1: Write `report/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createParentReport } from "@/lib/hackathon/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin");
  return roles?.length ? user : null;
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { participant_id, project_title, project_url } = await req.json();
  if (!participant_id) return NextResponse.json({ error: "participant_id required" }, { status: 400 });

  const report = await createParentReport(participant_id, {
    project_title: project_title ?? null,
    project_url: project_url ?? null,
  });
  return NextResponse.json({ report, url: `/hackathon/report/${report.token}` }, { status: 201 });
}
```

**Step 2: Write `report/[token]/unlock/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { unlockParentReport } from "@/lib/hackathon/db";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: roles } = await supabase.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin");
  return roles?.length ? user : null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { token } = await params;
  await unlockParentReport(token);
  return NextResponse.json({ success: true });
}
```

**Step 3: Commit**

```bash
git add app/api/admin/hackathon/report/route.ts app/api/admin/hackathon/report/[token]/unlock/route.ts
git commit -m "feat(api): add admin parent report generation and unlock routes"
```

---

## Task 7: Pre-Survey Page `/hackathon/survey`

**Files:**
- Create: `app/hackathon/survey/page.tsx`
- Create: `app/hackathon/survey/SurveyForm.tsx`

The page uses the hackathon session cookie (same as all other hackathon pages) and redirects to `/hackathon/dashboard` on submit. The form is already validated in the API — the page just needs clean UX.

**Step 1: Write `SurveyForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DIMENSIONS = [
  { key: "career_clarity_score",    label: "Career clarity",    hint: "How clear are you on which career you want?" },
  { key: "skills_confidence_score", label: "Skills confidence", hint: "How confident are you in your current abilities?" },
  { key: "self_awareness_score",    label: "Self-awareness",    hint: "How well do you know your own strengths?" },
  { key: "future_clarity_score",    label: "Future planning",   hint: "How clear is your plan for the next 3–5 years?" },
  { key: "adaptability_score",      label: "Adaptability",      hint: "How comfortable are you with uncertainty and change?" },
] as const;

type ScoreKey = (typeof DIMENSIONS)[number]["key"];

export function SurveyForm() {
  const router = useRouter();
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    career_clarity_score: 5,
    skills_confidence_score: 5,
    self_awareness_score: 5,
    future_clarity_score: 5,
    adaptability_score: 5,
  });
  const [careerInterest, setCareerInterest] = useState("");
  const [biggestWorry, setBiggestWorry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/hackathon/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scores,
          career_interest_text: careerInterest || null,
          biggest_worry_text: biggestWorry || null,
        }),
      });
      if (res.status === 409) { router.replace("/hackathon/dashboard"); return; }
      if (!res.ok) throw new Error("Submit failed");
      router.replace("/hackathon/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {DIMENSIONS.map(({ key, label, hint }) => (
        <div key={key} className="space-y-2">
          <div className="flex justify-between items-baseline">
            <label className="text-white font-medium">{label}</label>
            <span className="text-[#91C4E3] font-bold text-lg">{scores[key]}/10</span>
          </div>
          <p className="text-gray-400 text-sm">{hint}</p>
          <input
            type="range" min={1} max={10} step={1}
            value={scores[key]}
            onChange={(e) => setScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
            className="w-full accent-[#91C4E3]"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>Not at all</span><span>Very much</span>
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <label className="text-white font-medium">What career interests you most right now?</label>
        <textarea
          value={careerInterest}
          onChange={(e) => setCareerInterest(e.target.value)}
          placeholder="e.g. AI engineering, product design, medicine..."
          rows={2}
          className="w-full bg-[#0d1219] border border-[#91C4E3]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#91C4E3]/50 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-white font-medium">What worries you most about your future?</label>
        <textarea
          value={biggestWorry}
          onChange={(e) => setBiggestWorry(e.target.value)}
          placeholder="Be honest — this is just for you and your parents."
          rows={2}
          className="w-full bg-[#0d1219] border border-[#91C4E3]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#91C4E3]/50 resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#91C4E3] hover:bg-[#65ABFC] text-[#0d1219] font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Start the programme →"}
      </button>
    </form>
  );
}
```

**Step 2: Write `page.tsx`**

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getPreSurvey } from "@/lib/hackathon/db";
import { SurveyForm } from "./SurveyForm";

export default async function HackathonSurveyPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/hackathon/login");

  const participant = await getSessionParticipant(token);
  if (!participant) redirect("/hackathon/login");

  // Already submitted → go to dashboard
  const existing = await getPreSurvey(participant.id);
  if (existing) redirect("/hackathon/dashboard");

  return (
    <div className="min-h-screen bg-[#070b10] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-2">
          <p className="text-[#91C4E3] text-sm">Before we start</p>
          <h1 className="text-3xl font-bold">Where are you right now?</h1>
          <p className="text-gray-400 text-sm">
            Rate yourself honestly. There are no right answers — this is your baseline. We'll show you how much you've grown at the end.
          </p>
        </div>
        <SurveyForm />
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "hackathon/survey"
```

**Step 4: Commit**

```bash
git add app/hackathon/survey/
git commit -m "feat(hackathon): add pre-survey page"
```

---

## Task 8: Session Reflection Page `/hackathon/reflect/[sessionId]`

**Files:**
- Create: `app/hackathon/reflect/[sessionId]/page.tsx`
- Create: `app/hackathon/reflect/[sessionId]/ReflectionForm.tsx`

**Step 1: Write `ReflectionForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SCORES = [
  { key: "energy_score",     label: "Energy",     hint: "How energised did this session leave you?" },
  { key: "confidence_score", label: "Confidence", hint: "How confident do you feel after today?" },
  { key: "clarity_score",    label: "Clarity",    hint: "Did this session clarify your path?" },
] as const;

type ScoreKey = (typeof SCORES)[number]["key"];

export function ReflectionForm({ sessionId, sessionTitle }: { sessionId: string; sessionTitle: string }) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    energy_score: 5, confidence_score: 5, clarity_score: 5,
  });
  const [learningText, setLearningText] = useState("");
  const [struggleText, setStruggleText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/hackathon/reflect/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scores,
          learning_text: learningText || null,
          struggle_text: struggleText || null,
        }),
      });
      if (res.status === 409) { router.replace("/hackathon/dashboard"); return; }
      if (!res.ok) throw new Error("Submit failed");
      router.replace("/hackathon/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="bg-[#0d1219]/80 border border-[#91C4E3]/20 rounded-2xl px-5 py-4">
        <p className="text-[#91C4E3] text-xs uppercase tracking-wider mb-1">Reflecting on</p>
        <p className="text-white font-semibold">{sessionTitle}</p>
      </div>

      {SCORES.map(({ key, label, hint }) => (
        <div key={key} className="space-y-2">
          <div className="flex justify-between">
            <label className="text-white font-medium">{label}</label>
            <span className="text-[#91C4E3] font-bold">{scores[key]}/10</span>
          </div>
          <p className="text-gray-400 text-xs">{hint}</p>
          <input
            type="range" min={1} max={10} step={1}
            value={scores[key]}
            onChange={(e) => setScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
            className="w-full accent-[#91C4E3]"
          />
        </div>
      ))}

      <div className="space-y-2">
        <label className="text-white font-medium">What did you discover about yourself? <span className="text-gray-500 font-normal text-sm">(optional)</span></label>
        <textarea
          value={learningText}
          onChange={(e) => setLearningText(e.target.value)}
          placeholder="Even one sentence is enough."
          rows={2}
          className="w-full bg-[#0d1219] border border-[#91C4E3]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#91C4E3]/50 resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-white font-medium">What was hard? <span className="text-gray-500 font-normal text-sm">(optional)</span></label>
        <textarea
          value={struggleText}
          onChange={(e) => setStruggleText(e.target.value)}
          placeholder="Struggle is data. Don't skip this."
          rows={2}
          className="w-full bg-[#0d1219] border border-[#91C4E3]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#91C4E3]/50 resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#91C4E3] hover:bg-[#65ABFC] text-[#0d1219] font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Submit reflection →"}
      </button>
    </form>
  );
}
```

**Step 2: Write `page.tsx`**

```tsx
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, listSessions } from "@/lib/hackathon/db";
import { ReflectionForm } from "./ReflectionForm";

export default async function ReflectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/hackathon/login");

  const participant = await getSessionParticipant(token);
  if (!participant) redirect("/hackathon/login");

  const sessions = await listSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) notFound();
  if (!session.reflection_unlocked_at) redirect("/hackathon/dashboard");

  return (
    <div className="min-h-screen bg-[#070b10] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-1">
          <p className="text-[#91C4E3] text-sm">Quick check-in · ~90 seconds</p>
          <h1 className="text-2xl font-bold">How was that session?</h1>
        </div>
        <ReflectionForm sessionId={sessionId} sessionTitle={session.title} />
      </div>
    </div>
  );
}
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "hackathon/reflect"
```

**Step 4: Commit**

```bash
git add app/hackathon/reflect/
git commit -m "feat(hackathon): add session reflection page"
```

---

## Task 9: Growth Chart Component (extend dashboard)

**Files:**
- Create: `components/hackathon/GrowthChart.tsx`
- Modify: `app/hackathon/dashboard/page.tsx` (add growth section)

**Prerequisite:** Install recharts if not already present.

```bash
pnpm list recharts 2>/dev/null | grep recharts || pnpm add recharts
```

**Step 1: Write `GrowthChart.tsx`**

```tsx
"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type DataPoint = {
  label: string;
  energy: number;
  confidence: number;
  clarity: number;
};

export function GrowthChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        Complete your first reflection to see your growth chart.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
        <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} />
        <YAxis domain={[1, 10]} tick={{ fill: "#6b7280", fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#0d1219", border: "1px solid #1e2d3d", borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
        <Line type="monotone" dataKey="energy"     stroke="#91C4E3" strokeWidth={2} dot={false} name="Energy" />
        <Line type="monotone" dataKey="confidence" stroke="#a78bfa" strokeWidth={2} dot={false} name="Confidence" />
        <Line type="monotone" dataKey="clarity"    stroke="#34d399" strokeWidth={2} dot={false} name="Clarity" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Step 2: Add growth section to dashboard**

In `app/hackathon/dashboard/page.tsx`, after the existing participant card, add a `useEffect` that fetches `/api/hackathon/reflect` and renders `<GrowthChart>`. Add the following state + effect inside the existing `HackathonDashboardPage` component (it is already a client component):

```tsx
// Add to imports at top
import { GrowthChart } from "@/components/hackathon/GrowthChart";

// Add to state declarations
const [reflections, setReflections] = useState<any[]>([]);

// Add inside the useEffect (after participant is loaded)
fetch("/api/hackathon/reflect")
  .then((r) => r.json())
  .then((d) => setReflections(d.reflections ?? []));

// Build chart data
const chartData = reflections.map((r) => ({
  label: `S${r.session?.session_number ?? "?"}`,
  energy: r.energy_score,
  confidence: r.confidence_score,
  clarity: r.clarity_score,
}));

// Add in JSX after the participant info card
{participant && (
  <div className="bg-[#0d1219]/80 border border-[#91C4E3]/10 rounded-2xl p-5 space-y-3">
    <p className="text-white font-medium text-sm">Your growth</p>
    <GrowthChart data={chartData} />
    <p className="text-gray-500 text-xs text-right">
      {reflections.length} session{reflections.length !== 1 ? "s" : ""} reflected on
    </p>
  </div>
)}
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "GrowthChart|hackathon/dashboard"
```

**Step 4: Commit**

```bash
git add components/hackathon/GrowthChart.tsx app/hackathon/dashboard/page.tsx
git commit -m "feat(hackathon): add growth chart to dashboard"
```

---

## Task 10: Parent Report Page `/hackathon/report/[token]`

**Files:**
- Create: `app/hackathon/report/[token]/page.tsx`

**Step 1: Write the page**

```tsx
import { notFound } from "next/navigation";
import {
  getParentReportByToken,
  getPreSurvey,
  getReflectionsForParticipant,
  findParticipantByEmail,
} from "@/lib/hackathon/db";
import { createAdminClient } from "@/utils/supabase/admin";

async function getParticipantById(id: string) {
  const { data } = await createAdminClient()
    .from("hackathon_participants")
    .select("id, name, university, role")
    .eq("id", id)
    .single();
  return data;
}

function ScoreBar({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="flex items-center gap-4">
      <span className="text-gray-400 text-sm w-36 shrink-0">{label}</span>
      <span className="text-white/40 text-sm w-10 text-right">{before}/10</span>
      <div className="flex-1 bg-white/5 rounded-full h-2">
        <div className="h-2 rounded-full bg-[#91C4E3]" style={{ width: `${after * 10}%` }} />
      </div>
      <span className="text-white font-medium text-sm w-10">{after}/10</span>
      <span className={`text-xs w-8 ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-gray-500"}`}>
        {delta > 0 ? `+${delta}` : delta}
      </span>
    </div>
  );
}

export default async function ParentReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await getParentReportByToken(token);
  if (!report) notFound();

  const [participant, preSurvey, reflections] = await Promise.all([
    getParticipantById(report.participant_id),
    getPreSurvey(report.participant_id),
    getReflectionsForParticipant(report.participant_id),
  ]);
  if (!participant) notFound();

  const isUnlocked = !!report.unlocked_at;
  const lastReflection = reflections[reflections.length - 1];

  // Top 2 learning quotes (most recent non-null learning_text)
  const quotes = reflections
    .filter((r) => r.learning_text)
    .slice(-3)
    .map((r) => ({ text: r.learning_text!, session: r.session?.title ?? "" }));

  return (
    <main className="min-h-screen bg-[#070b10] text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-[#91C4E3] text-xs uppercase tracking-widest">PassionSeed Growth Report</p>
          <h1 className="text-3xl font-bold">{participant.name}</h1>
          <p className="text-gray-400 text-sm">{participant.university} · {participant.role}</p>
        </div>

        {/* Before / After */}
        {preSurvey && (
          <div className="bg-[#0d1219]/80 border border-[#91C4E3]/20 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Before → After</h2>
            <p className="text-gray-400 text-xs">
              Pre-survey baseline vs latest session reflection
            </p>
            <div className="space-y-3">
              <ScoreBar label="Career clarity"    before={preSurvey.career_clarity_score}    after={lastReflection?.clarity_score ?? preSurvey.career_clarity_score} />
              <ScoreBar label="Confidence"        before={preSurvey.skills_confidence_score} after={lastReflection?.confidence_score ?? preSurvey.skills_confidence_score} />
              <ScoreBar label="Future planning"   before={preSurvey.future_clarity_score}    after={lastReflection?.clarity_score ?? preSurvey.future_clarity_score} />
            </div>
          </div>
        )}

        {/* Project */}
        {report.project_title && (
          <div className="bg-[#0d1219]/80 border border-[#91C4E3]/20 rounded-2xl p-6 space-y-2">
            <h2 className="text-white font-semibold">What they built</h2>
            <p className="text-white text-lg">{report.project_title}</p>
            {report.project_url && (
              <a href={report.project_url} target="_blank" rel="noopener noreferrer"
                className="text-[#91C4E3] text-sm underline">
                View project →
              </a>
            )}
          </div>
        )}

        {/* Quotes */}
        {quotes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white font-semibold">In their own words</h2>
            {quotes.map((q, i) => (
              <blockquote key={i} className="border-l-2 border-[#91C4E3]/40 pl-4 space-y-1">
                <p className="text-white/80 text-sm italic">&ldquo;{q.text}&rdquo;</p>
                <p className="text-gray-500 text-xs">{q.session}</p>
              </blockquote>
            ))}
          </div>
        )}

        {/* Locked tier */}
        {!isUnlocked && (
          <div className="bg-[#0d1219]/80 border border-white/10 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-[2px]" />
            <div className="relative space-y-3">
              <p className="text-2xl">🔒</p>
              <h3 className="text-white font-semibold">Full session-by-session timeline</h3>
              <p className="text-gray-400 text-sm">
                See every reflection, every score, and the full growth story across all {reflections.length} sessions.
              </p>
              <p className="text-[#91C4E3] text-sm font-medium">Contact PassionSeed to unlock</p>
            </div>
          </div>
        )}

        {/* Unlocked — full timeline */}
        {isUnlocked && reflections.length > 0 && (
          <div className="bg-[#0d1219]/80 border border-[#91C4E3]/20 rounded-2xl p-6 space-y-4">
            <h2 className="text-white font-semibold">Full timeline</h2>
            <div className="space-y-4">
              {reflections.map((r) => (
                <div key={r.id} className="border-l-2 border-[#91C4E3]/20 pl-4 space-y-1">
                  <p className="text-[#91C4E3] text-xs">{r.session?.title ?? "Session"}</p>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">Energy <span className="text-white">{r.energy_score}</span></span>
                    <span className="text-gray-400">Confidence <span className="text-white">{r.confidence_score}</span></span>
                    <span className="text-gray-400">Clarity <span className="text-white">{r.clarity_score}</span></span>
                  </div>
                  {r.learning_text && <p className="text-white/70 text-sm italic">&ldquo;{r.learning_text}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-gray-600 text-xs">
          Powered by PassionSeed · passionseed.org
        </p>
      </div>
    </main>
  );
}
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "hackathon/report"
```

**Step 3: Commit**

```bash
git add app/hackathon/report/
git commit -m "feat(hackathon): add parent report page"
```

---

## Task 11: Final TypeScript & Lint Check

**Step 1: Full type check**

```bash
pnpm tsc --noEmit
```
Expected: 0 errors.

**Step 2: Lint**

```bash
pnpm lint 2>&1 | tail -20
```
Expected: no errors (warnings ok).

**Step 3: Smoke test the routes mentally**

Verify these pages/routes exist and return 200 / appropriate errors:
- `GET /api/hackathon/survey` → 401 without cookie
- `GET /hackathon/survey` → redirects to `/hackathon/login` without cookie
- `GET /hackathon/report/invalid-token` → 404
- `GET /hackathon/reflect/invalid-session` → redirects to `/hackathon/dashboard`

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final growth tracking feature cleanup"
```

---

## Open Questions (resolve before running Task 7+)

1. **Survey gate:** Should the pre-survey be a hard gate (students cannot access the dashboard until submitted) or a soft nudge (banner in the dashboard)? Hard gate recommended — ensures 100% completion before Day 1.
2. **Price point:** What do parents pay for the full report? Suggested ฿199–฿490. Decide before Task 10 so the locked-tier copy is accurate.
3. **AI summary:** The design called for a 1–2 sentence AI-generated "what this student is becoming" summary. Omitted from Task 10 for now. Add in Phase 2 once you have real reflection data to test against.
4. **Mobile app:** Is the mobile app a separate codebase (React Native/Expo) or a PWA? If separate, the API routes in Tasks 3–6 are the integration surface — mobile just calls the same endpoints with the same cookie.
