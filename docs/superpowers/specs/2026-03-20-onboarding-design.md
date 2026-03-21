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
2. Collects career intelligence across four dimensions: interest, situation assessment, decision influencers, and account setup
3. Offers two UX modes: AI chat (conversational) and wizard (one question per screen)
4. Ends with a personalized results summary that computes user type and next action
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
no user                                          →  show landing page
user (anonymous) + no onboard_state             →  redirect /onboard
user (anonymous) + is_onboarded = true          →  redirect /me
user (registered) + is_onboarded = false        →  redirect /onboard
user (registered) + is_onboarded = true
  + profile incomplete                          →  redirect /auth/finish-profile (fallback edge case)
user (registered) + fully onboarded             →  redirect /me
```

Anonymous users who refresh `/` after sign-in are redirected to `/onboard`, preventing duplicate anonymous sessions.

### Phases

| Step key | Name | Description |
|----------|------|-------------|
| `welcome` | Welcome | Language toggle, name resolution, mode selection |
| `interest` | Career Interest | Structured picker — always shown in both modes |
| `assessment` | Your Situation | 6 signal fields extracted via chat or wizard |
| `influence` | Your Circle | Multi-select influencer chips (one question) |
| `results` | Your Profile | Computed user type + next action displayed as summary |
| `account` | Finish Setup | Username, DOB, education level + account upgrade for anon users |

On `account` completion: `is_onboarded = true`, `onboarded_at = now()` → redirect `/me`.

---

## Extraction Fields & Computed Outputs

### 6 Signal Fields (collected in `assessment` phase)

| Field | Type | Values | Drives |
|-------|------|--------|--------|
| `stage` | enum | `exploring` / `choosing` / `applying_soon` / `urgent` | Content depth, action timing, sales timing |
| `target_clarity` | enum | `none` / `field_only` / `specific` | Exploration vs execution flow |
| `primary_blocker` | enum | `dont_know` / `low_profile` / `financial` / `family_pressure` / `application_process` | Messaging angle, product entry point |
| `confidence` | enum | `low` / `medium` / `high` | Tone, guidance aggressiveness |
| `career_direction` | enum | `no_idea` / `some_ideas` / `clear_goal` | Anchor on career→program mapping vs keep exploratory |
| `commitment_signal` | enum | `browsing` / `researching` / `preparing` | Lead quality, routing to human/upsell |

**Deliberately excluded from onboarding:**
- Budget → ask later when showing program options
- GPA/test scores → only when user reaches application stage
- Parents pressure → captured via `influence` multi-select instead

### 1 Influence Field (collected in `influence` phase)

| Field | Type | Values |
|-------|------|--------|
| `influencers` | string[] | `["self", "parents", "peers", "teachers", "social_media"]` — multi-select, any combination |

### Computed Outputs (derived server-side from the 6 fields + influencers)

| Output | Type | Values | Usage |
|--------|------|--------|-------|
| `user_type` | enum | `lost` / `explorer` / `planner` / `executor` | Results card framing, dashboard personalization |
| `next_action` | enum | `educate` / `narrow` / `execute` / `escalate` | Product entry point after onboarding |
| `conversion_priority` | enum | `low` / `medium` / `high` | CRM/sales routing |

**User type derivation:**
- `lost` → low/none target clarity + low confidence
- `explorer` → no target + some career direction
- `planner` → specific target + not yet acting
- `executor` → applying_soon or urgent + preparing/researching

**Next action derivation:**
- `educate` → lost or explorer
- `narrow` → planner with field_only clarity
- `execute` → specific target + applying soon
- `escalate` → urgent stage or preparing commitment

---

## `collected_data` JSON shape

```json
{
  "language": "th",
  "name": "Mia",
  "mode": "chat",
  "interests": ["Computer Science", "UX Design"],
  "stage": "choosing",
  "target_clarity": "field_only",
  "primary_blocker": "dont_know",
  "confidence": "low",
  "career_direction": "some_ideas",
  "commitment_signal": "researching",
  "influencers": ["parents", "social_media"],
  "user_type": "explorer",
  "next_action": "narrow",
  "conversion_priority": "medium"
}
```

---

## Database

### Required Migration (before implementation)

The existing `onboarding_state.current_step` CHECK constraint uses old step keys. Replace it:

```sql
-- migration: 2026-03-20-fix-onboarding-step-keys.sql
ALTER TABLE public.onboarding_state
  DROP CONSTRAINT IF EXISTS onboarding_state_current_step_check;

