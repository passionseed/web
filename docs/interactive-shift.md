# Interactive SHIFT pilot

This implementation is a scheduled seven-day camp in `ps_app`, backed by
`pseed`. Peer groups and project membership are separate. A participant can
build solo while interacting with two peers; a group can also share a project.

## Setup and release

1. Review and deploy `supabase/migrations/20260930180202_interactive_shift_camp.sql`
   to the intended Supabase environment before releasing mobile version 1.0.2.
   This work does not apply migrations to production or publish the app.
   Mobile 1.0.2 needs a new native binary for `expo-image-picker`; an OTA update
   to the old binary is insufficient. Its [Expo configuration](https://docs.expo.dev/versions/v55.0.0/sdk/imagepicker/#configuration-in-app-config)
   supplies the photo-library permission text.
2. Open `/admin/shift/camp` as an admin. Create a cohort with its Bangkok start
   date. Leave the map UUID blank to create a canonical seven-node curriculum.
   Reusing a map requires its nodes to have `shift_camp_day` values 1 through 7.
3. Enroll existing authenticated account UUIDs as participants or mentors.
   Re-enrollment updates the assigned role. Do not match tracker/application
   records to accounts by name. Applications and payments keep their existing
   workflow; no payments or applications are created by the camp API.
4. Participants sign in and complete the short resumable introduction. They can
   create a peer group and invite enrolled peers before camp starts. Staff fills
   unmatched places using self-reported availability/interests. Groups target
   three members; a group of two is an operational exception for the remainder.
5. Confirm everyone has peers and that assigned mentors can open the mobile
   support queue. Review scope on Day 1, the first release on Day 4, and final
   outcomes on Day 7. These reviews never gate later days.
6. Pilot all seven days before expanding. Day 7 presentations stay cohort-only.
   After the week, projects, feedback, and unfinished work remain accessible.

Participants use Today, Projects, and My Group. Existing learning paths remain
reachable from Today. Profile records real project history and check-ins,
without the legacy mock Ikigai scores. Guests retain their existing browsing.
No separate camp notification delivery is introduced; notifications remain
opt-in through settings.

## Interfaces and access

`shift_camp_action(action, cohort_id, payload)` is a typed mobile/staff RPC.
Its public wrapper is SECURITY INVOKER. Transactional operations live in the
non-exposed `shift_private` schema with explicit `auth.uid()` checks, staff
checks, and a cohort row lock. New tables have RLS and authenticated SELECT
only; mutations must use the RPC. Role metadata supplied by a user is never
used as authorization.

Existing classroom teams/memberships provide peer groups. Community projects,
project members, posts, and comments provide project ownership and feedback.
Restrictive policies guard camp rows against older permissive web policies.
Private screenshots use the `shift-camp` storage bucket and cohort/project
paths, a 5 MB limit, and JPEG/PNG/WebP types. Signed URLs expire after 10 minutes.

The snapshot includes private drafts only for project members or staff,
individual introductions/check-ins only for their author or staff, and group
messages only for their group or staff. Reports/help requests are private to
the requester and assigned staff. Hidden presentations and their comments are
also hidden through direct legacy table reads.

One update exists per project/day. A revision number detects stale shared edits.
Publishing does not complete anyone's individual milestones; participants
record their own progress. Image uploads precede publication and may leave an
unused private image if abandoned. Staff should review storage usage during
the pilot; deleting a screenshot from a draft removes its reference.

## Verification

Mobile: `pnpm test`, `pnpm typecheck:app`, and `npx expo export --platform web`.
The repositories contain existing unrelated TypeScript errors; the scoped
mobile app check excludes the older Deno/scraper scripts. Web staff files are
checked with ESLint; the guarded API has targeted Jest tests.

Verified locally: 34 mobile tests and scoped TypeScript checks; four guarded
staff API tests; iOS/Android/web bundle exports; the migration applied twice
against an empty synthetic Postgres fixture; and a mobile-sized browser
walkthrough covering messages, publication/editing, and failed-save recovery.
The full web TypeScript command still reports pre-existing errors outside the
camp files. No production migration or app publication was performed.

Set `SHIFT_TEST_DB_PASSWORD` and `SHIFT_TEST_DATABASE_URL` in your shell for a disposable local database. Do not use project credentials. The integration runner refuses non-local URLs and non-empty databases:

```sh
docker run -d --name passionseed-shift-test \
  -e POSTGRES_PASSWORD="$SHIFT_TEST_DB_PASSWORD" -p 127.0.0.1:55439:5432 postgres:15
docker exec passionseed-shift-test createdb -U postgres shift_test
node scripts/shift-camp/integration.mjs
```

It uses a minimal legacy-schema fixture and synthetic accounts. It verifies
solo/shared ownership, concurrent invitation acceptance/capacity, cross-cohort
privacy, drafts, revision conflicts, comments, private check-ins, staff reviews,
moderation, storage permissions, and isolation from legacy reads. It does not
replace staging verification against the full project's triggers and policies.

The mobile browser runner in `ps_app/scripts/shift-browser.mjs` uses Playwright,
a mock `https://shift.test` origin, and the same synthetic local SQL API:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://shift.test \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=shift-test-public-key \
  npx expo export --platform web --output-dir /tmp/shift-preview
# Serve that export with an SPA fallback, then run from ps_app:
node scripts/shift-browser.mjs
```

Native photo-library selection and large-text/screen-reader checks still need
an iOS/Android device pass before release.

## Pilot evaluation

Review the distribution of daily participation and feedback, projects actually
tested externally, unanswered presentations, unresolved requests, and mentor
workload. Use optional choice/capability/support check-ins alongside interviews.
Posting/completion totals alone do not establish SDT improvement. Capture mentor
effort and participant interviews during pilot operations before claiming scale.

Public showcases, standalone creator publishing, individual matching/DMs,
automated teammate matching, university-goal communities, and a general
opportunities directory are deferred.
