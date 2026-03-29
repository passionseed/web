# The Next Decade Hackathon Context

This file summarizes the current `app/hackathon` surface area so someone can get oriented quickly without opening every route and component.

## What this area is

The hackathon section is a semi-independent product flow inside the main Next.js app. It has its own:

- participant auth model based on a custom cookie session, not Supabase Auth
- registration and login flow
- onboarding questionnaire
- team formation lobby and matching flow
- challenge browsing experience
- sponsorship landing page

The overall theme is a cinematic, underwater, bioluminescent experience for participants, sponsors, and visitors.

## Core mission and audience

The current messaging positions the hackathon as a healthcare innovation program focused on preventive, predictive, evidence-based, and empathetic solutions.

Primary audience:

- high school students
- university students

Secondary audience:

- sponsors and partners
- parents
- internal admins managing participants, teams, and future reporting flows

## Route map

### `/hackathon`

Entry page. Server component in [app/hackathon/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/page.tsx) checks the `hackathon_token` cookie via `getSessionParticipant()` and passes `isLoggedIn` into [components/hackathon/LandingPage.tsx](/Users/bunyasit/dev/pseed/components/hackathon/LandingPage.tsx).

Landing page responsibilities:

- hero storytelling and animated introduction
- analytics event to `/api/hackathon/track-view`
- CTA routing
- if logged in: CTA goes to `/hackathon/team`
- if logged out: CTA goes to `/hackathon/register`

### `/hackathon/register`

Client page in [app/hackathon/register/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/register/page.tsx).

Purpose:

- collect participant registration data
- create the participant record
- create a hackathon session cookie
- transition to LINE onboarding

Collected fields:

- name
- email
- phone
- password
- university
- track
- grade level
- experience level
- referral source
- bio

Backend endpoint:

- [app/api/hackathon/register/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/register/route.ts)

Important behavior:

- duplicate emails are rejected
- password minimum here is 6 characters
- successful registration sets the custom session cookie and pushes the user to `/hackathon/line-oa`

### `/hackathon/line-oa`

Client page in [app/hackathon/line-oa/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/line-oa/page.tsx).

Purpose:

- encourage the participant to join the LINE group
- act as a post-registration interstitial
- continue the animated water-transition flow

Behavior:

- external LINE invite link opens in a new tab
- primary next step sends the participant to `/hackathon/team`

### `/hackathon/login`

Client page in [app/hackathon/login/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/login/page.tsx).

Purpose:

- sign existing hackathon participants back in using the custom auth system

Backend endpoint:

- [app/api/hackathon/login/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/login/route.ts)

Behavior:

- validates email/password against `hackathon_participants`
- creates a new session row and cookie
- currently routes successful logins to `/hackathon/team`

### `/hackathon/forgot-password`

Client page in [app/hackathon/forgot-password/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/forgot-password/page.tsx).

Backend endpoint:

- [app/api/hackathon/forgot-password/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/forgot-password/route.ts)

Behavior:

- always returns a success-style message to avoid email enumeration
- creates a reset token in `hackathon_password_resets`
- uses Resend if configured
- in development without Resend, can surface a direct reset URL

### `/hackathon/reset-password`

Client page in [app/hackathon/reset-password/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/reset-password/page.tsx).

Backend endpoint:

- [app/api/hackathon/reset-password/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/reset-password/route.ts)

Behavior:

- reads `token` from the query string
- validates password confirmation
- enforces 8-character minimum here
- consumes the reset token and updates the participant password hash

Note:

- registration requires 6+ characters, reset requires 8+. That is a real policy mismatch in the current implementation.

### `/hackathon/onboarding`

Client page in [app/hackathon/onboarding/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/onboarding/page.tsx).

Purpose:

- collect the pre-questionnaire
- capture identity, aspirations, self-assessment, and problem interests
- gate later surfaces like `/hackathon/dashboard`

Structure:

- step 1: participant profile and motivation
- step 2: “loves” and “good at” items
- step 3: problem selection via [components/hackathon/problem-explorer.tsx](/Users/bunyasit/dev/pseed/components/hackathon/problem-explorer.tsx)

Backend endpoint:

- [app/api/hackathon/pre-questionnaire/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/pre-questionnaire/route.ts)

Important payload concepts:

- `dream_faculty`
- `confidence_level`
- `family_support_level`
- `why_hackathon`
- `team_role_preference`
- `ai_proficiency`
- `loves`
- `good_at`
- `problem_preferences`
- `school_level`

Rules enforced in the API:

