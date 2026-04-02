# Hackathon Team Matching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an event-based hackathon teammate ranking flow where unteamed participants add people they met, rank that shortlist, and receive automatically created 3-5 person teams when the event closes.

**Architecture:** Add dedicated matching-event tables, keep the scoring and team-assembly logic in a pure library module, expose thin hackathon APIs over that module, and write final results into the existing `hackathon_teams` and `hackathon_team_members` tables. The matching engine should prioritize mutual rankings first and use questionnaire compatibility only as fallback placement signal.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres, Jest, React client components, existing hackathon auth/session helpers.

---

### Task 1: Add failing tests for the production matching engine

**Files:**
- Create: `lib/hackathon/team-matching.test.ts`
- Create: `lib/hackathon/team-matching.ts`

**Step 1: Write the failing test**

Add unit tests for:

- strong mutual top-ranked pairs ending up together,
- everyone being assigned to a team,
- no team exceeding 5,
- no valid distribution producing 1-2 person leftovers when avoidable,
- fallback placement using questionnaire overlap when mutual signal is missing.

**Step 2: Run test to verify it fails**

Run: `pnpm test lib/hackathon/team-matching.test.ts`
Expected: FAIL because `lib/hackathon/team-matching.ts` or exported production functions do not exist yet.

**Step 3: Write minimal implementation**

Create a pure matching module with:

- input types for participant profile, met edges, rankings, and config,
- pair-scoring helpers,
- team assembly helpers,
- exported function for generating final teams.

**Step 4: Run test to verify it passes**

Run: `pnpm test lib/hackathon/team-matching.test.ts`
Expected: PASS.

### Task 2: Add failing tests for event lifecycle DB helpers

**Files:**
- Modify: `lib/hackathon/db.ts`
- Create: `lib/hackathon/db.matching.test.ts`

**Step 1: Write the failing test**

Add tests for helper-level behaviors:

- loading the active matching event,
- validating that rankings only target met participants,
- assembling matcher input from participant/questionnaire/ranking data,
- writing resulting teams and memberships from a completed run.

Prefer mocking the Supabase client boundary instead of touching a real database.

**Step 2: Run test to verify it fails**

Run: `pnpm test lib/hackathon/db.matching.test.ts`
Expected: FAIL because the new helper exports do not exist.

**Step 3: Write minimal implementation**

Extend `lib/hackathon/db.ts` with matching-event helpers such as:

- `getActiveMatchingEvent`
- `getMatchingEventStateForParticipant`
- `saveMetConnections`
- `saveParticipantRankings`
- `buildMatchingRunInput`
- `createTeamsFromMatchingRun`

Keep orchestration thin and delegate scoring/assembly to `lib/hackathon/team-matching.ts`.

**Step 4: Run test to verify it passes**

Run: `pnpm test lib/hackathon/db.matching.test.ts`
Expected: PASS.

### Task 3: Add the schema for matching events, met edges, rankings, and run logs

**Files:**
- Create: `supabase/migrations/20260401160000_create_hackathon_matching_events.sql`

**Step 1: Write the failing test**

No code-level automated test is required for the SQL file itself; the failing check is schema usage from Tasks 2 and 4 referencing missing tables and fields.

**Step 2: Run test to verify it fails**

Run: `pnpm test lib/hackathon/db.matching.test.ts`
Expected: existing helper tests still describe missing schema-backed helpers or invalid assumptions.

**Step 3: Write minimal implementation**

Add migration for:

- `hackathon_matching_events`
- `hackathon_matching_met_connections`
- `hackathon_matching_rankings`
- `hackathon_matching_runs`

Include indexes and uniqueness constraints that protect against self-links, duplicate rankings, and duplicate rank positions.

**Step 4: Run test to verify it passes**

Run: `pnpm test lib/hackathon/db.matching.test.ts`
Expected: helper tests still pass because they target the TS layer, while the schema is now present for real environments.

### Task 4: Add participant API tests for shortlist and ranking constraints

**Files:**
- Create: `app/api/hackathon/matching/__tests__/routes.test.ts`
- Create: `app/api/hackathon/matching/event/route.ts`
- Create: `app/api/hackathon/matching/met/route.ts`
- Create: `app/api/hackathon/matching/rankings/route.ts`

**Step 1: Write the failing test**

Cover:

- unauthorized requests rejected,
- no-active-event requests rejected,
- saving met connections rejects self-links,
- saving rankings rejects targets outside the met list,
- successful event fetch returns active event state plus current participant shortlist/rankings.

