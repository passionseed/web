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
user exists + is_onboarded = false  →  redirect /onboard
user exists + is_onboarded = true + profile incomplete  →  redirect /auth/finish-profile (fallback)
user exists + fully onboarded  →  redirect /me
```

### Phases

| Step key | Name | Description |
|----------|------|-------------|
| `welcome` | Welcome | Name resolution (OAuth name or ask), mode selection |
| `interest` | Career Interest | Structured picker — always shown in both modes |
| `university` | Your Plan | University plan + confidence (chat or wizard) |
| `influence` | Your Circle | Decision influencers (chat or wizard) |
| `results` | Your Profile | Personalized summary card |
| `account` | Finish Setup | Username, DOB, education level (replaces `finish-profile`) |

On `account` completion: `is_onboarded = true`, `onboarded_at = now()` → redirect `/me`.

---

## UI/UX Design

### Shell

- Full-screen, **Dusk theme** (`#1a0a2e` → `#2d1449` atmospheric gradient)
- Fixed top bar: PassionSeed logo (left), step progress dots (center), skip/exit link (right)
- No navigation. Pure focus.
- Uses existing `.ei-card` and `.ei-button-dusk` CSS classes from `app/globals.css`
- Glow animations follow design system: animate `clip-path + opacity + filter` together
- Mobile: `IntersectionObserver` + `@media (hover: none)` for touch devices

### `welcome` — Name + Mode Selection

- If OAuth display name available: greeting pre-filled — *"Hey [Name], let's figure out what excites you."*
- If no name: single first-name input, then greeting
- Two large mode cards:
  - **"Chat with me"** — AI avatar, subtitle: *"Talk naturally, I'll ask you questions"*
  - **"Answer questions"** — checklist icon, subtitle: *"Prefer structured? Go step by step"*
- Selected mode is stored in `onboarding_state.collected_data.mode`

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
- AI asks follow-ups, extracts `university_plan`, `confidence` (1–5), `confidence_reason`
- Server-side extraction pass runs after each AI message to populate `collected_data`

### `influence` — Your Circle

**Wizard mode:**
- Multi-select chips: Parents, Friends, Teachers, Social media, Self-directed, Partner, No one really
- Open text: *"Anything you want to add?"*

**Chat mode:**
- AI asks: *"Who do you usually talk to when thinking about your future — or does this feel like something you figure out alone?"*
- AI extracts `influencers` (array) + `influencer_text` (free text)

### `results` — Your Profile Card

- Full-screen reveal with Dusk glow animation
- Three blocks, tone adapts to collected data:
  - **Your direction** — *"You're drawn to [interest(s)]"*
  - **Your confidence** — adapts: low confidence → *"You have some ideas but aren't sure yet — that's exactly what PassionSeed is for"*; high → *"You have a clear direction — let's sharpen it"*
  - **Your circle** — parents/social influence → *"Your path may feel shaped by others — we'll help you find what's actually yours"*; self-directed → *"You're figuring this out on your own — we'll give you real signals to work with"*
- CTA: **"Save my profile"** → advances to `account`

### `account` — Finish Setup

- Three fields: username (unique check), date of birth, education level
- Pre-fills where possible
- Subtitle: *"Last step — this saves your progress."*
- On submit → `is_onboarded = true` → redirect `/me`
- Replaces `finish-profile` for all new users going forward

---

## Data Design

### Existing tables used (migration `20260227000002_onboarding_schema.sql`)

| Table | Usage |
|-------|-------|
| `profiles.is_onboarded` | Boolean gate, set `true` on `account` step completion |
| `profiles.onboarded_at` | Timestamp set on completion |
| `onboarding_state` | Resumable state: `current_step` + `collected_data` (JSON) + `chat_history` (JSON) |
| `career_goals` | One row per selected interest, `source`: `user_typed` or `ai_suggested` |
| `user_interests` | Influence data stored here (`category: 'influence'`) |

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

| Route | Method | Purpose |
|-------|--------|---------|
| `POST /api/onboarding/state` | POST | Upsert `current_step` + `collected_data` (called on each "Next") |
| `POST /api/onboarding/chat` | POST | Streams AI response for chat mode (Anthropic SDK, phase-aware system prompt) |
| `POST /api/onboarding/complete` | POST | Saves `career_goals`, `user_interests`, sets `is_onboarded = true` |

### AI Chat Strategy (`/api/onboarding/chat`)

- System prompt is phase-aware (`university` vs `influence`)
- **`university` phase:** extract `university_plan` (string), `confidence` (1–5 int), `confidence_reason` (string)
- **`influence` phase:** extract `influencers` (array from known set) + `influencer_text` (free text)
- After each AI response, a lightweight server-side extraction pass updates `collected_data`
- The extraction is invisible to the user — the chat feels natural

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
```

---

## Changes to Existing Files

| File | Change |
|------|--------|
| `components/landing-hero.tsx` | `router.push("/me/journey?action=direction-finder")` → `router.push("/onboard")` |
| `app/page.tsx` | Add `is_onboarded = false` check before the existing `redirect("/me")` |
| `app/auth/finish-profile/page.tsx` | Add note: deprecated for new users; keep as fallback for edge cases |
| `middleware.ts` | No changes needed |

---

## Out of Scope

- Analytics/tracking events (future iteration)
- A/B testing chat vs wizard default
- Skipping individual questions (skip button exits to `/me` with partial data)
- Admin view of onboarding completion rates