- questionnaire requires an authenticated hackathon session
- 1 to 3 problem preferences
- at least one `loves` item
- at least one `good_at` item
- `school_level` must be `high_school` or `university`
- saved via upsert into `hackathon_pre_questionnaires`

### `/hackathon/dashboard`

Client page in [app/hackathon/dashboard/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/dashboard/page.tsx).

Current role:

- lightweight participant confirmation page
- not the main operational hub

Behavior:

- fetches `/api/hackathon/me`
- then fetches `/api/hackathon/pre-questionnaire`
- if questionnaire is missing, redirects to `/hackathon/onboarding?returnTo=/hackathon/dashboard`
- if questionnaire exists, shows a simple “You’re in” participant summary card

Observation:

- the main post-auth flow currently leads people to `/hackathon/team`, not `/hackathon/dashboard`
- this suggests the dashboard is either an older path, a secondary path, or a placeholder for future richer growth tracking work

### `/hackathon/team`

Server page in [app/hackathon/team/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/team/page.tsx) that resolves the current participant from the hackathon cookie and loads the team into [components/hackathon/TeamDashboard.tsx](/Users/bunyasit/dev/pseed/components/hackathon/TeamDashboard.tsx).

This is the most “operational” participant area today.

Capabilities:

- show current team and lobby code
- create a team
- join a team with a 6-character lobby code
- leave a team
- enter or exit a team-matching waitlist
- poll for team membership and matching status
- inspect teammates’ questionnaire-derived problem interests
- jump out to the LINE group
- log out

Related APIs:

- [app/api/hackathon/team/me/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/me/route.ts)
- [app/api/hackathon/team/create/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/create/route.ts)
- [app/api/hackathon/team/join/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/join/route.ts)
- [app/api/hackathon/team/leave/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/leave/route.ts)
- [app/api/hackathon/team/interests/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/interests/route.ts)
- [app/api/hackathon/team/match/status/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/match/status/route.ts)
- [app/api/hackathon/team/match/join/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/match/join/route.ts)
- [app/api/hackathon/team/match/cancel/route.ts](/Users/bunyasit/dev/pseed/app/api/hackathon/team/match/cancel/route.ts)

Team interest panel:

- reads members’ `problem_preferences` and `team_role_preference` from `hackathon_pre_questionnaires`
- highlights overlap across teammates
- effectively uses the questionnaire as lightweight team-formation context

### `/hackathon/challenge`

Thin page wrapper in [app/hackathon/challenge/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/challenge/page.tsx) around [components/hackathon/ChallengePage.tsx](/Users/bunyasit/dev/pseed/components/hackathon/ChallengePage.tsx).

Purpose:

- display the problem landscape for the hackathon
- group problems by thematic track

Current tracks:

- Track 01: Traditional & Integrative Healthcare
- Track 02: Mental Health
- Track 03: Community, Public & Environmental Health

Problem set:

- Track 01: `P1`, `P2`, `P3`
- Track 02: `P4`, `P5`, `P6`
- Track 03: `P7`, `P8`, `P9`

### `/hackathon/challenge/[problemId]`

Thin page wrapper in [app/hackathon/challenge/[problemId]/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/challenge/[problemId]/page.tsx) around [components/hackathon/ProblemDetailPage.tsx](/Users/bunyasit/dev/pseed/components/hackathon/ProblemDetailPage.tsx).

Purpose:

- show a single problem in more depth
- source detailed content from JSON files under `public/data/hackathon/problems/`

Data source examples:

- [public/data/hackathon/problems/p1.json](/Users/bunyasit/dev/pseed/public/data/hackathon/problems/p1.json)
- through `p9.json`

### `/hackathon/sponsorship`

Server page in [app/hackathon/sponsorship/page.tsx](/Users/bunyasit/dev/pseed/app/hackathon/sponsorship/page.tsx) with layout in [app/hackathon/sponsorship/layout.tsx](/Users/bunyasit/dev/pseed/app/hackathon/sponsorship/layout.tsx) and UI in [app/hackathon/sponsorship/SponsorshipContent.tsx](/Users/bunyasit/dev/pseed/app/hackathon/sponsorship/SponsorshipContent.tsx).

Purpose:

- public sponsor-facing pitch page
- show sponsorship tiers and package framing
- use live participant/team counts pulled from Supabase

Current live stats queried:

- total hackathon participants
- total hackathon teams
- grade-level distribution

## Current user journeys

### Visitor to participant