**Step 2: Run test to verify it fails**

Run: `pnpm test app/api/hackathon/matching/__tests__/routes.test.ts`
Expected: FAIL because the routes and helper exports do not exist.

**Step 3: Write minimal implementation**

Add participant-facing routes that:

- resolve the hackathon session cookie,
- load the current participant,
- read/write met connections and rankings through the new DB helpers.

**Step 4: Run test to verify it passes**

Run: `pnpm test app/api/hackathon/matching/__tests__/routes.test.ts`
Expected: PASS.

### Task 5: Add admin event-close orchestration tests

**Files:**
- Create: `app/api/admin/hackathon/matching/run/route.ts`
- Create: `app/api/admin/hackathon/matching/__tests__/run-route.test.ts`

**Step 1: Write the failing test**

Cover:

- non-admin access rejected,
- event status transitions from `live` to `ranking_locked` to `matched`,
- matcher receives only unteamed participants,
- final teams and memberships are written,
- failed runs are recorded with error status.

**Step 2: Run test to verify it fails**

Run: `pnpm test app/api/admin/hackathon/matching/__tests__/run-route.test.ts`
Expected: FAIL because the route does not exist.

**Step 3: Write minimal implementation**

Create an admin route that:

- authenticates the admin with the existing Supabase admin pattern,
- builds matcher input,
- runs the production matching engine,
- creates final teams in existing tables,
- stores a run snapshot.

**Step 4: Run test to verify it passes**

Run: `pnpm test app/api/admin/hackathon/matching/__tests__/run-route.test.ts`
Expected: PASS.

### Task 6: Add the participant matching page UI

**Files:**
- Create: `app/hackathon/matching/page.tsx`
- Create: `components/hackathon/HackathonMatchingPage.tsx`
- Modify: `components/hackathon/TeamDashboard.tsx`

**Step 1: Write the failing test**

Add component tests for:

- rendering active event metadata,
- adding/removing met participants,
- reordering ranked participants,
- locked event state disabling edits,
- empty state when there is no active event.

**Step 2: Run test to verify it fails**

Run: `pnpm test components/hackathon/HackathonMatchingPage.test.tsx`
Expected: FAIL because the component does not exist.

**Step 3: Write minimal implementation**

Build a participant page that:

- fetches active event state,
- lists eligible unteamed participants,
- supports met-list management,
- supports rank ordering,
- reuses existing hackathon visual language rather than introducing a new style system.

Update `TeamDashboard.tsx` to link unteamed participants into the matching page when an event is active.

**Step 4: Run test to verify it passes**

Run: `pnpm test components/hackathon/HackathonMatchingPage.test.tsx`
Expected: PASS.

### Task 7: Add minimal admin controls to trigger matching

**Files:**
- Modify: `app/admin/team-matching-simulator/page.tsx`
- Modify: `components/admin/team-matching/TeamMatchingSimulator.tsx`
- Or create a sibling admin component if keeping simulator and production run controls separate is cleaner.

**Step 1: Write the failing test**

Add component tests for:

- loading the active event,
- triggering the run endpoint,
- displaying run success or failure,
- preserving simulator behavior if that page still exists.

**Step 2: Run test to verify it fails**

Run: `pnpm test components/admin/team-matching/AdminHackathonMatchingControl.test.tsx`
Expected: FAIL because the production control component does not exist.

**Step 3: Write minimal implementation**

Add a lightweight admin surface that:

- shows event state,
- allows running auto-match,
- reports created team counts and placement summary.

Keep the simulator available if it remains useful for manual experimentation.

**Step 4: Run test to verify it passes**

Run: `pnpm test components/admin/team-matching/AdminHackathonMatchingControl.test.tsx`
Expected: PASS.

### Task 8: Run final verification

**Files:**
- Modify: any files touched above

**Step 1: Run targeted tests**

Run:

- `pnpm test lib/hackathon/team-matching.test.ts`
- `pnpm test lib/hackathon/db.matching.test.ts`
- `pnpm test app/api/hackathon/matching/__tests__/routes.test.ts`
- `pnpm test app/api/admin/hackathon/matching/__tests__/run-route.test.ts`
- `pnpm test components/hackathon/HackathonMatchingPage.test.tsx`

Expected: PASS.

**Step 2: Run broader verification**

Run:

- `pnpm test components/admin/team-matching/matchTeams.test.ts`
- `pnpm lint`

Expected: PASS.

**Step 3: Run build verification**

Run: `pnpm build`
Expected: PASS.
