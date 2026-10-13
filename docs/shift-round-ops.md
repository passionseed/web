# SHIFT rounds: ops runbook (beta)

Spec: `ps_app/docs/plans/2026-10-13-shift-build-spec.md`. Contract deltas:
`supabase/SHIFT_ROUNDS_LANE_A_NOTES.md`. All staff actions go through `shift_round_admin_*` RPCs
(the web admin at `/admin/shift/rounds` calls them with the signed-in staff session). Never edit
`shift_round_*` tables by hand in production unless this runbook says so.

## 1. Roles

| Role | Meaning | Granted by |
|---|---|---|
| Global staff | Any web admin (`user_roles.role='admin'`), or a `shift_round_roles` row `role='staff', round_id=null`. Can do everything, in every round. | Users page (web admin), or another global staff (grant) |
| Round staff | `role='staff', round_id=<round>`. Can manage that round. | global staff |
| Mentor | `role='mentor', round_id=<round>`. Can review logs, decide summaries and revoke certificates in that round only. | global staff |

**Web admins are global SHIFT staff** (decision 2026-10-13). Every user with the web admin role has full
staff access on all rounds, with no separate grant. The ops page lists them under "Global SHIFT staff" marked
"Web admin"; they cannot be removed there (`shift_round_admin_set_role` answers `role_from_web_admin`).
To take their SHIFT access away, remove the web admin role on the Users page.

**Mentor scoping only applies to users who are not web admins.** A mentor who also has the web admin role
is global staff and sees every round. Give round-scoped mentors only a mentor role for their round.

Grant or remove a role (as global staff, from the ops page or SQL editor with your own session):

```sql
select public.shift_round_admin_set_role('mentor@example.com', 'mentor', '<round_id>', true);   -- grant
select public.shift_round_admin_set_role('mentor@example.com', 'mentor', '<round_id>', false);  -- remove
select public.shift_round_admin_set_role('lead@example.com', 'staff', null, true);              -- global staff
```

The user must already have signed in once (an `auth.users` row must exist), otherwise you get `user_not_found`.

## 2. Round lifecycle

1. **Create** (global staff): New round form. `starts_at` must be 00:00 Asia/Bangkok. Defaults: 14 days,
   48 h review, join cutoff day 7, nudge 19:00, invite-only, high_school track only (beta).
2. **Allowlist**: paste emails (lower-cased automatically) or import accepted `shift_applications` of a cohort
   (`shift_round_admin_allowlist_import`). Students match by user id or by sign-in email.
3. **Publish**: set status `published`. This emits `round_published`, which pushes the waitlist.
4. **Squads** (before day 1): create squads (name, mentor, optional Discord link), assign 3 entrants each.
   Each member gets a distinct ice-break question automatically. A 4th member is refused (`squad_full`).
5. **Policy lock**: after `starts_at` only titles, briefs, Discord URL, status and (while joining is open)
   `join_cutoff_day` can change. Everything else returns `policy_locked`.
6. **Extend** (staff, 1-7 days, reason required): moves `closes_at` and `review_ends_at` and resets
   `not_eligible` outcomes. It is refused once any certificate in the round has been issued (`extend_after_issue`).
7. **Close**: at 00:00 ICT on day `duration_days + 1`. Offline items created before close count if they
   arrive within 30 minutes (grace).
8. **Review window** (48 h): reject or accept logs and spot-check. After `review_ends_at` every review action returns `review_closed`.
9. **Issue**: the hourly `issue` job issues certificates at `review_ends_at` (snapshot, public id).
10. **Archive**: set status `archived` when done (it stays readable).

## 3. Review

- **Reject** (reason code + note): the student sees the reason. Missions may drop, and linked "change"
  logs become invalidated. A push goes to the student. Allowed only for `submitted` logs.
- **Accept**: only for `rejected` logs (reverses a mistaken rejection). Accepted is final.
- **Mark reviewed**: spot-check without changing status. Sample mode lists each entrant's oldest unreviewed interview and tester.
- Mentors only see and act on rounds they are assigned to (unless they are web admins, who are global staff).

## 4. Summaries and certificates

- Students submit summary revisions. Approve or reject (reason required) a **specific** revision. The previous approved
  revision stays public until a new one is approved. **Take down** (staff) removes the public summary.
- **Revoke** (reviewer, reason) hides the holder on the verification page. **Reinstate** (staff) restores the same snapshot.
  A tombstoned certificate (holder deleted their data) can never be reinstated.

## 5. Flags (`app_config`, ops page or `shift_round_admin_set_config`)