1. Land on `/hackathon`
2. Click CTA
3. Register on `/hackathon/register`
4. Get session cookie immediately
5. Visit `/hackathon/line-oa`
6. Continue to `/hackathon/team`

### Returning participant

1. Visit `/hackathon/login`
2. Authenticate
3. Get fresh session cookie
4. Land on `/hackathon/team`

### Questionnaire-gated dashboard path

1. Visit `/hackathon/dashboard`
2. If not authenticated, redirect to `/hackathon/login`
3. If authenticated but questionnaire missing, redirect to `/hackathon/onboarding`
4. If questionnaire exists, show participant summary screen

### Teaming path

1. Arrive at `/hackathon/team`
2. Either create a team, join by lobby code, or join matching waitlist
3. Team page polls for membership changes and matching state
4. Once in a team, see members, shared interests, and lobby code

## Data model and auth model

Key helper module:

- [lib/hackathon/db.ts](/Users/bunyasit/dev/pseed/lib/hackathon/db.ts)

Key auth helper:

- [lib/hackathon/auth.ts](/Users/bunyasit/dev/pseed/lib/hackathon/auth.ts)

Important tables implied by the current implementation:

- `hackathon_participants`
- `hackathon_sessions`
- `hackathon_teams`
- `hackathon_team_members`
- `hackathon_password_resets`
- `hackathon_pre_questionnaires`
- `hackathon_team_matching_waitlist`

Session model:

- cookie name is `hackathon_token`
- cookie points to a row in `hackathon_sessions`
- session rows expire after `SESSION_EXPIRY_DAYS`
- participant lookup is separate from standard Supabase Auth

Important implication:

- hackathon auth is intentionally isolated from the rest of the app’s main auth stack
- most hackathon APIs use either service-role Supabase access or a server client after resolving the hackathon cookie session first

## Challenge/problem content model

There are 9 curated problems, stored as build-time JSON data in `public/data/hackathon/problems`.

The questionnaire’s problem-selection UI reuses that same content domain via [components/hackathon/problem-explorer.tsx](/Users/bunyasit/dev/pseed/components/hackathon/problem-explorer.tsx).

That means the challenge pages and onboarding questionnaire are coupled around the same canonical problem IDs:

- `P1` to `P9`

This is useful because:

- participants can express preferences using the same problem taxonomy shown publicly
- team interest summaries can compare participants using the same IDs

## What feels “current” vs “planned”

### Clearly live/current

- landing page
- registration
- login
- password reset
- LINE onboarding
- onboarding questionnaire
- team creation/join/matching
- challenge browsing
- sponsorship page

### Present but thinner than the rest

- `/hackathon/dashboard`

It works, but it currently behaves more like a confirmation/gating page than a full participant dashboard.

### Planned in repo docs but not currently present under `app/hackathon`

The repo contains a design/implementation plan for a richer month-long program layer:

- [docs/plans/2026-03-16-hackathon-growth-tracking-design.md](/Users/bunyasit/dev/pseed/docs/plans/2026-03-16-hackathon-growth-tracking-design.md)
- [docs/plans/2026-03-16-hackathon-growth-tracking.md](/Users/bunyasit/dev/pseed/docs/plans/2026-03-16-hackathon-growth-tracking.md)

Planned surfaces mentioned there:

- `/hackathon/survey`
- `/hackathon/reflect/[sessionId]`
- richer growth dashboard extensions
- `/hackathon/report/[token]` for parent reports
- admin-side session and reporting controls

Those routes are not currently implemented in `app/hackathon`, but the docs show the intended direction.

## Notable implementation quirks

- Login and registration flow to `/hackathon/team`, while `/hackathon/dashboard` exists as a separate gated surface.
- Password length policy is inconsistent: register requires 6+, reset requires 8+.
- TeamDashboard links to `/pre-questionnaire` in one place, but the actual questionnaire route is `/hackathon/onboarding`; that link likely needs cleanup.
- Hackathon APIs often use service-role access directly for hackathon-specific tables, which is pragmatic but means this area should be reviewed carefully if permissions become more complex.

## Fast mental model

If you only remember one thing, remember this:

- `/hackathon` is the public story
- `/hackathon/register` and `/hackathon/login` create a custom hackathon session
- `/hackathon/onboarding` captures pre-questionnaire data
- `/hackathon/team` is the real participant hub today
- `/hackathon/challenge` is the problem library
- `/hackathon/sponsorship` is the sponsor-facing pitch page
- `/hackathon/dashboard` exists, but is currently lighter than the team flow and likely meant to grow later
