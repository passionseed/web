# Profile Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `/profile` as a role-adaptive dashboard that surfaces real user data first and keeps account editing as a lower-page section.

**Architecture:** Keep the route interactive on the client for avatar upload and inline editing, but move dashboard aggregation into a dedicated authenticated API route plus pure helper functions. Use the existing Dawn/Dusk system from `app/globals.css`, keep badges and mentor availability in their existing components, and derive learning/reflection stats from live Supabase data only.

**Tech Stack:** Next.js App Router, Supabase SSR + browser client, React, Jest, Tailwind, existing `ei-card` / `ei-button-dawn` / `ei-button-dusk` styles.

---

### Task 1: Add tested dashboard helpers

**Files:**
- Create: `components/profile/profile-dashboard-utils.test.ts`
- Create: `components/profile/profile-dashboard-utils.ts`

**Steps:**
1. Write failing tests for role/theme selection, reflection streak calculation, and enrolled-map aggregation.
2. Run `pnpm test components/profile/profile-dashboard-utils.test.ts --runInBand` and confirm failure.
3. Implement the minimal pure helpers to satisfy the tests.
4. Re-run the same test command and confirm it passes.

### Task 2: Add profile dashboard data route

**Files:**
- Create: `app/api/profile/dashboard/route.ts`
- Modify: `components/profile/profile-dashboard-utils.ts`

**Steps:**
1. Build an authenticated API route that loads roles, classrooms, teams, reflection data, projects, workshops, enrolled maps, and node progress.
2. Reuse the pure helpers to shape the response into dashboard-friendly metrics.
3. Keep graceful fallbacks for partially inaccessible tables instead of failing the whole page.

### Task 3: Rebuild `/profile`

**Files:**
- Modify: `app/profile/page.tsx`

**Steps:**
1. Preserve existing profile creation, avatar upload, and save behavior.
2. Fetch the new dashboard route alongside profile data.
3. Replace the old single-card layout with a Dawn/Dusk dashboard using real stats, learning-space lists, reflection summaries, achievements, and account details.
4. Keep `BadgeGallery` and `MentorAvailabilitySettings` wired to live user data.

### Task 4: Verify behavior

**Files:**
- Verify: `app/profile/page.tsx`
- Verify: `app/api/profile/dashboard/route.ts`
- Verify: `components/profile/profile-dashboard-utils.ts`

**Steps:**
1. Run the new targeted Jest test.
2. Run a lint check or focused repo verification if feasible.
3. Open `/profile` in the browser and confirm the adaptive layout renders and empty states remain coherent.
