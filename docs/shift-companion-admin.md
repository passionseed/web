# SHIFT Companion staff

Open `/shift/companion/staff`. Admin navigation's Companion entry redirects
here, so cohort mentors can also use the workspace without broader admin access.

Admins (`user_roles.role = 'admin'`) see every cohort and can create one with a
name and start date. Mentors see only cohorts where their
`shift_camp_enrollments.role = 'mentor'`.

## Invites

- Issue one code for each participant. New codes have four unambiguous uppercase
  letters or digits, for example `7KFM`. Existing 12-character codes still work.
- Copy or share the code before closing its dialog. Raw codes are never saved
  in browser storage or returned by roster reads. The database stores SHA-256
  hashes and 30-day expiry times.
- Replace a lost, unclaimed code from its roster entry. Replacement revokes the
  previous code. The database also rejects replacements of claimed entries.
- The participant signs in to the mobile app, opens Connect, enters the code
  and mobile, and taps Connect. The mobile client's input validation must accept
  four characters. This repository contains the staff web UI and Supabase RPC,
  rather than the native companion client.

Code preview and claim requests are capped at five per account in 15 minutes,
and 30 per IP in 15 minutes. Anonymous preview has a five-request IP cap.
The counters are checked before lookup, including for valid codes.

## Private reads

The staff API is `/api/shift/companion/staff`:

- `GET`: staff cohorts and the admin flag.
- `GET ?cohort=<uuid>&view=roster`: email, mobile, claim time and pending invite
  metadata, through `shift_companion_action('staff_roster', ...)`.
- `GET ?cohort=<uuid>&view=updates`: today's updates in Bangkok time, through
  `shift_companion_action('staff_today', ...)`. Photos use private URLs that
  expire after five minutes; refresh the view to renew them.
- `POST`: `create_cohort` with `name` and `starts_on`, `issue_code` with
  `cohort_id`, or `reissue_code` with only `roster_id`.

Roster and update responses are separate. The update view includes no roster
contact fields or invite codes. Daily text, revisions and photos are readable
only by the author and cohort staff. RPC and storage policies enforce this
for direct mobile access too. Staff API responses use `private, no-store`.

## Rollout and verification

Apply `20261002090001_shift_companion_staff.sql` after the existing camp and
companion linking migrations. It replaces the companion function, adds staff
reads, tightens daily visibility and fixes hash/mobile variable-name collisions.
It preserves existing roster entries, hashes and old codes.

Run the focused checks:

```sh
pnpm exec jest app/api/shift/companion/staff/route.test.ts components/shift/companion/ShiftCompanionStaff.test.tsx app/api/admin/shift/camp/route.test.ts --runInBand --coverage=false
pnpm exec eslint app/api/shift/companion/staff components/shift/companion lib/shift/companion-contract.ts
```

After migration rollout, verify issuing, replacing and claiming with test
accounts. Check that a participant and another cohort's mentor cannot read
the roster or another author's daily text or photos.
