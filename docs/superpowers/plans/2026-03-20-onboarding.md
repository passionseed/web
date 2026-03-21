# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/onboard` route that collects career intelligence (interests, 6-signal assessment, influencers) via AI chat or wizard, computes user_type/next_action, and replaces the current hero CTA direction-finder flow.

**Architecture:** Full-screen Dusk-themed wizard with 6 phases (`welcome → interest → assessment → influence → results → account`), backed by `onboarding_state` (resumability) and 3 API routes. Two UX modes: structured wizard (one question per screen) and AI chat (for the assessment phase only). All API routes use the service-role Supabase client.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (service-role client), Vercel AI SDK (`generateText`, non-streaming — consistent with existing codebase), `@ai-sdk/openai` (`gpt-5.3-chat-latest`), TailwindCSS, Shadcn/ui

> **Note on model:** `gpt-5.3-chat-latest` must be registered in `lib/ai/modelRegistry.ts` **before Task 4 runs**. Task 4 starts with this registration step. If running Batch 2 in parallel, complete the model registration sub-step in Task 4 first before dispatching Task 4's API route implementation.

> **Note on streaming:** The spec describes `text/event-stream` streaming, but the existing codebase uses `generateText` (non-streaming) exclusively. We use `generateText` for consistency. The client handles loading state with a spinner — UX is equivalent for short AI responses.

> **Note on `profiles.email`:** The `profiles` table has an `email` column (set in `finish-profile` and confirmed by the upsert in the complete route). The duplicate-email check in Task 5 queries this column safely.

---

## Parallelism Map

```
Batch 1 (parallel): Task 1 + Task 2
Batch 2 (parallel, after Batch 1): Tasks 3 + 4 + 5 + 6
  ⚠️  Task 4: register gpt-5.3-chat-latest in modelRegistry FIRST, then implement the route
Batch 3 (parallel, after Batch 2): Tasks 7 + 8 + 9 + 10 + 11 + 12 + 13
Batch 4 (sequential, after Batch 3): Task 14 → Task 15
```

---

## File Map

**New files:**
- `supabase/migrations/20260320000000_fix_onboarding_step_keys.sql`
- `types/onboarding.ts`
- `lib/onboarding/derive.ts` — pure functions: derive `user_type`, `next_action`, `conversion_priority`
- `lib/onboarding/derive.test.ts`
- `app/api/onboarding/state/route.ts`
- `app/api/onboarding/chat/route.ts`
- `app/api/onboarding/complete/route.ts`
- `app/onboard/page.tsx` — server component: auth check + load state
- `app/onboard/onboard-client.tsx` — client: phase state machine
- `app/onboard/components/progress-dots.tsx`
- `app/onboard/components/chat-panel.tsx`
- `app/onboard/phases/welcome.tsx`
- `app/onboard/phases/interest.tsx` — interest picker logic inlined (single use, YAGNI)
- `app/onboard/phases/assessment-wizard.tsx` — assessment card UI inlined (single use)
- `app/onboard/phases/assessment-chat.tsx`
- `app/onboard/phases/influence.tsx`
- `app/onboard/phases/results.tsx` — results card logic inlined (single use)
- `app/onboard/phases/account.tsx`

**Modified files:**
- `lib/ai/modelRegistry.ts` — register `gpt-5.3-chat-latest`
- `components/landing-hero.tsx` — change CTA destination
- `app/page.tsx` — expand gate logic for `is_onboarded` + anon users

> **YAGNI note:** The spec lists `mode-card.tsx`, `interest-picker.tsx`, `assessment-card.tsx`, `results-card.tsx` as separate component files. Since each is used in exactly one phase, they are inlined into their respective phase files. Extract to components only if reuse emerges.

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260320000000_fix_onboarding_step_keys.sql`

- [ ] **Create migration file**

```sql
-- Fix onboarding_state.current_step CHECK constraint to match new phase keys
ALTER TABLE public.onboarding_state
  DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check;

ALTER TABLE public.onboarding_state
  ADD CONSTRAINT onboarding_state_current_step_check
  CHECK (current_step IN ('welcome','interest','assessment','influence','results','account'));
```

- [ ] **Apply migration**

```bash
supabase db push --local
```

Expected output: migration applied with no errors.

- [ ] **Commit**

```bash
git add supabase/migrations/20260320000000_fix_onboarding_step_keys.sql
git commit -m "feat(db): fix onboarding_state step key constraint for new phases"
```

---

## Task 2: Types + Derivation Logic

**Files:**
- Create: `types/onboarding.ts`
- Create: `lib/onboarding/derive.ts`
- Create: `lib/onboarding/derive.test.ts`

- [ ] **Create types**

```typescript
// types/onboarding.ts

export type OnboardingStep =
  | 'welcome'
  | 'interest'
  | 'assessment'
  | 'influence'
  | 'results'
  | 'account';

export type OnboardingMode = 'chat' | 'wizard';

// 6 signal fields
export type Stage = 'exploring' | 'choosing' | 'applying_soon' | 'urgent';
export type TargetClarity = 'none' | 'field_only' | 'specific';
export type PrimaryBlocker =
  | 'dont_know'
  | 'low_profile'
  | 'financial'
  | 'family_pressure'
  | 'application_process';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type CareerDirection = 'no_idea' | 'some_ideas' | 'clear_goal';
export type CommitmentSignal = 'browsing' | 'researching' | 'preparing';

// Computed outputs
export type UserType = 'lost' | 'explorer' | 'planner' | 'executor';
export type NextAction = 'educate' | 'narrow' | 'execute' | 'escalate';
export type ConversionPriority = 'low' | 'medium' | 'high';

export type InfluenceSource =
  | 'self'
  | 'parents'
  | 'peers'
  | 'teachers'
  | 'social_media';

export interface CollectedData {
  language?: 'en' | 'th';
  name?: string;
  mode?: OnboardingMode;
  interests?: string[];
  // Assessment fields
  stage?: Stage;
  target_clarity?: TargetClarity;
  primary_blocker?: PrimaryBlocker;
  confidence?: ConfidenceLevel;
  career_direction?: CareerDirection;
  commitment_signal?: CommitmentSignal;
  // Influence
  influencers?: InfluenceSource[];
  // Computed
  user_type?: UserType;
  next_action?: NextAction;
  conversion_priority?: ConversionPriority;
}

export interface OnboardingState {
  user_id: string;
  current_step: OnboardingStep;
  chat_history: Array<{ role: 'user' | 'assistant'; content: string }>;
  collected_data: CollectedData;
  updated_at: string;
}

export interface AssessmentExtractionResult {
  stage?: Stage;
  target_clarity?: TargetClarity;
  primary_blocker?: PrimaryBlocker;
  confidence?: ConfidenceLevel;
  career_direction?: CareerDirection;
  commitment_signal?: CommitmentSignal;
}

