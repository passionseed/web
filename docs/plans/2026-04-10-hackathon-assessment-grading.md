# Hackathon Assessment Grading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin viewer for hackathon assessment submissions, let admins grade with feedback, and surface review events through an in-app inbox with a push-notification hook.

**Architecture:** Keep submitted work immutable by adding a separate review table and participant inbox table. Server-side admin routes use the existing Supabase SSR admin check plus a service-role client for cross-participant reads/writes. The UI adds a queue-first admin tab and a compact inbox on the hackathon dashboard.

**Tech Stack:** Next.js App Router, Supabase/Postgres migrations, React client components, Jest for pure helper coverage.

---

### Task 1: Review Helper Tests

**Files:**
- Create: `lib/hackathon/admin-submissions.test.ts`
- Create: `lib/hackathon/admin-submissions.ts`

**Step 1: Write failing tests**

Cover:
- Normalizing review status to submission-facing status.
- Building inbox rows for individual submissions.
- Building inbox rows for all team members on team submissions.

**Step 2: Run test to verify it fails**

Run: `pnpm test lib/hackathon/admin-submissions.test.ts --runInBand --coverage=false`

Expected: FAIL because `lib/hackathon/admin-submissions.ts` does not exist.

**Step 3: Implement minimal helper module**

Add typed helper functions:
- `reviewStatusToSubmissionStatus(status)`
- `buildReviewInboxItems(input)`
- `normalizeScoreAwarded(value, pointsPossible)`

**Step 4: Run test to verify it passes**

Run: `pnpm test lib/hackathon/admin-submissions.test.ts --runInBand --coverage=false`

Expected: PASS.

### Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/20260410000000_hackathon_submission_reviews_and_inbox.sql`

**Step 1: Add review table**

Create `hackathon_submission_reviews` with:
- `submission_scope` check: `individual`, `team`
- nullable individual/team submission ids with exactly one set
- `review_status` check: `pending_review`, `passed`, `revision_required`
- `score_awarded`, `points_possible`, `feedback`
- `reviewed_by_user_id`, `reviewed_at`, timestamps
- unique constraints for individual and team submission review rows

**Step 2: Add inbox table**

Create `hackathon_participant_inbox_items` with:
- `participant_id`
- `type`
- `title`, `body`
- `action_url`
- `metadata`
- `read_at`, timestamps

**Step 3: Add indexes, grants, and RLS**

Use service-role writes for admin review routes. Allow hackathon-token API routes to read participant inbox through service-role lookup.

### Task 3: Admin Submissions APIs

**Files:**
- Create: `app/api/admin/hackathon/submissions/route.ts`
- Create: `app/api/admin/hackathon/submissions/[scope]/[id]/review/route.ts`

**Step 1: List route**

Return normalized submissions with participant/team/activity/assessment/review fields. Support optional `status`, `scope`, and `q` query params.

**Step 2: Review route**

Validate admin, validate scope/id, validate score against points possible, upsert review, update submission status, create participant inbox items, and return the saved review plus created inbox count.

### Task 4: Participant Inbox API

**Files:**
- Create: `app/api/hackathon/inbox/route.ts`

**Step 1: Read route**

Authenticate via hackathon bearer token or cookie-backed helper, return current participant inbox items.

**Step 2: Mark read route**

Allow PATCH to mark one item or all participant items read.

### Task 5: Admin UI

**Files:**
- Create: `components/admin/AdminHackathonSubmissions.tsx`
- Modify: `components/admin/AdminDashboard.tsx`

**Step 1: Queue UI**

Add cards for pending/reviewed/revision counts, filters, and a responsive submission list.

**Step 2: Viewer and grading form**

Show submission content, attachments, participant/team context, activity prompt/rubric metadata, status selector, score input, and feedback textarea.

**Step 3: Wire dashboard tab**

Add `Submissions` under Hackathon management.

### Task 6: Hackathon Dashboard Inbox

**Files:**
- Modify: `app/hackathon/dashboard/page.tsx`

**Step 1: Fetch inbox**

After participant load, fetch `/api/hackathon/inbox` using the stored hackathon token if available or cookie session fallback if present.

**Step 2: Render inbox**

Add a compact feedback inbox panel with unread state, grade status, score, message body, and action link.

### Task 7: Verification

**Commands:**
- `pnpm test lib/hackathon/admin-submissions.test.ts --runInBand --coverage=false`
- `pnpm lint`

**Expected:** Focused tests pass. Lint either passes or reports pre-existing/global Next lint configuration issues that are documented in the final response.
