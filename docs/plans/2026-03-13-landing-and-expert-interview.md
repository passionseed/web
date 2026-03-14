# Landing Page & Expert Interview System - Implementation Plan

**Date**: 2026-03-13
**Status**: In Progress

---

## Overview

Redesign the landing page to clearly communicate PassionSeed's promise and build an expert interview system to create career PathLabs from professional contributions.

---

## Progress

### Phase 1: Landing Page Redesign ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Rewrite hero with problem statement | ✅ Done | `components/landing-hero.tsx` |
| Rewrite features as "How It Works" | ✅ Done | `components/landing-features.tsx` |
| Create expert CTA section | ✅ Done | `components/landing-expert-cta.tsx` |
| Rewrite parents section | ✅ Done | `components/landing-parents.tsx` |
| Remove fake data sections | ✅ Done | LearningMapsPreview, TCASPreview, etc. removed |
| Add browser locale detection | ✅ Done | `lib/i18n/language-context.tsx` |
| Update page structure | ✅ Done | `app/page.tsx`, `landing-page-wrapper.tsx` |

---

## Remaining Work

### Phase 2: Expert Interview System

**Plan Document**: `docs/plans/2026-03-13-expert-interview-system.md`

#### 2.1 Database Migration ✅

- [x] `supabase/migrations/20260313100000_create_expert_interview_tables.sql`
  - `expert_profiles`, `expert_pathlabs`, `expert_interview_rate_limits`, `mentor_sessions`
  - RLS policies, triggers, indexes

#### 2.2 Type Definitions ✅

- [x] `types/expert-interview.ts`

#### 2.3 API Routes ✅

- [x] `app/api/expert-interview/session/route.ts` - Rate limiting + honeypot
- [x] `app/api/expert-interview/chat/route.ts` - Chat message handling
- [x] `app/api/expert-interview/submit/route.ts` - Profile submission
- [x] `app/api/admin/experts/route.ts` - Admin queue listing
- [x] `app/api/admin/experts/[id]/route.ts` - Get expert detail
- [x] `app/api/admin/experts/[id]/approve/route.ts` - Approve & generate PathLab
- [x] `app/api/admin/experts/[id]/reject/route.ts` - Reject

#### 2.4 Core Services ✅

- [x] `lib/expert-interview/chat-service.ts` - AI chat orchestration + data extraction
- [x] `lib/expert-interview/sanitizer.ts` - Prompt injection prevention
- [x] `lib/expert-interview/rate-limiter.ts` - IP-based rate limiting
- [x] `lib/expert-interview/pathlab-transformer.ts` - Transform to PathLab input

#### 2.5 UI Components ✅

- [x] `app/expert-interview/page.tsx` - Main interview page (multi-step flow)
- [x] `components/expert-interview/InterviewChat.tsx` - Chat UI with progress
- [x] `components/expert-interview/ChatMessage.tsx` - Message bubble
- [x] `components/expert-interview/ChatInput.tsx` - Input with send button
- [x] `components/expert-interview/ProgressIndicator.tsx` - Interview progress bar
- [x] `components/expert-interview/ProfileForm.tsx` - Name, title, company, etc.
- [x] `components/expert-interview/MentoringOptIn.tsx` - Mentoring preference
- [x] `components/expert-interview/HoneypotField.tsx` - Hidden spam trap
- [x] `components/expert-interview/ThankYouPage.tsx` - Post-submission confirmation

#### 2.6 Admin Components ✅

- [x] `app/admin/experts/page.tsx` - Expert queue page
- [x] `app/admin/experts/ExpertQueueClient.tsx` - Client-side queue/detail switcher
- [x] `components/admin/ExpertQueue.tsx` - Queue with filtering + pagination
- [x] `components/admin/ExpertDetail.tsx` - Full transcript view + approve/reject

#### 2.7 PathLab Integration ✅

- [x] `lib/expert-interview/pathlab-transformer.ts` - Transform interview data to PathLab generator input
- [x] Connected to existing `lib/ai/pathlab-generator.ts` via approve route

---

### Phase 3: Mentoring System (Future)

Defer until Phase 2 is complete.

- [ ] Mentor session booking UI for parents
- [ ] Calendar integration (optional)
- [ ] Payment integration (optional)

---

### Phase 4: Polish & Testing

- [ ] Run `pnpm build` and fix errors
- [ ] Run `pnpm lint` and fix warnings
- [ ] Manual testing of landing page (EN/TH)
- [ ] Manual testing of expert interview flow
- [ ] Mobile responsiveness check

---

## File Structure (New Files)

```
app/
├── expert-interview/
│   └── page.tsx                    # Main interview page
├── admin/
│   └── experts/
│       └── page.tsx                # Admin expert queue
└── api/
    ├── expert-interview/
    │   ├── session/
    │   │   └── route.ts            # POST: Create session
    │   ├── chat/
    │   │   └── route.ts            # POST: Send message
    │   └── submit/
    │       └── route.ts            # POST: Submit profile
    └── admin/
        └── experts/
            ├── route.ts            # GET: List experts
            └── [id]/
                ├── approve/
                │   └── route.ts    # POST: Approve
                └── reject/
                    └── route.ts    # POST: Reject

components/
├── expert-interview/
│   ├── ChatInterface.tsx
│   ├── ProfileForm.tsx
│   ├── MentoringOptIn.tsx
│   └── HoneypotField.tsx
└── admin/
    ├── ExpertReviewCard.tsx
    └── ExpertDetail.tsx

lib/
└── expert-interview/
    ├── chat-service.ts
    ├── data-extractor.ts
    ├── sanitizer.ts
    ├── rate-limiter.ts
    └── pathlab-transformer.ts

types/
└── expert-interview.ts

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_create_expert_interview_tables.sql
```

---

## Security Checklist

- [x] Prompt injection prevention (sanitize input, structured extraction)
- [x] IP rate limiting (3 per hour)
- [x] Honeypot spam prevention
- [x] Admin review before publishing
- [ ] Input validation on all API routes
- [ ] Output sanitization for XSS
- [ ] RLS policies tested

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Landing Page | Done | P0 |
| Phase 2: Expert Interview | M (3-5 days) | P0 |
| Phase 3: Mentoring | L (defer) | P2 |
| Phase 4: Polish | S (1 day) | P1 |

---

## Acceptance Criteria

### Landing Page (Phase 1) ✅
- [x] Problem statement visible above the fold
- [x] Clear promise: "discover careers by doing"
- [x] All fake data removed
- [x] Thai/English language support with auto-detection
- [x] Expert CTA links to `/expert-interview`
- [x] Parents section has real value prop

### Expert Interview (Phase 2)
- [ ] Expert can start interview without login
- [ ] AI chat extracts career data in ~10 minutes
- [ ] Expert profile captured at end
- [ ] Mentoring opt-in works (none/free/paid)
- [ ] Admin can review and approve/reject
- [ ] Approved expert generates PathLab draft
- [ ] Rate limiting prevents abuse
- [ ] Honeypot catches bots

---

## Notes

- The landing page now clearly communicates the problem and solution
- Thai translations are emotionally compelling, not literal
- Browser locale detection defaults Thai users to Thai UI
- Expert interview system is unauthenticated to maximize conversion
- All expert submissions require admin review before PathLab is published