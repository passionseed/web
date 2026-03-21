# Onboarding Flow — Design Spec
**Date:** 2026-03-20
**Route:** `/onboard`

---

## Problem

The current hero CTA sends users to `/me/journey?action=direction-finder`, a complex embedded flow inside the journey map. It has no dedicated URL, cannot be resumed, and does not collect the career intelligence PassionSeed needs to personalize the experience. Registered users who signed up without completing onboarding have no path back into the flow.

---

## Goal

A standalone `/onboard` route that:
1. Works for new users (anonymous and registered) and existing registered users who have not yet completed it
2. Collects three dimensions of career intelligence: interest, university plan/confidence, and decision influencers
3. Offers two UX modes: AI chat (conversational) and wizard (one question per screen)
4. Ends with a personalized results summary before completing account setup
5. Is resumable — users who drop off mid-flow return to exactly where they left off

---

## Flow

### Entry Points

| Trigger | Path |
|---------|------|
| Hero CTA | `signInAnonymously()` → `/onboard` |
| Post sign-up (OAuth or email) | Check `is_onboarded` → if false, redirect `/onboard` |
| Direct navigation | Logged-in user with `is_onboarded = false` lands on `/onboard` |

### Gate Logic (`app/page.tsx`)

```
no user                              →  show landing page
user (anonymous) + no onboard_state  →  redirect /onboard
user (anonymous) + is_onboarded      →  redirect /me
user (registered) + is_onboarded = false  →  redirect /onboard
user (registered) + is_onboarded = true + profile incomplete  →  redirect /auth/finish-profile (fallback edge case)
user (registered) + fully onboarded  →  redirect /me
```

Anonymous users who refresh `/` after sign-in are redirected to `/onboard` (not shown the landing page again), preventing duplicate anonymous sessions.

### Phases

| Step key | Name | Description |
|----------|------|-------------|
| `welcome` | Welcome | Name resolution (OAuth name or ask), mode selection |
| `interest` | Career Interest | Structured picker — always shown in both modes |
| `university` | Your Plan | University plan + confidence (chat or wizard) |
| `influence` | Your Circle | Decision influencers (chat or wizard) |
| `results` | Your Profile | Personalized summary card |
| `account` | Finish Setup | Username, DOB, education level + account upgrade for anon users |

On `account` completion: `is_onboarded = true`, `onboarded_at = now()` → redirect `/me`.

---

## Database

### Required Migration (new — before implementation)

The existing `onboarding_state.current_step` CHECK constraint uses old step keys (`profile`, `chat`, `interests`, `careers`, `settings`). A new migration must drop and replace it:

```sql
-- migration: 2026-03-20-fix-onboarding-step-keys.sql
ALTER TABLE public.onboarding_state
  DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check;

ALTER TABLE public.onboarding_state
  ADD CONSTRAINT onboarding_state_current_step_check
  CHECK (current_step IN ('welcome','interest','university','influence','results','account'));
```

### Existing tables used (migration `20260227000002_onboarding_schema.sql`)

| Table | Usage |
|-------|-------|
| `profiles.is_onboarded` | Boolean gate, set `true` on `account` step completion |
| `profiles.onboarded_at` | Timestamp set on completion |
| `onboarding_state` | Resumable state: `current_step` + `collected_data` (JSON) + `chat_history` (JSON) |
| `career_goals` | One row per selected interest, `source`: `user_typed` or `ai_suggested` |

### Influence data storage

`user_interests` schema (`category_name`, `statements[]`, `selected[]`) does not map cleanly to free-form influence data. Influence data is stored in `onboarding_state.collected_data` only (no separate table write). The `career_goals` and `user_interests` tables are not used for influence data.

### `collected_data` JSON shape

```json
{
  "name": "Mia",
  "mode": "chat",
  "interests": ["Computer Science", "UX Design"],
  "university_plan": "I want to apply to Chula but not sure which faculty",
  "confidence": 2,
  "confidence_reason": "My grades are okay but I don't know what I want",
  "influencers": ["parents", "social_media"],
  "influencer_text": "My parents want me to do engineering"
}
```

---

## API Routes

### Supabase client strategy

