# SHIFT rounds, Lane A notes (contract deltas and deviations)

Source of truth: `ps_app/docs/plans/2026-10-13-shift-build-spec.md`. This file lists only where
Lane A's database differs from or adds to that spec. Migrations: `supabase/migrations/20261014090000`
through `20261014090400`.

Status: the SQL has been applied and its pgTAP tests run only on a **local vanilla PostgreSQL 18
stub harness** (Supabase-shaped auth/storage stubs). It has **not** been run on `supabase db reset`
(Docker was unavailable) and never against any remote database.

## Envelope (unchanged)

Every RPC returns `{"ok":true,"data":{...},"request_id":uuid}` or
`{"ok":false,"error":{"code","category","field","retry_after","details"},"request_id":uuid}`.
Job RPCs (service_role) use the same envelope.

## Decisions applied (user, 2026-10-13)

- `app_config` `shift_round.transcription_enabled` is seeded **false** (spec said true).
- Rounds default to 14 days; squads use the spec default; mentors get the web admin through
  `user_roles` admin, and `shift_round_roles` still scopes them (see "Admin access").
- Certificate URLs are built from `app_config` `shift_round.web_base_url` + `/c/<public_id>`; nothing hardcodes the domain in SQL.

## Deviations from the spec

1. **https regex**: Postgres caps regex repeat counts at 255, so `^https://[^[:space:]]{4,490}$` errors at
   runtime. Lane A uses `shift_round_private.is_https_url(t)` (`^https://[^[:space:]]+$` and length
   12..498), which accepts the same strings. The `summary_revisions.demo_url` CHECK uses the same rule.
   Clients (zod) may keep the original regex in JS, where it is valid.