ALTER TABLE public.onboarding_state
  ADD CONSTRAINT onboarding_state_current_step_check
  CHECK (current_step IN ('welcome','interest','assessment','influence','results','account'));
```

### Tables used

| Table | Usage |
|-------|-------|
| `profiles.is_onboarded` | Boolean gate, set `true` on `account` step completion |
| `profiles.onboarded_at` | Timestamp set on completion |
| `onboarding_state` | Resumable state: `current_step` + `collected_data` (JSON) + `chat_history` (JSON) |
| `career_goals` | One row per selected interest, `source`: `user_typed` or `ai_suggested` |

Influence data lives in `onboarding_state.collected_data` only — `user_interests` table not used for this.

---

## API Routes

### Supabase client strategy

All three API routes use the **service-role Supabase client**. Routes validate `auth.getUser()` before proceeding to confirm the caller is authenticated (anon or registered).

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/onboarding/state` | POST | Upsert `current_step` + `collected_data` |
| `POST /api/onboarding/chat` | POST | Streams AI response for chat mode |
| `POST /api/onboarding/complete` | POST | Saves `career_goals`, sets `is_onboarded = true` |

### Response contracts

**`POST /api/onboarding/state`**
- Body: `{ step: string, collected_data: object }`
- Success: `200 { ok: true }`
- Error: `401` (not authenticated), `400` (invalid step key), `500`

**`POST /api/onboarding/chat`**
- Body: `{ phase: 'assessment', messages: Message[], collected_data: object }`
- Success: streaming `text/event-stream`
- On stream error: emit `{ error: true, message: string }` as final event; client shows retry button
- After stream completes: server upserts extracted fields into `collected_data` via `onboarding/state`

**`POST /api/onboarding/complete`**
- Body: `{ username: string, date_of_birth: string, education_level: string }`
- Anon users also provide: `{ email: string, password: string }` — calls `supabase.auth.updateUser({ email, password })`
- Success: `200 { ok: true }` → client redirects `/me`
- Errors: `409` (email exists → "Account already exists, [sign in instead →]"), `422` (validation), `500`

### AI Chat Strategy (`/api/onboarding/chat`)

The `assessment` phase is the only chat-extracted phase. System prompt instructs the AI to:
1. Have a natural conversation to extract all 6 signal fields
2. Ask follow-ups if a field cannot be inferred from context
3. Never ask for all 6 as a list — weave them into 2–4 conversational turns
4. After each AI response, run a server-side extraction pass to map natural language → enum values and update `collected_data`

**Extraction unlock condition:** The "Next" button unlocks only when all 6 fields are present in `collected_data`. If extraction stalls on `confidence`, AI prompts: *"On a scale of low/medium/high, how sure do you feel about your direction right now?"*

---

## UI/UX Design

### Shell

- Full-screen, **Dusk theme** (`#1a0a2e` → `#2d1449` atmospheric gradient)
- Fixed top bar: PassionSeed logo (left), step progress dots (center), exit link (right — saves partial data, goes to `/me`)
- No navigation. Pure focus.
- Uses existing `.ei-card` and `.ei-button-dusk` CSS classes
- Glow animations: `clip-path + opacity + filter` together per design system
- Mobile: `IntersectionObserver` + `@media (hover: none)`
- `/onboard/page.tsx` is a server component that redirects unauthenticated users to `/login`

### `welcome` — Language + Name + Mode

- **Top-right of screen:** EN / TH language toggle — sets `collected_data.language` and re-renders the whole page in chosen language immediately
- If OAuth display name available: *"Hey [Name], let's figure out what excites you."*
- If no name: first-name input, then greeting
- Two large mode cards: **"Chat with me"** (AI avatar) and **"Answer questions"** (checklist icon)

### `interest` — Career/Major/Program Picker

Same UI in both modes.

