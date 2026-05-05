# Static Page Analysis Report

Generated: 2026-05-05 | Project: PassionSeed (Next.js 15.4.5 App Router + Supabase SSR)

---

## Can Convert to force-static

- **app/map/page.tsx**: No auth check, no cookies, no redirects, no searchParams. Calls `getMapsWithStatsServer(0, 20)` which fetches public map listing data. No `createClient()` call at all — uses a server-side Supabase query only. Renders a client component wrapper (`MapsClientPage`) that handles interactivity client-side. The server pre-fetch is purely for hydration performance. Can be `export const dynamic = "force-static"`.

---

## Can Convert to ISR

- **app/hackathon/sponsorship/page.tsx**: Public page. Uses `createAdminClient()` (service role key, no cookies). Fetches participant/team counts and grade-level breakdowns. No user auth, no redirects, no cookie reads. Aggregated stats that change slowly. Suggested: `export const revalidate = 300` (5 minutes).

- **app/epic-sprint/page.tsx**: Public report page. Uses `createAdminClient()` only. Fetches hackathon participants and beta registrations for a static report (Epic Sprint March 2026). The underlying data is historical (linked to a past event) and rarely changes. No user auth, no redirects. Suggested: `export const revalidate = 3600` (1 hour) — or even force-static since this is a historical report.

- **app/fi/exec/page.tsx**: Public executive dashboard. Uses `createAdminClient()` only. Fetches hackathon and beta data for summary stats. No user auth, no redirects, no cookies. Suggested: `export const revalidate = 300` (5 minutes).

---

## Must Stay force-dynamic

### Auth-gated pages (read cookies, redirect based on user state)

- **app/page.tsx** (root): Reads cookies via `createClient()`, calls `getUser()`, checks `isAnonymousUser()`, queries `profiles` table, conditionally redirects to `/me`, `/onboard`, `/auth/finish-profile`, or renders landing page. This is the authentication routing hub — must be per-request.

- **app/login/page.tsx**: Reads cookies via `createClient()`, calls `getUser()`. If already logged in, checks `profiles` table for completion and redirects to `/auth/finish-profile` or `/`. Must be per-request (auth guard before showing login form).

- **app/me/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login` if no user. Fetches user-specific dashboard data via `getUserDashboardData(supabase)`. Renders personalized portal with reflections, next steps, etc. Must be per-user.

- **app/me/journey/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login` if no user. Passes `userId` to client wrapper for personalized learning map. Must be per-user.

- **app/onboard/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login` if no user. Queries `onboarding_state` and `profiles` for that specific user. Redirects to `/me` if already onboarded. Must be per-user.

- **app/classrooms/join/page.tsx**: Reads cookies, calls `getUser()`, returns `notFound()` if no user. Renders join form. Must be per-request (auth required to join).

- **app/teams/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login`. Fetches user-specific classroom memberships, team data, and maps. Complex per-user data aggregation. Must be per-user.

- **app/feedback/[token]/page.tsx**: Uses `params.token`. Conditionally reads cookies/auth if `form.require_auth` is true — redirects unauthenticated users to login. Has a server action (`handleSubmit`) that processes form submissions. Uses `createClient()` in the JSX (auth-dependent footer). Must be per-request.

### PS (Passion Seed) team-gated pages

- **app/build/page.tsx**: Calls `getPSAccess()` which reads cookies and checks `user_roles` table. Renders "Build Access Required" for unauthorized. Fetches user-specific tasks, leaderboard, focus stats, project memberships. Must be per-user.

- **app/ps/projects/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login`. Fetches user-specific projects, tasks, pending request counts, and project memberships. Must be per-user.

- **app/ps/projects/[id]/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login`. Uses `params.id`. Fetches project details, stats, members, requests — all user-specific and project-specific. Must be per-user.

- **app/ps/projects/[id]/feedback/page.tsx**: Uses `params.id`. No direct `createClient()` call, but calls server actions (`getProjectForms`, `getProjectSubmissions`) that internally auth-check via `getPSAccess()` or `checkPSRole()`. Contains inline server action (`createForm`). Data is project-specific and user-gated. Caching would leak form data between users. Must stay dynamic.

- **app/ps/projects/[id]/feedback/[formId]/page.tsx**: Uses `params.id` and `params.formId`. Calls server actions (`getFormWithFields`, `getProjectTasks`) that auth-check internally. Form editor page with user-gated data. Must stay dynamic.

- **app/ps/b2b/page.tsx**: Calls `getPSAccess()` which reads cookies and checks roles. Renders "Build Access Required" for unauthorized. Must be per-request.

- **app/ps/hackathon/page.tsx**: Reads cookies, calls `getUser()`, redirects to `/login`. Fetches user-specific hackathon data, memberships, and pending counts. Must be per-user.

### CC Research pages (team-gated)

- **app/cc-research/layout.tsx**: Calls `requireCCResearchAccess()` which reads cookies, checks auth, queries `user_roles`. Returns different UI for unauthorized vs authorized. All child pages inherit this auth gate. Must stay dynamic.