export function isAssessmentComplete(data: CollectedData): boolean {
  return !!(
    data.stage &&
    data.target_clarity &&
    data.primary_blocker &&
    data.confidence &&
    data.career_direction &&
    data.commitment_signal
  );
}
```

- [ ] **Create derivation logic with tests first**

```typescript
// lib/onboarding/derive.test.ts
import { deriveOutputs } from './derive';

describe('deriveOutputs', () => {
  it('classifies lost user', () => {
    const result = deriveOutputs({
      stage: 'exploring',
      target_clarity: 'none',
      confidence: 'low',
      career_direction: 'no_idea',
      commitment_signal: 'browsing',
      primary_blocker: 'dont_know',
    });
    expect(result.user_type).toBe('lost');
    expect(result.next_action).toBe('educate');
    expect(result.conversion_priority).toBe('low');
  });

  it('classifies executor', () => {
    const result = deriveOutputs({
      stage: 'urgent',
      target_clarity: 'specific',
      confidence: 'high',
      career_direction: 'clear_goal',
      commitment_signal: 'preparing',
      primary_blocker: 'application_process',
    });
    expect(result.user_type).toBe('executor');
    expect(result.next_action).toBe('escalate');
    expect(result.conversion_priority).toBe('high');
  });

  it('classifies planner (choosing stage → narrow, not execute)', () => {
    const result = deriveOutputs({
      stage: 'choosing',
      target_clarity: 'specific',
      confidence: 'medium',
      career_direction: 'clear_goal',
      commitment_signal: 'researching',
      primary_blocker: 'low_profile',
    });
    expect(result.user_type).toBe('planner');
    expect(result.next_action).toBe('narrow'); // execute requires applying_soon+specific
    expect(result.conversion_priority).toBe('medium');
  });

  it('routes planner with applying_soon+specific to execute', () => {
    const result = deriveOutputs({
      stage: 'applying_soon',
      target_clarity: 'specific',
      confidence: 'high',
      career_direction: 'clear_goal',
      commitment_signal: 'researching',
      primary_blocker: 'application_process',
    });
    expect(result.next_action).toBe('execute');
    expect(result.conversion_priority).toBe('high');
  });

  it('classifies explorer', () => {
    const result = deriveOutputs({
      stage: 'exploring',
      target_clarity: 'field_only',
      confidence: 'low',
      career_direction: 'some_ideas',
      commitment_signal: 'researching',
      primary_blocker: 'dont_know',
    });
    expect(result.user_type).toBe('explorer');
    expect(result.next_action).toBe('narrow');
    expect(result.conversion_priority).toBe('medium');
  });
});
```

- [ ] **Run test to confirm fail**

```bash
cd /Users/bunyasit/dev/pseed && pnpm test lib/onboarding/derive.test.ts
```

Expected: FAIL — module not found.

- [ ] **Implement derivation logic**

```typescript
// lib/onboarding/derive.ts
import type {
  CollectedData,
  UserType,
  NextAction,
  ConversionPriority,
} from '@/types/onboarding';

interface DeriveInputs {
  stage: CollectedData['stage'];
  target_clarity: CollectedData['target_clarity'];
  confidence: CollectedData['confidence'];
  career_direction: CollectedData['career_direction'];
  commitment_signal: CollectedData['commitment_signal'];
  primary_blocker: CollectedData['primary_blocker'];
}

interface DeriveOutputs {
  user_type: UserType;
  next_action: NextAction;
  conversion_priority: ConversionPriority;
}

export function deriveOutputs(inputs: DeriveInputs): DeriveOutputs {
  const { stage, target_clarity, confidence, career_direction, commitment_signal } = inputs;

  // User type
  let user_type: UserType;
  if ((stage === 'applying_soon' || stage === 'urgent') && commitment_signal === 'preparing') {
    user_type = 'executor';
  } else if (target_clarity === 'specific' && career_direction === 'clear_goal') {
    user_type = 'planner';
  } else if (target_clarity === 'none' && confidence === 'low' && career_direction === 'no_idea') {
    user_type = 'lost';
  } else {
    user_type = 'explorer';
  }

  // Next action — spec: escalate=urgent/executor, execute=specific+applying_soon, narrow=planner/field_only, educate=lost
  let next_action: NextAction;
  if (stage === 'urgent' || user_type === 'executor') {
    next_action = 'escalate';
  } else if (target_clarity === 'specific' && (stage === 'applying_soon')) {
    next_action = 'execute';
  } else if (user_type === 'planner' || target_clarity === 'field_only') {
    next_action = 'narrow';
  } else {
    next_action = 'educate';
  }

  // Conversion priority
  let conversion_priority: ConversionPriority;
  if (stage === 'urgent' || stage === 'applying_soon' || commitment_signal === 'preparing') {
    conversion_priority = 'high';
  } else if (commitment_signal === 'researching' || user_type === 'planner') {
    conversion_priority = 'medium';
  } else {
    conversion_priority = 'low';
  }

  return { user_type, next_action, conversion_priority };
}
```

- [ ] **Run tests — confirm pass**

```bash
pnpm test lib/onboarding/derive.test.ts
```

Expected: 4 passing.

- [ ] **Commit**

```bash
git add types/onboarding.ts lib/onboarding/derive.ts lib/onboarding/derive.test.ts
git commit -m "feat(onboarding): add types and derivation logic for user_type/next_action"
```

---

## Task 3: API — State Route

**Files:**
- Create: `app/api/onboarding/state/route.ts`

Pattern: see `app/api/admin/hackathon/participants/route.ts` for service-role client usage.

- [ ] **Implement state upsert route**

```typescript
// app/api/onboarding/state/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { OnboardingStep, CollectedData } from '@/types/onboarding';