- Search input with autocomplete
- Tag-cloud clusters: Technology, Design, Business, Arts, Sciences, Law, Education
- Tapping cluster reveals specific program/major chips
- Free-type field for unlisted items
- Select 1–3 items → "Next"

### `assessment` — Your Situation

**Wizard mode (6 screens, one field per screen):**

| Screen | Question | Input |
|--------|----------|-------|
| 1 | *"Where are you in your journey right now?"* | 4 cards: Exploring / Choosing / Applying soon / Urgent |
| 2 | *"How clear is your target?"* | 3 cards: No idea yet / I know the field / I have a specific school and program |
| 3 | *"What's holding you back the most?"* | 5 chips (forced single): Don't know what to choose / Not confident in my profile / Financial concern / Family pressure / Confused about applications |
| 4 | *"How confident do you feel about your direction?"* | 3 cards with illustration: Low / Medium / High |
| 5 | *"How clear is your career goal?"* | 3 cards: No idea / Some ideas / Clear goal |
| 6 | *"What are you doing about it right now?"* | 3 cards: Just browsing / Actively researching / Already preparing |

**Chat mode:**
- AI has full context of selected interests and weaves all 6 fields into 2–4 conversational turns
- "Next" unlocks only when all 6 fields are extracted into `collected_data`
- Fallback prompt if extraction stalls on any field

### `influence` — Your Circle

Same in both modes — always wizard (one question is too short for a chat).

- Prompt: *"Who influences how you think about your future?"*
- Multi-select chips: Myself, Parents, Friends / Peers, Teachers, Social media
- No minimum required — user can skip by clicking "Next" (stores empty array)

### `results` — Your Profile Card

Full-screen reveal with Dusk glow animation. Three blocks:

**Your direction** — from `interests` + `career_direction`
- Has interests → *"You're drawn to [X]"*
- Missing → *"You're still exploring — that's a great place to start"*

**Your situation** — from `user_type`
- `lost` → *"You have a lot of questions and not many answers yet — that's exactly what PassionSeed is built for"*
- `explorer` → *"You have a sense of direction but haven't locked in yet — let's find your signal"*
- `planner` → *"You know where you're headed — now let's build the path"*
- `executor` → *"You're already moving — let's make sure you're moving in the right direction"*

**Your circle** — from `influencers` (only shown if non-empty)
- Includes `parents` or `social_media` → *"Your path may feel shaped by others — we'll help you find what's actually yours"*
- `self` only → *"You're figuring this out on your own — we'll give you real signals to work with"*

CTA: **"Save my profile"** → advances to `account`

### `account` — Finish Setup

**Registered users:** username, date of birth, education level
**Anonymous users:** same + email + password to upgrade session

Field coverage from deprecated `finish-profile`:

| Field | Where handled |
|-------|---------------|
| `full_name` | `welcome` step (OAuth or first-name input) |
| `username` | `account` step |
| `date_of_birth` | `account` step |
| `education_level` | `account` step |
| `preferred_language` | `welcome` step (language toggle → `collected_data.language` → saved to `profiles` on complete) |
| `skills` | Deferred — settable in `/profile` settings post-onboarding |

---

## File Structure

```
app/
  onboard/
    page.tsx                       # Server component: auth check, loads onboarding_state
    onboard-client.tsx             # Client: phase state machine
    phases/
      welcome.tsx
      interest.tsx
      assessment-wizard.tsx
      assessment-chat.tsx
      influence.tsx                # Always wizard — same in both modes
      results.tsx
      account.tsx
    components/
      progress-dots.tsx
      mode-card.tsx
      interest-picker.tsx
      assessment-card.tsx          # Reusable card for wizard single-choice screens
      chat-panel.tsx               # Shared streaming chat UI
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
| `app/page.tsx` | Expand gate logic for anonymous users + `is_onboarded` check |
| `app/auth/finish-profile/page.tsx` | Keep as fallback for edge cases; not primary destination for new users |

---

## Out of Scope

- Analytics/tracking events (future iteration)
- A/B testing chat vs wizard default
- Admin view of onboarding completion rates
- Middleware for session refresh (pre-existing gap, not introduced by this feature)
- Budget collection
- GPA/test score collection