| Key | Default | Effect |
|---|---|---|
| `shift_round.tab_enabled` | false | Shows the SHIFT tabs to users without an entry |
| `shift_round.enrollment_enabled` | true | New joins (`enrollment_paused`) |
| `shift_round.submissions_enabled` | true | **Kill switch**: new logs and uploads refused (`submissions_paused`); replays still answered |
| `shift_round.transcription_enabled` | **false** | Voice transcription (Groq). Text entry always works |
| `shift_round.issuance_enabled` | true | Pause the issue job (it finishes `ok` with `paused`) |
| `shift_round.nudges_enabled` | false | Evening nudges. Turn on after app 1.4.0 is live |
| `shift_round.emergency_message` | null | `{"th":"...","en":"...","url":"https://..."}` banner |
| `shift_round.web_base_url` | `https://www.passionseed.org` | Base for verify URLs (`/c/<id>`) and the cert-health gate |

## 6. Jobs

Edge function `shift-round-jobs` (`supabase/functions/shift-round-jobs`), driven by pg_cron through
`shift_round_private.invoke_job(job)` and `pg_net`.

| Cron | Schedule (UTC) | Job |
|---|---|---|
| shift-round-issue | `5 * * * *` | issue certificates (gated by `/api/shift/cert-health`) |
| shift-round-pushes | `*/5 * * * *` | event pushes + Expo receipts |
| shift-round-nudges | `0 * * * *` | nudges for rounds whose nudge hour (ICT) is now |
| shift-round-media-scan | `*/10 * * * *` | strip EXIF from uploaded photos |
| shift-round-purge | `30 20 * * *` | retention, orphans, storage deletion queue |
| shift-round-watchdog | `15 1 * * *` | alert on stale jobs |

### Setup (per environment, never from a laptop against production without review)

```bash
# 1. secrets for the function
supabase secrets set SHIFT_ROUND_JOBS_SECRET=<random 32+ chars> SHIFT_ROUND_ALERT_WEBHOOK_URL=<discord staff webhook>
# 2. deploy WITHOUT gateway JWT verification (the function checks its own secret header first)
supabase functions deploy shift-round-jobs --no-verify-jwt
```

```sql
-- 3. Vault secrets read by shift_round_private.invoke_job
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/shift-round-jobs', 'shift_round_jobs_url');
select vault.create_secret('<same SHIFT_ROUND_JOBS_SECRET>', 'shift_round_jobs_secret');
-- 4. confirm the cron rows (created by migration 20261014090300 when pg_cron exists)
select jobname, schedule, active from cron.job where jobname like 'shift-round-%';
```

If pg_cron was not installed when the migration ran, re-run the final `do $$ ... $$` block of
`20261014090300_shift_rounds_jobs.sql` after enabling it (it is idempotent).

### Safe replay

Every job is idempotent. To re-run one now: `select shift_round_private.invoke_job('issue');` (as postgres).
Issuing twice never duplicates certificates. Pushes and nudges are deduplicated by the ledger. Deletions
re-list storage and finish only when the prefix is empty.

### Alerts (Discord staff channel)

- A job **failed**: check `select * from shift_round_job_runs order by started_at desc limit 20;`.
- **Due work but nothing processed**, e.g. Expo is down or all issue calls are failing: check `details.errors`.
- **cert-health gate failed**: the web verification page or renderer is down. Issuance waits; fix the web side, then replay `issue`.
- **Watchdog stale**: cron or pg_net stopped. Check `cron.job_run_details` and `net._http_response`.
- **Deletion gave up after 5 attempts**: see `shift_round_deletion_requests where status='failed'`. Fix storage, then
  `update shift_round_deletion_requests set attempts = 0 where id = ...` to retry.

## 7. Data deletion and retention

- Students: "Delete SHIFT data" (`shift_round_delete_my_data`) removes rows immediately and tombstones certificates.
  Storage removal is queued.
- Account deletion (`ps_app` `delete-user-account`) calls `shift_round_job_delete_user` first.
- Retention (daily): 12 months after close, logs, check-ins, cheers, squad rows, non-approved summaries and birth
  data are removed. Certificates and approved summaries stay. Audio files are deleted 30 days after review ends;
  transcripts stay in the log.

## 8. Local development

```bash
supabase db reset          # applies migrations + supabase/seed.sql (enables the test clock locally)
pnpm test:db               # pgTAP: supabase/tests/shift_round_*.test.sql
pnpm test:db:race          # two-connection race tests (local DB only)
SUPABASE_SERVICE_ROLE_KEY=<from supabase status> pnpm shift:seed --state=day7   # prints a login
deno test supabase/functions/shift-round-jobs/
```

The test clock (`shift_round.now`) is honoured only where `shift_round.allow_clock_override = 'on'`
**and** the connection was opened as `postgres` (`session_user`; pgTAP, race tests, SQL sessions).
API traffic (PostgREST connects as `authenticator`) always uses the real clock. Production must never set it.