- **app/cc-research/campaigns/page.tsx**: Calls `requireCCResearchAccess()` and `listCcCampaigns()`. Team-gated data. Even though layout also checks auth, the page has its own auth call. Must stay dynamic.

- **app/cc-research/campaigns/[id]/page.tsx**: Calls `requireCCResearchAccess()` and `getCampaignDashboardPayload(id)` using `params.id`. Team-gated, campaign-specific data. Must stay dynamic.

### Workshop page (auth-aware rendering)

- **app/workshops/page.tsx**: Calls `createClient()` and `getUser()` but does NOT redirect. Uses `user` boolean to conditionally render buttons ("Suggest a Path" links to `/suggest-path` vs `/login?modal=suggest`, "Vote for Next Paths" shown only when logged in). Fetches workshop list from DB. Could theoretically work with force-static + client-side auth check for the conditional UI, but currently relies on server-side auth read. Must stay dynamic for now (would need refactoring to go static).

### Admin pages (all behind requireAdmin layout)

All 25 admin pages are protected by `app/admin/layout.tsx` which calls `requireAdmin()` — this reads cookies, checks auth, queries `user_roles` for admin role, and redirects unauthorized users to `/login` or `/me`. The layout's `force-dynamic` makes the entire admin subtree dynamic. Individual pages also mostly use `createAdminClient()` (service key, no cookies) to fetch data, but their access control depends on the layout's cookie-based auth.

- **app/admin/layout.tsx**: `requireAdmin()` — reads cookies, checks user_roles, redirects. Must stay dynamic (auth gate).
- **app/admin/page.tsx**: Admin dashboard with nav cards. Protected by layout. Page itself is a pure component (no data fetching), but behind auth gate.
- **app/admin/analytics/page.tsx**: Protected by layout.
- **app/admin/users/page.tsx**: Protected by layout.
- **app/admin/experts/page.tsx**: Protected by layout.
- **app/admin/hackathon/page.tsx**: Protected by layout.
- **app/admin/hackathon/analytics/page.tsx**: Protected by layout.
- **app/admin/hackathon/team-directions/page.tsx**: Protected by layout.
- **app/admin/hackathon/activities/editor/page.tsx**: Protected by layout.
- **app/admin/hackathon/activities/page.tsx**: Protected by layout.
- **app/admin/hackathon/activities/[activityId]/clusters/page.tsx**: Protected by layout. Uses params.
- **app/admin/hackathon/teams/page.tsx**: Protected by layout.
- **app/admin/hackathon/mentors/page.tsx**: Protected by layout.
- **app/admin/hackathon/participants/page.tsx**: Protected by layout.
- **app/admin/hackathon/email-sender/page.tsx**: Protected by layout.
- **app/admin/hackathon/team-finder/page.tsx**: Protected by layout.
- **app/admin/hackathon/team-submissions/page.tsx**: Protected by layout.
- **app/admin/hackathon/push-sender/page.tsx**: Protected by layout.
- **app/admin/hackathon/questionnaire/page.tsx**: Protected by layout.
- **app/admin/ceo/page.tsx**: Protected by layout.
- **app/admin/ceo/payments/page.tsx**: Protected by layout.
- **app/admin/maps/page.tsx**: Protected by layout.
- **app/admin/beta/page.tsx**: Protected by layout.
- **app/admin/direction-finder/page.tsx**: Protected by layout.
- **app/admin/team-matching-simulator/page.tsx**: Protected by layout.
- **app/admin/event-tracker/page.tsx**: Protected by layout.

---

## Summary

- **Total pages analyzed**: 49 (48 pages + 2 layouts)
- **Can go force-static**: 1 (`app/map/page.tsx`)
- **Can go ISR**: 3 (`app/hackathon/sponsorship/page.tsx`, `app/epic-sprint/page.tsx`, `app/fi/exec/page.tsx`)
- **Must stay force-dynamic**: 45 (all auth-gated, team-gated, admin pages, plus the auth-aware workshops page)

---

## Key Takeaways

1. **The vast majority (92%) must stay dynamic** because they depend on Supabase SSR cookies for authentication and user-specific data fetching. This is inherent to a user-gated application.

2. **Only 4 pages (8%) can be optimized** — three ISR candidates and one force-static candidate. All four share the same pattern: public pages using `createAdminClient()` (service role key) with no user auth, no cookies, no redirects.

3. **`createAdminClient()` vs `createClient()` is the key discriminator.** Pages using the admin client (service role) can be static/ISR. Pages using the SSR client (cookies) cannot.

4. **The admin layout** (`app/admin/layout.tsx`) is the single auth gate for 25 pages. If that layout could be refactored to not require cookies (e.g., using a different auth mechanism), all admin pages could theoretically become ISR. However, Supabase SSR auth is fundamentally cookie-based, so this is not feasible without a major architectural change.

5. **`app/map/page.tsx`** is an anomaly — it has `force-dynamic` but performs no auth check at all. It simply fetches public map data. The `force-dynamic` appears to be a leftover. Converting to `force-static` is safe and would eliminate serverless invocations for a potentially high-traffic page.