const VALID_STEPS: OnboardingStep[] = [
  'welcome', 'interest', 'assessment', 'influence', 'results', 'account',
];

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { step, collected_data } = body as { step: string; collected_data: CollectedData };

  if (!VALID_STEPS.includes(step as OnboardingStep)) {
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  }

  const service = getServiceClient();
  const { error } = await service
    .from('onboarding_state')
    .upsert({
      user_id: user.id,
      current_step: step,
      collected_data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[onboarding/state]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Commit**

```bash
git add app/api/onboarding/state/route.ts
git commit -m "feat(onboarding): add state upsert API route"
```

---

## Task 4: API — Chat Route

**Files:**
- Create: `app/api/onboarding/chat/route.ts`

Pattern: see `app/api/pathlab/chat/route.ts` for `generateText` + `getModel` usage.

- [ ] **Register model in `lib/ai/modelRegistry.ts`**

In `AVAILABLE_MODELS.openai` array, add:
```typescript
{ id: 'gpt-5.3-chat-latest', name: 'GPT-5.3 Chat', speed: 'fast', cost: 'high' },
```

In `getModel()` function, add before the default fallback:
```typescript
if (resolvedModelName === 'gpt-5.3-chat-latest') return openai('gpt-5.3-chat-latest');
```

- [ ] **Implement chat route**

```typescript
// app/api/onboarding/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getModel } from '@/lib/ai/modelRegistry';
import { deriveOutputs } from '@/lib/onboarding/derive';
import type { CollectedData, AssessmentExtractionResult } from '@/types/onboarding';
import { isAssessmentComplete } from '@/types/onboarding';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SYSTEM_PROMPT = `You are a warm, concise career advisor helping a student understand their situation.
Your goal is to naturally extract 6 signals through conversation (2-4 turns max):
- stage: one of exploring/choosing/applying_soon/urgent
- target_clarity: one of none/field_only/specific
- primary_blocker: one of dont_know/low_profile/financial/family_pressure/application_process
- confidence: one of low/medium/high
- career_direction: one of no_idea/some_ideas/clear_goal
- commitment_signal: one of browsing/researching/preparing

After each user message, respond conversationally. Do NOT list these fields or make it feel like a form.
If confidence is unclear after 2 turns, ask: "On a scale of low, medium, or high — how confident do you feel about your direction right now?"

At the end of your response, append a JSON block (invisible to user) wrapped in <extract></extract> tags:
<extract>{"stage":null,"target_clarity":null,"primary_blocker":null,"confidence":null,"career_direction":null,"commitment_signal":null}</extract>
Fill in only fields you can confidently infer. Use null for uncertain fields.`;

function parseExtraction(text: string): AssessmentExtractionResult {
  const match = text.match(/<extract>([\s\S]*?)<\/extract>/);
  if (!match) return {};
  try {
    return JSON.parse(match[1]);
  } catch {
    return {};
  }
}

function cleanResponse(text: string): string {
  return text.replace(/<extract>[\s\S]*?<\/extract>/, '').trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, collected_data, interests } = await request.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    collected_data: CollectedData;
    interests: string[];
  };

  const interestContext = interests?.length
    ? `The student is interested in: ${interests.join(', ')}.`
    : '';

  try {
    const { text } = await generateText({
      model: getModel('gpt-5.3-chat-latest'),
      system: `${SYSTEM_PROMPT}\n\n${interestContext}`,
      messages,
    });

    const extraction = parseExtraction(text);
    const cleanText = cleanResponse(text);

    // Merge extracted fields into collected_data
    const updatedData: CollectedData = {
      ...collected_data,
      ...Object.fromEntries(
        Object.entries(extraction).filter(([, v]) => v !== null)
      ),
    };

    // Compute derived outputs if all 6 fields present
    if (isAssessmentComplete(updatedData)) {
      const derived = deriveOutputs({
        stage: updatedData.stage!,
        target_clarity: updatedData.target_clarity!,
        primary_blocker: updatedData.primary_blocker!,
        confidence: updatedData.confidence!,
        career_direction: updatedData.career_direction!,
        commitment_signal: updatedData.commitment_signal!,
      });
      Object.assign(updatedData, derived);
    }

    // Persist updated state
    const service = getServiceClient();
    await service.from('onboarding_state').upsert({
      user_id: user.id,
      current_step: 'assessment',
      collected_data: updatedData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return NextResponse.json({
      message: cleanText,
      collected_data: updatedData,
      assessment_complete: isAssessmentComplete(updatedData),
    });
  } catch (err) {
    console.error('[onboarding/chat]', err);
    return NextResponse.json({ error: 'AI error' }, { status: 500 });
  }
}
```

- [ ] **Commit**

```bash
git add app/api/onboarding/chat/route.ts
git commit -m "feat(onboarding): add AI chat route with extraction and derivation"
```

---

## Task 5: API — Complete Route

**Files:**
- Create: `app/api/onboarding/complete/route.ts`

- [ ] **Implement complete route**

```typescript
// app/api/onboarding/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface CompleteBody {
  username: string;
  date_of_birth: string;
  education_level: 'high_school' | 'university' | 'unaffiliated';
  preferred_language: 'en' | 'th';
  interests: string[];     // career_goals
  collected_data: Record<string, unknown>;
  // Anon upgrade fields (optional)
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CompleteBody = await request.json();
  const { username, date_of_birth, education_level, preferred_language, interests, email, password } = body;

  // Validate required fields
  if (!username || !date_of_birth || !education_level) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 });
  }

  const service = getServiceClient();

  // If anonymous user, upgrade session first
  const isAnon = user.is_anonymous === true || user.app_metadata?.provider === 'anonymous';
  if (isAnon) {
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required for account creation' }, { status: 422 });
    }
    // Check if email already exists
    const { data: existing } = await service
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const { error: upgradeError } = await supabase.auth.updateUser({ email, password });
    if (upgradeError) {
      console.error('[onboarding/complete] upgrade error', upgradeError);
      return NextResponse.json({ error: upgradeError.message }, { status: 400 });
    }
  }

  // Check username uniqueness
  const { data: existingUsername } = await service
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle();

  if (existingUsername) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  // Update profile
  const { error: profileError } = await service.from('profiles').upsert({
    id: user.id,
    username,
    date_of_birth,
    education_level,
    preferred_language,
    email: user.email || email,
    full_name: body.collected_data?.name as string || null,
    is_onboarded: true,
    onboarded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error('[onboarding/complete] profile error', profileError);
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
  }

  // Save career goals
  if (interests?.length) {
    const goals = interests.map((career_name: string) => ({
      user_id: user.id,
      career_name,
      source: 'user_typed' as const,
    }));
    await service.from('career_goals').insert(goals);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Commit**

```bash
git add app/api/onboarding/complete/route.ts
git commit -m "feat(onboarding): add complete route — saves profile, career goals, is_onboarded"
```

---

## Task 6: Onboarding Shell

**Files:**
- Create: `app/onboard/page.tsx`
- Create: `app/onboard/onboard-client.tsx`
- Create: `app/onboard/components/progress-dots.tsx`

- [ ] **Create server page (auth check + state load)**

```typescript
// app/onboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { OnboardClient } from './onboard-client';
import type { OnboardingState } from '@/types/onboarding';

export const dynamic = 'force-dynamic';

export default async function OnboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Load existing onboarding state (resumability)
  const { data: state } = await supabase
    .from('onboarding_state')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Already onboarded — redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_onboarded')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.is_onboarded) redirect('/me');

  const oauthName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null;

  return (
    <OnboardClient
      userId={user.id}
      isAnonymous={user.is_anonymous === true}
      oauthName={oauthName}
      initialState={state as OnboardingState | null}
    />
  );
}
```

- [ ] **Create progress dots component**

```typescript
// app/onboard/components/progress-dots.tsx
'use client';

import type { OnboardingStep } from '@/types/onboarding';

const STEPS: OnboardingStep[] = ['welcome', 'interest', 'assessment', 'influence', 'results', 'account'];

interface ProgressDotsProps {
  currentStep: OnboardingStep;
}

export function ProgressDots({ currentStep }: ProgressDotsProps) {
  const currentIndex = STEPS.indexOf(currentStep);
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, i) => (
        <div
          key={step}
          className={`rounded-full transition-all duration-300 ${
            i < currentIndex
              ? 'w-2 h-2 bg-violet-400'
              : i === currentIndex
              ? 'w-3 h-3 bg-white'
              : 'w-2 h-2 bg-white/20'
          }`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Create client shell (phase state machine)**

```typescript
// app/onboard/onboard-client.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressDots } from './components/progress-dots';
import { WelcomePhase } from './phases/welcome';
import { InterestPhase } from './phases/interest';
import { AssessmentWizardPhase } from './phases/assessment-wizard';
import { AssessmentChatPhase } from './phases/assessment-chat';
import { InfluencePhase } from './phases/influence';
import { ResultsPhase } from './phases/results';
import { AccountPhase } from './phases/account';
import type { OnboardingStep, OnboardingState, CollectedData } from '@/types/onboarding';

interface OnboardClientProps {
  userId: string;
  isAnonymous: boolean;
  oauthName: string | null;
  initialState: OnboardingState | null;
}

export function OnboardClient({ userId, isAnonymous, oauthName, initialState }: OnboardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(initialState?.current_step || 'welcome');
  const [data, setData] = useState<CollectedData>(initialState?.collected_data || {});
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(
    initialState?.chat_history || []
  );

  const saveState = useCallback(async (nextStep: OnboardingStep, nextData: CollectedData) => {
    await fetch('/api/onboarding/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: nextStep, collected_data: nextData }),
    });
  }, []);

  const advance = useCallback(async (nextStep: OnboardingStep, updates: Partial<CollectedData>) => {
    const nextData = { ...data, ...updates };
    setData(nextData);
    setStep(nextStep);
    await saveState(nextStep, nextData);
  }, [data, saveState]);

  const handleExit = () => router.push('/me');

  const sharedProps = { data, advance };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a2e] via-[#2d1449] to-[#4a1d6b] text-white flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14 bg-[#1a0a2e]/80 backdrop-blur-md border-b border-white/[0.04]">
        <span className="font-bold text-sm tracking-wide text-white/80">PassionSeed</span>
        <ProgressDots currentStep={step} />
        <button onClick={handleExit} className="text-xs text-white/40 hover:text-white/70 transition-colors">
          Exit
        </button>
      </header>

      {/* Phase content */}
      <main className="flex-1 flex items-center justify-center pt-14">
        {step === 'welcome' && (
          <WelcomePhase {...sharedProps} oauthName={oauthName} />
        )}
        {step === 'interest' && (
          <InterestPhase {...sharedProps} />
        )}
        {step === 'assessment' && data.mode === 'chat' && (
          <AssessmentChatPhase
            {...sharedProps}
            chatHistory={chatHistory}
            onChatHistoryChange={setChatHistory}
          />
        )}
        {step === 'assessment' && data.mode !== 'chat' && (
          <AssessmentWizardPhase {...sharedProps} />
        )}
        {step === 'influence' && (
          <InfluencePhase {...sharedProps} />
        )}
        {step === 'results' && (
          <ResultsPhase {...sharedProps} />
        )}
        {step === 'account' && (
          <AccountPhase {...sharedProps} isAnonymous={isAnonymous} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/page.tsx app/onboard/onboard-client.tsx app/onboard/components/progress-dots.tsx
git commit -m "feat(onboarding): add shell — server page, client state machine, progress dots"
```

---

## Task 7: Welcome Phase

**Files:**
- Create: `app/onboard/phases/welcome.tsx`

- [ ] **Implement welcome phase**

```typescript
// app/onboard/phases/welcome.tsx
'use client';

import { useState } from 'react';
import type { CollectedData, OnboardingStep } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  oauthName: string | null;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

const content = {
  en: {
    nameLabel: "What's your first name?",
    namePlaceholder: 'Your name',
    greeting: (name: string) => `Hey ${name}, let's figure out what excites you.`,
    chatTitle: 'Chat with me',
    chatSub: 'Talk naturally, I\'ll ask you questions',
    wizardTitle: 'Answer questions',
    wizardSub: 'Prefer structured? Go step by step',
    next: 'Continue',
    languageToggle: 'TH',
  },
  th: {
    nameLabel: 'ชื่อของคุณคืออะไร?',
    namePlaceholder: 'ชื่อของคุณ',
    greeting: (name: string) => `สวัสดี ${name}, มาหาสิ่งที่ใช่สำหรับคุณกัน`,
    chatTitle: 'คุยกับ AI',
    chatSub: 'พูดตามสบาย ฉันจะถามคำถาม',
    wizardTitle: 'ตอบคำถาม',
    wizardSub: 'ชอบแบบมีโครงสร้าง? ทำทีละขั้น',
    next: 'ต่อไป',
    languageToggle: 'EN',
  },
};

export function WelcomePhase({ data, oauthName, advance }: Props) {
  const [language, setLanguage] = useState<'en' | 'th'>(data.language || 'en');
  const [name, setName] = useState(data.name || oauthName || '');
  const [mode, setMode] = useState<'chat' | 'wizard'>(data.mode || 'wizard');

  const t = content[language];
  const canProceed = name.trim().length > 0;

  const handleNext = () => {
    advance('interest', { language, name: name.trim(), mode });
  };

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-8">
      {/* Language toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setLanguage(l => l === 'en' ? 'th' : 'en')}
          className="text-xs px-3 py-1.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
        >
          {t.languageToggle}
        </button>
      </div>

      {/* Name */}
      {!oauthName ? (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-white/70">{t.nameLabel}</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-colors"
          />
        </div>
      ) : (
        <p className="text-2xl font-semibold text-center leading-snug">
          {t.greeting(oauthName)}
        </p>
      )}

      {/* Mode selection */}
      <div className="flex flex-col gap-3">
        {(['chat', 'wizard'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`ei-card flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              mode === m ? 'border-violet-400 bg-violet-400/10' : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="text-2xl">{m === 'chat' ? '💬' : '📋'}</div>
            <div>
              <div className="font-semibold text-sm">
                {m === 'chat' ? t.chatTitle : t.wizardTitle}
              </div>
              <div className="text-xs text-white/50 mt-0.5">
                {m === 'chat' ? t.chatSub : t.wizardSub}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        disabled={!canProceed}
        onClick={handleNext}
        className="ei-button-dusk w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {t.next}
      </button>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/welcome.tsx
git commit -m "feat(onboarding): add welcome phase — language toggle, name, mode selection"
```

---

## Task 8: Interest Phase

**Files:**
- Create: `app/onboard/phases/interest.tsx`

- [ ] **Implement interest picker**

```typescript
// app/onboard/phases/interest.tsx
'use client';

import { useState } from 'react';
import type { CollectedData, OnboardingStep } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

const CLUSTERS: Record<string, string[]> = {
  Technology: ['Computer Science', 'Software Engineering', 'Data Science', 'AI / Machine Learning', 'Cybersecurity', 'Web Development'],
  Design: ['UX/UI Design', 'Graphic Design', 'Product Design', 'Architecture', 'Fashion Design', 'Film & Media'],
  Business: ['Business Administration', 'Marketing', 'Finance', 'Entrepreneurship', 'Economics', 'Accounting'],
  Sciences: ['Medicine', 'Biology', 'Chemistry', 'Physics', 'Environmental Science', 'Psychology'],
  Arts: ['Fine Arts', 'Music', 'Theater', 'Creative Writing', 'Photography', 'Animation'],
  Law: ['Law', 'International Relations', 'Political Science', 'Public Policy'],
  Education: ['Teaching', 'Educational Psychology', 'Early Childhood', 'Special Education'],
};

const CLUSTER_ICONS: Record<string, string> = {
  Technology: '💻', Design: '🎨', Business: '📊', Sciences: '🔬',
  Arts: '🎭', Law: '⚖️', Education: '📚',
};

export function InterestPhase({ data, advance }: Props) {
  const [selected, setSelected] = useState<string[]>(data.interests || []);
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const language = data.language || 'en';
  const isEn = language === 'en';

  const toggle = (item: string) => {
    setSelected(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : prev.length < 3
        ? [...prev, item]
        : prev
    );
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed) && selected.length < 3) {
      setSelected(prev => [...prev, trimmed]);
      setCustomInput('');
    }
  };

  return (
    <div className="w-full max-w-lg px-6 flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {isEn ? 'What are you interested in?' : 'คุณสนใจด้านไหน?'}
        </h2>
        <p className="text-white/50 text-sm mt-1">
          {isEn ? 'Pick up to 3 — no pressure to be sure yet' : 'เลือกได้สูงสุด 3 อย่าง — ไม่ต้องแน่ใจ 100%'}
        </p>
      </div>

      {/* Cluster grid */}
      {!activeCluster ? (
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(CLUSTERS).map(cluster => (
            <button
              key={cluster}
              onClick={() => setActiveCluster(cluster)}
              className="ei-card flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 hover:border-violet-400/50 hover:bg-violet-400/5 transition-all text-left"
            >
              <span className="text-lg">{CLUSTER_ICONS[cluster]}</span>
              <span className="text-sm font-medium">{cluster}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setActiveCluster(null)}
            className="text-xs text-violet-400 hover:text-violet-300 text-left"
          >
            ← {isEn ? 'Back to categories' : 'กลับไปหมวดหมู่'}
          </button>
          <div className="flex flex-wrap gap-2">
            {CLUSTERS[activeCluster].map(item => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  selected.includes(item)
                    ? 'border-violet-400 bg-violet-400/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          placeholder={isEn ? 'Type something else...' : 'พิมพ์อื่นๆ...'}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
        />
        <button
          onClick={addCustom}
          disabled={!customInput.trim() || selected.length >= 3}
          className="px-3 py-2 rounded-xl border border-white/10 text-sm hover:border-violet-400 disabled:opacity-30 transition-all"
        >
          +
        </button>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(item => (
            <span
              key={item}
              onClick={() => toggle(item)}
              className="px-3 py-1 rounded-full text-xs bg-violet-500/20 border border-violet-400/50 text-violet-300 cursor-pointer hover:bg-violet-500/30 transition-all"
            >
              {item} ×
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => advance('assessment', { interests: selected })}
        disabled={selected.length === 0}
        className="ei-button-dusk w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isEn ? 'Next' : 'ถัดไป'} →
      </button>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/interest.tsx
git commit -m "feat(onboarding): add interest picker phase — clusters + free-type"
```

---

## Task 9: Assessment Wizard Phase

**Files:**
- Create: `app/onboard/phases/assessment-wizard.tsx`

- [ ] **Implement wizard (6 sub-screens, one field per screen)**

```typescript
// app/onboard/phases/assessment-wizard.tsx
'use client';

import { useState } from 'react';
import { deriveOutputs } from '@/lib/onboarding/derive';
import type { CollectedData, OnboardingStep, Stage, TargetClarity, PrimaryBlocker, ConfidenceLevel, CareerDirection, CommitmentSignal } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

type WizardStep = 'stage' | 'target_clarity' | 'primary_blocker' | 'confidence' | 'career_direction' | 'commitment_signal';
const WIZARD_STEPS: WizardStep[] = ['stage', 'target_clarity', 'primary_blocker', 'confidence', 'career_direction', 'commitment_signal'];

const QUESTIONS: Record<WizardStep, { en: string; th: string }> = {
  stage: { en: 'Where are you right now?', th: 'ตอนนี้คุณอยู่ที่จุดไหน?' },
  target_clarity: { en: 'How clear is your target?', th: 'คุณชัดเจนเรื่องเป้าหมายแค่ไหน?' },
  primary_blocker: { en: "What's holding you back most?", th: 'อะไรที่ขวางคุณมากที่สุด?' },
  confidence: { en: 'How confident do you feel about your direction?', th: 'คุณมั่นใจเรื่องทิศทางของตัวเองแค่ไหน?' },
  career_direction: { en: 'How clear is your career goal?', th: 'เป้าหมายอาชีพของคุณชัดเจนแค่ไหน?' },
  commitment_signal: { en: 'What are you doing about it right now?', th: 'ตอนนี้คุณทำอะไรอยู่บ้าง?' },
};

const OPTIONS: Record<WizardStep, { value: string; en: string; th: string; emoji: string }[]> = {
  stage: [
    { value: 'exploring', en: 'Exploring', th: 'กำลังสำรวจ', emoji: '🔍' },
    { value: 'choosing', en: 'Choosing', th: 'กำลังเลือก', emoji: '🤔' },
    { value: 'applying_soon', en: 'Applying soon', th: 'จะยื่นสมัครเร็วๆ นี้', emoji: '📝' },
    { value: 'urgent', en: 'Urgent (≤3 months)', th: 'เร่งด่วน (≤3 เดือน)', emoji: '🚨' },
  ],
  target_clarity: [
    { value: 'none', en: 'No idea yet', th: 'ยังไม่รู้เลย', emoji: '❓' },
    { value: 'field_only', en: 'I know the field', th: 'รู้แค่สายงาน', emoji: '🗺️' },
    { value: 'specific', en: 'Specific school + program', th: 'มีเป้าหมายชัดเจน', emoji: '🎯' },
  ],
  primary_blocker: [
    { value: 'dont_know', en: "Don't know what to choose", th: 'ไม่รู้จะเลือกอะไร', emoji: '🤷' },
    { value: 'low_profile', en: 'Not confident in my profile', th: 'ไม่มั่นใจในโปรไฟล์ตัวเอง', emoji: '📉' },
    { value: 'financial', en: 'Financial concern', th: 'กังวลเรื่องค่าใช้จ่าย', emoji: '💰' },
    { value: 'family_pressure', en: 'Family pressure', th: 'แรงกดดันจากครอบครัว', emoji: '👨‍👩‍👧' },
    { value: 'application_process', en: 'Confused about applications', th: 'สับสนเรื่องขั้นตอนสมัคร', emoji: '📋' },
  ],
  confidence: [
    { value: 'low', en: 'Low — very unsure', th: 'ต่ำ — ไม่แน่ใจมาก', emoji: '😟' },
    { value: 'medium', en: 'Medium — some ideas', th: 'กลาง — มีแนวคิดบ้าง', emoji: '🙂' },
    { value: 'high', en: 'High — pretty clear', th: 'สูง — ค่อนข้างชัดเจน', emoji: '😊' },
  ],
  career_direction: [
    { value: 'no_idea', en: 'No idea', th: 'ไม่รู้เลย', emoji: '🌫️' },
    { value: 'some_ideas', en: 'Some ideas', th: 'มีแนวคิดบ้าง', emoji: '💡' },
    { value: 'clear_goal', en: 'Clear goal', th: 'ชัดเจน', emoji: '⭐' },
  ],
  commitment_signal: [
    { value: 'browsing', en: 'Just browsing', th: 'แค่เปิดดู', emoji: '👀' },
    { value: 'researching', en: 'Actively researching', th: 'กำลังหาข้อมูลอยู่', emoji: '🔎' },
    { value: 'preparing', en: 'Already preparing / applying', th: 'เตรียมตัวหรือสมัครแล้ว', emoji: '🏃' },
  ],
};

export function AssessmentWizardPhase({ data, advance }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<CollectedData>>({});
  const lang = (data.language || 'en') as 'en' | 'th';
  const isEn = lang === 'en';

  const currentField = WIZARD_STEPS[stepIndex];
  const question = QUESTIONS[currentField][lang];
  const options = OPTIONS[currentField];

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [currentField]: value };
    setAnswers(newAnswers);

    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      // All 6 fields collected — derive outputs and advance
      const complete = newAnswers as Required<Pick<CollectedData, 'stage' | 'target_clarity' | 'primary_blocker' | 'confidence' | 'career_direction' | 'commitment_signal'>>;
      const derived = deriveOutputs(complete);
      advance('influence', { ...complete, ...derived });
    }
  };

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-6">
      <div className="text-center">
        <p className="text-xs text-white/40 mb-2">{stepIndex + 1} / {WIZARD_STEPS.length}</p>
        <h2 className="text-xl font-bold">{question}</h2>
      </div>

      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className="ei-card flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-violet-400/60 hover:bg-violet-400/5 transition-all text-left"
          >
            <span className="text-xl">{opt.emoji}</span>
            <span className="text-sm font-medium">{isEn ? opt.en : opt.th}</span>
          </button>
        ))}
      </div>

      {stepIndex > 0 && (
        <button
          onClick={() => setStepIndex(i => i - 1)}
          className="text-xs text-white/40 hover:text-white/60 text-center"
        >
          ← {isEn ? 'Back' : 'ย้อนกลับ'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/assessment-wizard.tsx
git commit -m "feat(onboarding): add assessment wizard — 6 sub-screens, derives user_type on complete"
```

---

## Task 10: Assessment Chat Phase

**Files:**
- Create: `app/onboard/phases/assessment-chat.tsx`
- Create: `app/onboard/components/chat-panel.tsx`

- [ ] **Create reusable chat panel**

```typescript
// app/onboard/components/chat-panel.tsx
'use client';

import { useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => void;
  isLoading: boolean;
  placeholder?: string;
  contextChips?: string[];
}

export function ChatPanel({ messages, onSend, isLoading, placeholder, contextChips }: ChatPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const val = inputRef.current?.value.trim();
    if (!val || isLoading) return;
    onSend(val);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {contextChips?.length ? (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-white/5">
          {contextChips.map(chip => (
            <span key={chip} className="px-2 py-0.5 rounded-full text-xs bg-violet-500/20 text-violet-300 border border-violet-400/30">
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-violet-500/30 text-white'
                : 'bg-white/10 text-white/90'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 text-white/50 text-sm">...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-white/5 flex gap-2">
        <input
          ref={inputRef}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={placeholder || 'Type your message...'}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-sm font-medium transition-all"
        >
          →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Create assessment chat phase**

```typescript
// app/onboard/phases/assessment-chat.tsx
'use client';

import { useState, useEffect } from 'react';
import { ChatPanel } from '../components/chat-panel';
import { isAssessmentComplete } from '@/types/onboarding';
import type { CollectedData, OnboardingStep } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChatHistoryChange: (history: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
}

const OPENING = {
  en: "Now tell me — do you have a plan for getting into a university or program that'll make you happy?",
  th: 'บอกฉันหน่อยนะ — คุณมีแผนสำหรับการเข้ามหาวิทยาลัยหรือโปรแกรมที่จะทำให้คุณมีความสุขไหม?',
};

export function AssessmentChatPhase({ data, advance, chatHistory, onChatHistoryChange }: Props) {
  const [localData, setLocalData] = useState<CollectedData>(data);
  const [isLoading, setIsLoading] = useState(false);
  const lang = (data.language || 'en') as 'en' | 'th';
  const isEn = lang === 'en';

  // Seed opening message if no history
  useEffect(() => {
    if (chatHistory.length === 0) {
      onChatHistoryChange([{ role: 'assistant', content: OPENING[lang] }]);
    }
  }, []);

  const handleSend = async (text: string) => {
    const newHistory = [...chatHistory, { role: 'user' as const, content: text }];
    onChatHistoryChange(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          collected_data: localData,
          interests: localData.interests || [],
        }),
      });

      if (!res.ok) throw new Error('Chat error');

      const json = await res.json();
      onChatHistoryChange([...newHistory, { role: 'assistant', content: json.message }]);
      setLocalData(json.collected_data);
    } catch {
      onChatHistoryChange([...newHistory, {
        role: 'assistant',
        content: isEn
          ? 'Something went wrong — please try again.'
          : 'เกิดข้อผิดพลาด — ลองอีกครั้ง',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const canAdvance = isAssessmentComplete(localData);

  return (
    <div className="w-full max-w-lg h-[calc(100vh-56px)] flex flex-col">
      <ChatPanel
        messages={chatHistory}
        onSend={handleSend}
        isLoading={isLoading}
        placeholder={isEn ? "Tell me about your plans..." : "เล่าให้ฟังเกี่ยวกับแผนของคุณ..."}
        contextChips={localData.interests}
      />

      {canAdvance && (
        <div className="px-4 pb-4">
          <button
            onClick={() => advance('influence', localData)}
            className="ei-button-dusk w-full py-3 rounded-xl font-semibold text-sm"
          >
            {isEn ? 'Next →' : 'ถัดไป →'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/assessment-chat.tsx app/onboard/components/chat-panel.tsx
git commit -m "feat(onboarding): add assessment chat phase and reusable chat panel"
```

---

## Task 11: Influence Phase

**Files:**
- Create: `app/onboard/phases/influence.tsx`

- [ ] **Implement influence multi-select**

```typescript
// app/onboard/phases/influence.tsx
'use client';

import { useState } from 'react';
import type { CollectedData, OnboardingStep, InfluenceSource } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

const OPTIONS: { value: InfluenceSource; en: string; th: string; emoji: string }[] = [
  { value: 'self', en: 'Myself', th: 'ตัวเอง', emoji: '🙋' },
  { value: 'parents', en: 'Parents', th: 'พ่อแม่', emoji: '👨‍👩‍👧' },
  { value: 'peers', en: 'Friends / Peers', th: 'เพื่อน', emoji: '👫' },
  { value: 'teachers', en: 'Teachers', th: 'ครู/อาจารย์', emoji: '👩‍🏫' },
  { value: 'social_media', en: 'Social media', th: 'โซเชียลมีเดีย', emoji: '📱' },
];

export function InfluencePhase({ data, advance }: Props) {
  const [selected, setSelected] = useState<InfluenceSource[]>(data.influencers || []);
  const lang = (data.language || 'en') as 'en' | 'th';
  const isEn = lang === 'en';

  const toggle = (val: InfluenceSource) => {
    setSelected(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {isEn ? 'Who influences how you think about your future?' : 'ใครมีอิทธิพลต่อความคิดเรื่องอนาคตของคุณ?'}
        </h2>
        <p className="text-white/50 text-sm mt-1">
          {isEn ? 'Select all that apply' : 'เลือกได้หลายข้อ'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`ei-card flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
              selected.includes(opt.value)
                ? 'border-violet-400 bg-violet-400/10'
                : 'border-white/10 bg-white/5 hover:border-white/30'
            }`}
          >
            <span className="text-xl">{opt.emoji}</span>
            <span className="text-sm font-medium">{isEn ? opt.en : opt.th}</span>
            {selected.includes(opt.value) && (
              <span className="ml-auto text-violet-400">✓</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => advance('results', { influencers: selected })}
        className="ei-button-dusk w-full py-3 rounded-xl font-semibold text-sm"
      >
        {isEn ? 'Next →' : 'ถัดไป →'}
      </button>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/influence.tsx
git commit -m "feat(onboarding): add influence multi-select phase"
```

---

## Task 12: Results Phase

**Files:**
- Create: `app/onboard/phases/results.tsx`

- [ ] **Implement results card**

```typescript
// app/onboard/phases/results.tsx
'use client';

import type { CollectedData, OnboardingStep } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

function getDirectionCopy(data: CollectedData, isEn: boolean): string {
  if (data.interests?.length) {
    const list = data.interests.join(', ');
    return isEn ? `You're drawn to ${list}` : `คุณสนใจใน ${list}`;
  }
  return isEn
    ? "You're still exploring — that's a great place to start"
    : 'คุณยังสำรวจอยู่ — นั่นคือจุดเริ่มต้นที่ดี';
}

function getSituationCopy(data: CollectedData, isEn: boolean): string {
  if (isEn) {
    switch (data.user_type) {
      case 'lost': return "You have a lot of questions and not many answers yet — that's exactly what PassionSeed is built for";
      case 'explorer': return "You have a sense of direction but haven't locked in yet — let's find your signal";
      case 'planner': return "You know where you're headed — now let's build the path";
      case 'executor': return "You're already moving — let's make sure you're moving in the right direction";
      default: return "Figuring out where you stand is the first step — we'll help";
    }
  } else {
    switch (data.user_type) {
      case 'lost': return 'คุณมีคำถามมากมาย — PassionSeed สร้างมาเพื่อคุณโดยเฉพาะ';
      case 'explorer': return 'คุณมีทิศทางบ้างแล้วแต่ยังไม่แน่ใจ — มาหา signal ที่ใช่กัน';
      case 'planner': return 'คุณรู้ว่าอยากไปไหน — มาสร้างเส้นทางกัน';
      case 'executor': return 'คุณเดินหน้าอยู่แล้ว — มาให้แน่ใจว่าถูกทิศทาง';
      default: return 'การรู้ว่าตัวเองอยู่จุดไหนคือก้าวแรก — เราจะช่วย';
    }
  }
}

function getCircleCopy(data: CollectedData, isEn: boolean): string | null {
  if (!data.influencers?.length) return null;
  const hasExternal = data.influencers.some(i => ['parents', 'social_media'].includes(i));
  const selfOnly = data.influencers.length === 1 && data.influencers[0] === 'self';
  if (isEn) {
    if (selfOnly) return "You're figuring this out on your own — we'll give you real signals to work with";
    if (hasExternal) return "Your path may feel shaped by others — we'll help you find what's actually yours";
    return null;
  } else {
    if (selfOnly) return 'คุณหาคำตอบด้วยตัวเอง — เราจะให้ข้อมูลจริงๆ เพื่อช่วยคุณ';
    if (hasExternal) return 'เส้นทางของคุณอาจรู้สึกว่าถูกกำหนดโดยคนอื่น — เราจะช่วยให้คุณค้นพบสิ่งที่ใช่สำหรับตัวเอง';
    return null;
  }
}

export function ResultsPhase({ data, advance }: Props) {
  const isEn = (data.language || 'en') === 'en';
  const circleCopy = getCircleCopy(data, isEn);

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {isEn ? 'Here\'s what we know about you' : 'นี่คือสิ่งที่เรารู้เกี่ยวกับคุณ'}
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {/* Direction */}
        <div className="ei-card p-5 rounded-2xl border border-violet-400/20 bg-violet-500/5">
          <p className="text-xs text-violet-400 font-medium mb-2">
            {isEn ? 'YOUR DIRECTION' : 'ทิศทางของคุณ'}
          </p>
          <p className="text-white/90 text-sm leading-relaxed">{getDirectionCopy(data, isEn)}</p>
        </div>

        {/* Situation */}
        <div className="ei-card p-5 rounded-2xl border border-white/10 bg-white/5">
          <p className="text-xs text-white/40 font-medium mb-2">
            {isEn ? 'YOUR SITUATION' : 'สถานการณ์ของคุณ'}
          </p>
          <p className="text-white/90 text-sm leading-relaxed">{getSituationCopy(data, isEn)}</p>
        </div>

        {/* Circle — only if we have something useful to say */}
        {circleCopy && (
          <div className="ei-card p-5 rounded-2xl border border-white/10 bg-white/5">
            <p className="text-xs text-white/40 font-medium mb-2">
              {isEn ? 'YOUR CIRCLE' : 'คนรอบข้างคุณ'}
            </p>
            <p className="text-white/90 text-sm leading-relaxed">{circleCopy}</p>
          </div>
        )}
      </div>

      <button
        onClick={() => advance('account', {})}
        className="ei-button-dusk w-full py-3 rounded-xl font-semibold text-sm"
      >
        {isEn ? 'Save my profile →' : 'บันทึกโปรไฟล์ →'}
      </button>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/results.tsx
git commit -m "feat(onboarding): add results phase — personalized summary card"
```

---

## Task 13: Account Phase

**Files:**
- Create: `app/onboard/phases/account.tsx`

- [ ] **Implement account finish-up phase**

```typescript
// app/onboard/phases/account.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CollectedData, OnboardingStep } from '@/types/onboarding';

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  isAnonymous: boolean;
}

export function AccountPhase({ data, isAnonymous }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [education, setEducation] = useState<'high_school' | 'university' | 'unaffiliated'>('high_school');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEn = (data.language || 'en') === 'en';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body: Record<string, unknown> = {
      username,
      date_of_birth: dob,
      education_level: education,
      preferred_language: data.language || 'en',
      interests: data.interests || [],
      collected_data: data,
    };

    if (isAnonymous) {
      body.email = email;
      body.password = password;
    }

    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (res.status === 409) {
        setError(
          isEn
            ? 'Account already exists. Sign in instead.'
            : 'มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ'
        );
      } else {
        setError(json.error || (isEn ? 'Something went wrong.' : 'เกิดข้อผิดพลาด'));
      }
      return;
    }

    router.push('/me');
  };

  return (
    <div className="w-full max-w-md px-6 flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          {isEn ? 'Last step — save your progress' : 'ขั้นตอนสุดท้าย — บันทึกความคืบหน้า'}
        </h2>
        {isAnonymous && (
          <p className="text-white/50 text-sm mt-1">
            {isEn ? 'Create your account to save everything.' : 'สร้างบัญชีเพื่อบันทึกทุกอย่าง'}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isAnonymous && (
          <>
            <input
              required
              type="email"
              placeholder={isEn ? 'Email' : 'อีเมล'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
            />
            <input
              required
              type="password"
              placeholder={isEn ? 'Password (min 8 characters)' : 'รหัสผ่าน (อย่างน้อย 8 ตัว)'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
            />
          </>
        )}

        <input
          required
          placeholder={isEn ? 'Username' : 'ชื่อผู้ใช้'}
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
        />

        <input
          required
          type="date"
          value={dob}
          onChange={e => setDob(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400"
        />

        <div className="flex flex-col gap-2">
          <p className="text-xs text-white/40">{isEn ? 'Education level' : 'ระดับการศึกษา'}</p>
          <div className="flex gap-2">
            {(['high_school', 'university', 'unaffiliated'] as const).map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setEducation(level)}
                className={`flex-1 py-2 rounded-xl text-xs border transition-all ${
                  education === level
                    ? 'border-violet-400 bg-violet-400/10 text-white'
                    : 'border-white/10 text-white/50 hover:border-white/30'
                }`}
              >
                {isEn
                  ? { high_school: 'High School', university: 'University', unaffiliated: 'Other' }[level]
                  : { high_school: 'ม.ปลาย', university: 'มหาวิทยาลัย', unaffiliated: 'อื่นๆ' }[level]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="ei-button-dusk w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40 mt-2"
        >
          {loading
            ? (isEn ? 'Saving...' : 'กำลังบันทึก...')
            : (isEn ? 'Go to PassionSeed →' : 'ไปที่ PassionSeed →')}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/onboard/phases/account.tsx
git commit -m "feat(onboarding): add account phase — finish setup, anon upgrade, redirect to /me"
```

---

## Task 14: Update Home Gate Logic

**Files:**
- Modify: `app/page.tsx`

- [ ] **Read current file first**

```bash
cat app/page.tsx
```

- [ ] **Update gate logic**

In `app/page.tsx`, replace the existing redirect logic inside the `if (user && !isAnonymous)` block and add anon handling. The `no user` path (unauthenticated visitor) must **not** be changed — it falls through to `return <LandingPageWrapper />` as before.

```typescript
// After the isAnonymous check, before the existing profile check:

// Anonymous users → always go to /onboard (or /me if already done)
if (user && isAnonymous) {
  const { data: anonState } = await supabase
    .from('onboarding_state')
    .select('current_step')
    .eq('user_id', user.id)
    .maybeSingle();

  // Check profiles for is_onboarded
  const { data: anonProfile } = await supabase
    .from('profiles')
    .select('is_onboarded')
    .eq('id', user.id)
    .maybeSingle();

  if (anonProfile?.is_onboarded) {
    redirect('/me');
  }
  redirect('/onboard');
}

// Registered users
if (user && !isAnonymous) {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, username, date_of_birth, is_onboarded')
    .eq('id', user.id)
    .single();

  if (!profileData?.is_onboarded) {
    redirect('/onboard');
  }

  if (
    profileError ||
    !profileData?.full_name ||
    !profileData?.username ||
    !profileData?.date_of_birth
  ) {
    redirect('/auth/finish-profile');
  }

  redirect('/me');
}
```

- [ ] **Commit**

```bash
git add app/page.tsx
git commit -m "feat(onboarding): update home gate logic — route unboarded + anon users to /onboard"
```

---

## Task 15: Update Hero CTA

**Files:**
- Modify: `components/landing-hero.tsx`

- [ ] **Change CTA destination**

In `components/landing-hero.tsx`, in the `handleGuestAccess` function, change:

```typescript
router.push("/me/journey?action=direction-finder");
```

to:

```typescript
router.push("/onboard");
```

- [ ] **Smoke test**

```bash
pnpm dev
```

1. Open `http://localhost:3000`
2. Click hero CTA → should sign in anonymously and land on `/onboard`
3. Complete all phases → should redirect to `/me`
4. Sign out, sign up fresh → should redirect to `/onboard` after sign-up
5. Registered user with `is_onboarded = false` → visiting `/` should redirect to `/onboard`

- [ ] **Run tests**

```bash
pnpm test
```

Expected: all tests pass (at minimum the derivation tests from Task 2).

- [ ] **Commit**

```bash
git add components/landing-hero.tsx
git commit -m "feat(onboarding): update hero CTA to route to /onboard"
```

---

## Done

All phases implemented. The onboarding flow is live at `/onboard`. The old `/me/journey?action=direction-finder` path still exists for backwards compatibility but is no longer the primary CTA destination.