All three API routes use the **service-role Supabase client** (not the anon-key client). This ensures writes succeed for anonymous users regardless of RLS policy gaps on `profiles`. The routes validate `auth.getUser()` to confirm the caller is authenticated (anon or registered) before proceeding.

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/onboarding/state` | POST | Upsert `current_step` + `collected_data` |
| `POST /api/onboarding/chat` | POST | Streams AI response for chat mode |
| `POST /api/onboarding/complete` | POST | Saves `career_goals`, sets `is_onboarded = true` |

### Response contracts

**`POST /api/onboarding/state`**
- Body: `{ step: string, collected_data: object }`
- Success: `200 { ok: true }`
- Error: `401` (not authenticated), `400` (invalid step key), `500` (db error)

**`POST /api/onboarding/chat`**
- Body: `{ phase: 'university' | 'influence', messages: Message[], collected_data: object }`
- Success: streaming `text/event-stream`
- On stream error: emit `{ error: true, message: string }` as final event; client shows "Something went wrong — try again" with a retry button
- After stream completes, server upserts extracted fields into `collected_data` via a second call to `onboarding/state`

**`POST /api/onboarding/complete`**
- Body: `{ username: string, date_of_birth: string, education_level: string }`
- For anonymous users: also requires `{ email: string, password: string }` — calls `supabase.auth.updateUser({ email, password })` to upgrade the anon session before saving profile
- Success: `200 { ok: true }` — client redirects to `/me`
- Error: `409` (email already exists — show "Account already exists, sign in instead"), `422` (validation error), `500`

### AI Chat Strategy (`/api/onboarding/chat`)

- System prompt is phase-aware (`university` vs `influence`)
- **`university` phase:** extract `university_plan` (string), `confidence` (1–5 int), `confidence_reason` (string)
- **`influence` phase:** extract `influencers` (array from: `parents`, `friends`, `teachers`, `social_media`, `self`, `partner`, `no_one`) + `influencer_text` (free text)
- After each AI response, a server-side extraction pass updates `collected_data`
- If extraction cannot determine `confidence` (ambiguous answer), AI asks a clarifying question: *"On a scale of 1 to 5, how confident do you feel — 1 being very unsure, 5 being very clear?"*
- The "Next" button in chat mode unlocks only when minimum required fields are present: `university` phase requires `university_plan` + `confidence`; `influence` phase requires at least one `influencer` or non-empty `influencer_text`

---

## UI/UX Design

### Shell

- Full-screen, **Dusk theme** (`#1a0a2e` → `#2d1449` atmospheric gradient)
- Fixed top bar: PassionSeed logo (left), step progress dots (center), exit link (right — exits to `/me` with partial data)
- No navigation. Pure focus.
- Uses existing `.ei-card` and `.ei-button-dusk` CSS classes from `app/globals.css`
- Glow animations follow design system: animate `clip-path + opacity + filter` together
- Mobile: `IntersectionObserver` + `@media (hover: none)` for touch devices
- No middleware required — `/onboard/page.tsx` is a server component that checks auth and redirects unauthenticated users to `/login`

### `welcome` — Name + Mode Selection

- If OAuth display name available: greeting pre-filled — *"Hey [Name], let's figure out what excites you."*
- If no name: single first-name input, then greeting
- Two large mode cards:
  - **"Chat with me"** — AI avatar, subtitle: *"Talk naturally, I'll ask you questions"*
  - **"Answer questions"** — checklist icon, subtitle: *"Prefer structured? Go step by step"*
- Selected mode stored in `onboarding_state.collected_data.mode`

### `interest` — Career/Major/Program Picker

Same UI in both modes (structured always wins for browsing).

- Search input with autocomplete (CS, Medicine, Architecture, etc.)
- Tag-cloud interest clusters: Technology, Design, Business, Arts, Sciences, Law, Education
- Tapping a cluster reveals specific program/major chips
- Free-type field for anything outside the list
- Select 1–3 items, then "Next"

### `university` — Plan + Confidence

**Wizard mode:**
- Sub-screen 1: textarea — *"What's your plan to get into university or a program that will make you happy?"*
- Sub-screen 2: visual confidence dial (1–5, illustrated from confused to confident) + follow-up: *"What makes you feel that way?"*