2. **Policy helpers answer only for the caller**: `is_global_staff/is_staff/can_review(round, uid)` return
   false unless `uid = auth.uid()` (no probing other users' roles). Internal checks use the
   non-granted `has_round_role`.
3. **Extra private helper** `shift_round_private.can_delete_media(name)` backs the storage delete policy.
   Restrictive guard policies on `storage.objects` protect the bucket from broader legacy policies; anon
   gets a separate helper-free guard, so anon needs no grants on `shift_round_private`.
4. **Rate limits** for RPCs without a natural counter use a private table `shift_round_private.rate_hits`
   (counts successful calls only, so failed calls make no writes).
5. **Extensions are tracked separately**: `shift_rounds.duration_days` stays as created; extensions add to
   `extended_days` and move `closes_at`. "Effective days" = `duration_days + extended_days` drives
   check-in windows, nudges and the `round.duration_days` value returned by `shift_round_home`.
6. **Nudge ledger** has two extra columns: `expo_token` (so a `DeviceNotRegistered` receipt clears
   `profiles.expo_push_token` only when it is unchanged) and `params` (copy params, reused on retry).
7. **Extra job RPC** `shift_round_job_enqueue_orphans(p_names text[])` queues orphan objects
   (reason `orphan`, user_id is the zero uuid).
8. `shift_round_squad` returns a **success** envelope with `state: "waiting"` (or `"none"` after the round
   finishes) when no squad is assigned, rather than the `squad_not_assigned` error, because the spec says
   data must still return the waiting state. `squad_not_assigned` is still used by `set_icebreaker` and `send_cheer`.
9. `withdraw_evidence` `affected` items are `{mission, type, have_before, have_after}` (adds `type`, because
   mission 2 has two parts).
10. Admin `reject/accept` return `{missions, dropped:[mission keys], affected, invalidated_changes}`.
11. **Mission keys, not numbers**: `mission` fields in evidence and feed items are mission keys (`first_contact`, ...).
    `mission_counts` adds a `counts` object (raw totals) beside the spec fields.
12. `profiles.preferred_language` defaults to `'en'` in the existing schema, so push `lang` is that value
    (the spec's "default th" applies only when it is null or empty).

## Contract confirmations and additions for other lanes

### Lane B (web)
- `shift_round_certificate_public(p_public_id text)` returns data
  `{status:'valid'|'revoked', tombstone, round_number, snapshot, revoked_at, render_version, verify_url, summary}`.
  `round_number` is top-level for every state. For **revoked** (not tombstoned) the snapshot has
  `holder`, `counts` and `track` **removed**. For **tombstone** the snapshot is `null`. Malformed or unknown ids
  return `certificate_not_found`. Ids are upper-cased before lookup.
- `shift_round_log_certificate_visit(p_public_id text, p_ref text default null)`: `p_ref` is normalized to
  `share|qr|link|other|null`. It silently stops logging after 500 visits per certificate per ICT day.
- `shift_round_transcription_check(p_path text)` returns `{max_seconds:180, language_hint}`. Error codes, in check order:
  `unauthenticated`, `transcription_paused`, `media_not_owned` (bad path, not your folder, or no entry in that round),
  `media_missing` (no storage object), `round_finished`, `rate_limited` (20/hour, `retry_after`).
- `transcription_enabled` is seeded **false**.

### Lane C (app)
- RPC names and argument names are exactly as in spec 3.2. `shift_round_delete_my_data(p_round_id uuid default null, p_confirm text)`.
- Receipt matches 3.7. A replay returns `replayed:true` and reconstructs `newly_completed` from events.
- `shift_round_home.round.duration_days` = effective days, including extensions.
- `joinable[].join_by` = timestamptz when joining closes (`starts_at + join_cutoff_day days`).
  `can_join` does not account for the `enrollment_enabled` flag; read `flags.enrollment_enabled`.

### Lane D (web admin)
- `shift_round_admin_entries(p_round_id)` returns `{entries, squads, squad_size}`.
  - `squads`: `[{id, name, mentor_user_id, mentor_display_name, discord_url, member_entry_ids}]`, including empty squads.
  - Each `entries[].squad` (and the review-queue `squad`): `{id, name, icebreaker_question:{id, th, en}, icebreaker_answer}` or null.
- **New** `shift_round_admin_roles(p_round_id uuid default null)` returns
  `{roles:[{user_id, email, display_name, role, round_id}]}`: global staff plus that round's staff/mentors.
  It needs round staff (or global staff when `p_round_id` is null).
- `shift_round_admin_allowlist(p_round_id, p_add, p_remove)` returns `{count, entries:[{email, user_id, source, created_at}], emails:[...]}`.
  Call it with empty arrays to read the list.
- `shift_round_admin_set_role(p_email, p_role, p_round_id, p_grant)`: a global staff member cannot remove their own global staff role.
- `shift_round_admin_upsert_squad` returns `wrong_round` when `p_squad_id` is not in `p_round_id`.
- `shift_round_admin_update_round`: status transitions are draft->published|archived, published<->archived.
  `join_cutoff_day` can change after start only while joining is still open, and never below today's day.

### Admin access (request 4)
**Not changed.** Lane A did not make every `user_roles` admin act as global staff. The user decided that
mentors get the `user_roles` admin role for the beta. If admins were global staff, every mentor would be
global staff and round scoping would be lost. Instead:
- The migration gives every *existing* web admin global SHIFT staff once (bootstrap).
- Later admins get `forbidden` with `details.rule = "no_shift_round_role"` from `shift_round_admin_rounds`.
  Lane D should show "Ask a SHIFT global staff member to grant you access".
- A global staff member grants access with `shift_round_admin_set_role(email, 'staff', null, true)` (global staff),
  `(email, 'staff', round_id, true)` (round staff) or `(email, 'mentor', round_id, true)` (mentor).
  This is documented in `docs/shift-round-ops.md`.

## Verification status (2026-10-13)

What was executed, all on a throwaway **local PostgreSQL 18** cluster (`/tmp`) with Supabase-shaped
stubs (auth.users/auth.uid(), storage.buckets/objects with a broad legacy read policy, profiles,
user_roles, shift_applications, stubbed legacy camp/companion functions) and pgTAP 1.3.5 built from source:
- All 5 migrations apply cleanly in order.
- 16 pgTAP files, **389/389 assertions pass**.
- `supabase/tests/race/shift_round_race.ts`, **9/9 pass**. It found a real bug: withdraw did not re-check for a
  certificate after taking the locks. That is fixed, and the API is unchanged.
- `deno test supabase/functions/shift-round-jobs/`, **10/10 pass**. `deno check` is clean for `ps_app` `delete-user-account`.

What was **not** executed:
- `supabase db reset` / `supabase test db`, because Docker was not running. The real Supabase schema differs from
  the stubs (real `handle_new_user` trigger, real storage triggers, real legacy camp tables), so run
  `pnpm test:db` once Docker is available.
- `pnpm shift:seed` (needs a local stack). It is only type-checked.
- Nothing has been deployed: no edge function, no Vault secrets, no cron. Nothing has touched staging or production.

Known risks to check on the first real `supabase test db`:
- Newer Supabase storage images may block direct `DELETE` on `storage.objects` with a trigger. Only
  `shift_round_storage.test.sql` deletes rows directly (the app and jobs use the Storage API).
- `shift_round_legacy.test.sql` creates its closed cohort through the real `camp_action_v1('create_cohort')`
  as a temporary `user_roles` admin when a direct insert fails. That path has not run against the real schema.
- `supabase/seed.sql` uses `alter database postgres set shift_round.allow_clock_override = 'on'`. The pgTAP files
  do not depend on it, because they set the flag per transaction.
- Deploy `shift-round-jobs` with `--no-verify-jwt`. pg_net calls it with the secret header, not a JWT.
