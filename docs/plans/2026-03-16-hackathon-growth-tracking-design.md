# Hackathon Growth Tracking & Parent Report

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Month-long hackathon program (AI building + venture building)

---

## Problem

349 students have registered for the PassionSeed hackathon — a month-long program covering AI building and venture building. Students arrive with varying levels of career clarity, confidence, and self-awareness. Right now, there is no mechanism to capture where they start, track how they grow session-by-session, or show that growth to their parents in a way that justifies the program's value.

Parents in Thailand are the primary decision-makers. Anxiety about their child's future is high. A concrete, personalised growth report — delivered as a shareable web page — directly addresses that anxiety and creates a natural paid tier.

---

## Goals

1. Capture each student's baseline across 5 growth dimensions before the program starts.
2. Collect a short reflection after every session (target: 90 seconds to complete).
3. Visualise growth as a before/after comparison and a session-by-session timeline.
4. Deliver a parent-facing report at a shareable URL, gated behind a one-time payment.

---

## Growth Dimensions Tracked

| Dimension | How Measured | Why |
|---|---|---|
| Career clarity | Slider 1–10 | Core product promise |
| Skills confidence | Slider 1–10 | Measurable before/after AI + venture building |
| Self-awareness | Slider 1–10 | Ikigai alignment signal |
| Future planning | Slider 1–10 | Reduces parent anxiety |
| Adaptability | Slider 1–10 | Programme-specific outcome |

Qualitative: open text on career interest, biggest worry (pre-survey) and per-session learning + struggle (reflections).

---

## Architecture

### New Database Tables

```sql
-- Baseline survey (one per participant, submitted before Day 1)
hackathon_pre_surveys (
  id UUID PK,
  participant_id UUID FK → hackathon_participants,
  submitted_at TIMESTAMPTZ,
  career_clarity_score     INT CHECK (1–10),
  skills_confidence_score  INT CHECK (1–10),
  self_awareness_score     INT CHECK (1–10),
  future_clarity_score     INT CHECK (1–10),
  adaptability_score       INT CHECK (1–10),
  career_interest_text     TEXT,
  biggest_worry_text       TEXT
)

-- Admin-defined sessions (each class/day in the programme)
hackathon_sessions (
  id UUID PK,
  title TEXT,
  session_number INT,
  happens_at TIMESTAMPTZ,
  reflection_unlocked_at TIMESTAMPTZ  -- set by admin to open reflection window
)

-- Per-session reflections (one per participant per session)
hackathon_reflections (
  id UUID PK,
  participant_id UUID FK → hackathon_participants,
  session_id UUID FK → hackathon_sessions,
  submitted_at TIMESTAMPTZ,
  energy_score      INT CHECK (1–10),
  confidence_score  INT CHECK (1–10),
  clarity_score     INT CHECK (1–10),
  learning_text     TEXT,
  struggle_text     TEXT,
  UNIQUE (participant_id, session_id)  -- one reflection per session
)

-- Parent reports (token-gated, payment-unlocked)
hackathon_parent_reports (
  id UUID PK,
  participant_id UUID FK → hackathon_participants,
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_at TIMESTAMPTZ,            -- NULL = not paid; set on payment
  project_title TEXT,
  project_url TEXT
)
```

### Data Flow

```
Admin marks session complete (sets reflection_unlocked_at)
        │
        ▼
Student sees "Reflect on Session 3" card in dashboard
        │
        ▼
Student submits hackathon_reflections row
        │
        ▼
Dashboard growth chart updates in real time

At programme end:
Admin generates parent report → hackathon_parent_reports row created
Parent receives link via LINE/email → /hackathon/report/[token]
Parent pays → unlocked_at set → full timeline unlocked
```

---

## UI Surfaces

### 1. Pre-Survey `/hackathon/survey`

- 5 sliders (career clarity, skills confidence, self-awareness, future clarity, adaptability), each 1–10
- 2 open text fields: "What career interests you most right now?" and "What worries you most about your future?"
- Submit once, locked permanently after. Shown as a required step before accessing the hackathon dashboard.
- Dawn theme (student-facing).

### 2. Session Reflection `/hackathon/reflect/[sessionId]`

- Appears as a card in the student dashboard when `reflection_unlocked_at` is set by admin
- 3 sliders: energy, confidence, clarity (1–10)
- 2 optional text fields: "What did you discover about yourself?" and "What was hard?"
- Target completion time: 90 seconds
- Submitted reflections show a completion checkmark on the dashboard session list

### 3. Growth Dashboard (extends existing `/hackathon/dashboard`)

- Line chart showing all 3 scores (energy, confidence, clarity) across all completed sessions
- Before/after comparison for pre-survey vs most recent session
- Progress indicator: "7 of 12 sessions completed"

### 4. Parent Report `/hackathon/report/[token]`

**Free tier (always visible):**
- Student name and programme name
- Before/After table: 5 dimensions, score then vs now, delta
- Project title + link
- 2 selected quotes from reflections (most positive learning_text entries)
- 1–2 sentence AI-generated summary: "what this student is becoming"

**Paid tier (unlocked on payment):**
- Full session-by-session timeline with all scores and quotes
- Adaptability narrative: sessions where scores dipped then recovered

---

## Admin Controls (required for operation)

An admin panel extension (extends `/admin`) needs:
- Create/edit hackathon sessions (title, date, number)
- Toggle reflection window open/closed per session
- See completion rate per session (who has/hasn't reflected)
- Generate parent report token for a participant
- Mark report as unlocked (after payment confirmed)

---

## Payment Flow

Scope: manual for the first cohort. Admin marks `unlocked_at` after confirming payment via PromptPay/bank transfer. No Stripe/payment gateway required for Month 1. Add automated payment in Phase 2 once price point is validated.

---

## What Is Explicitly Out of Scope

- Automated payment gateway (Phase 2)
- PDF generation (web report is the format)
- Multi-language report (Thai first)
- Email/LINE push for reflection reminders (Phase 2 — do manually for Month 1)
- Certificate/credential issuance (separate design)
- Parent account creation (link only, no login required)

---

## Success Criteria

| Metric | Target |
|---|---|
| Pre-survey completion rate | ≥ 80% of registered participants |
| Per-session reflection completion | ≥ 60% per session |
| Parent reports generated | 100% of completers |
| Parent reports unlocked (paid) | ≥ 20% of generated reports |

---

## Open Questions (resolve before build)

1. **Price point:** What do parents pay for the full report? Suggested: ฿199–฿490.
2. **AI summary:** Use existing AI infrastructure in the codebase, or write a deterministic template for Month 1?
3. **Mobile app:** Is the mobile app a React Native / Expo app sharing the same Supabase, or a separate codebase? This affects where the survey/reflection UI lives.