**Chat mode:**
- AI opens: *"Now tell me — do you have a plan for getting into a university or program that'll make you happy?"*
- Interest chips from previous step shown as context at top of chat
- AI extracts `university_plan`, `confidence` (1–5), `confidence_reason`
- "Next" unlocks when `university_plan` + `confidence` are both extracted

### `influence` — Your Circle

**Wizard mode:**
- Multi-select chips: Parents, Friends, Teachers, Social media, Self-directed, Partner, No one really
- Open text: *"Anything you want to add?"*

**Chat mode:**
- AI asks: *"Who do you usually talk to when thinking about your future — or does this feel like something you figure out alone?"*
- AI extracts `influencers` array + `influencer_text`
- "Next" unlocks when at least one influencer is identified or `influencer_text` is non-empty

### `results` — Your Profile Card

Full-screen reveal with Dusk glow animation. Three blocks with tone that adapts to collected data:

**Your direction**
- Has interests → *"You're drawn to [interest(s)]"*
- Missing (skipped) → *"You're still exploring — that's a great place to start"*

**Your confidence**
- `confidence` 1–2 → *"You have some ideas but aren't sure yet — that's exactly what PassionSeed is for"*
- `confidence` 3 → *"You're on your way — let's sharpen your direction"*
- `confidence` 4–5 → *"You have a clear direction — let's make it real"*
- Missing → *"Figuring out where you stand is the first step — we'll help"*

**Your circle**
- Parents or social_media in `influencers` → *"Your path may feel shaped by others — we'll help you find what's actually yours"*
- Self-directed → *"You're figuring this out on your own — we'll give you real signals to work with"*
- No one / missing → *"Not everyone has a support system — PassionSeed can be yours"*

CTA: **"Save my profile"** → advances to `account`

### `account` — Finish Setup

**For registered users (OAuth or email sign-up):**
- Fields: username (unique check), date of birth, education level
- Pre-fill username from OAuth display name if available
- Subtitle: *"Last step — this saves your progress."*

**For anonymous users:**
- Additional fields: email + password (to upgrade the anonymous session)
- Subtitle: *"Create your account to save everything."*
- On submit: call `supabase.auth.updateUser({ email, password })` to convert anon session, then save profile
- If email already exists: inline error — *"You already have an account. [Sign in instead →]"*

**Field coverage from deprecated `finish-profile`:**

| Field | Where handled |
|-------|---------------|
| `full_name` | `welcome` step (from OAuth or first-name input) |
| `username` | `account` step |
| `date_of_birth` | `account` step |
| `education_level` | `account` step |
| `preferred_language` | **Deferred** — not collected in onboarding; defaults to `'en'`, user can change in profile settings later |
| `skills` (interests table) | **Deferred** — not collected in onboarding; can be added in `/profile` settings post-onboarding |

---

## File Structure

```
app/
  onboard/
    page.tsx                     # Server component: auth check, loads onboarding_state, renders client wrapper
    onboard-client.tsx           # Client component: phase state machine, renders active phase
    phases/
      welcome.tsx
      interest.tsx
      university-wizard.tsx
      university-chat.tsx
      influence-wizard.tsx
      influence-chat.tsx
      results.tsx
      account.tsx
    components/
      progress-dots.tsx
      mode-card.tsx
      interest-picker.tsx
      confidence-dial.tsx
      chat-panel.tsx             # Shared chat UI for university + influence chat modes
      results-card.tsx

app/api/onboarding/
  state/route.ts
  chat/route.ts
  complete/route.ts

supabase/migrations/
  2026-03-20-fix-onboarding-step-keys.sql   # Required before implementation
```

---

## Changes to Existing Files

| File | Change |
|------|--------|
| `components/landing-hero.tsx` | `router.push("/me/journey?action=direction-finder")` → `router.push("/onboard")` |
| `app/page.tsx` | Expand gate logic to handle anonymous users + `is_onboarded` check |
| `app/auth/finish-profile/page.tsx` | Keep as fallback for edge cases; no longer the primary post-signup destination |

---

## Out of Scope

- Analytics/tracking events (future iteration)
- A/B testing chat vs wizard default
- Admin view of onboarding completion rates
- Adding middleware for session refresh (pre-existing gap, not introduced by this feature)
