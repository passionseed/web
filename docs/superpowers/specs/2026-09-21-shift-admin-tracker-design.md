# SHIFT Admin Tracker — Design

Date: 2026-09-21
Status: Approved (auto mode)

## Goal

An admin page at `/admin/shift` for tracking SHIFT cohort kids: name, Instagram
handle, Discord handle, plus a freeform dated log of weekly notes per kid.

## Decisions (from brainstorming)

- Kids are added **manually** by an admin (no app-account linking, no Google Form
  import). The cohort is ~9 seats; import can come later if needed.
- Weekly notes are a **freeform dated log**: unlimited entries per kid, each with
  a week label, body, author, and timestamp.
- Access is **admin role only** (`user_roles.role = 'admin'`), same gate as the
  rest of the `/admin` console.
- Data model: **two tables + REST routes**, following the existing
  `AdminBetaRegistrations` pattern.

## Data model

One new additive, idempotent migration in `supabase/migrations/`
(`YYYYMMDDHHMMSS_create_shift_tracker.sql`), applied directly to production per
repo convention. All statements use `IF NOT EXISTS` / `DROP POLICY IF EXISTS`.

### `public.shift_students`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `default gen_random_uuid()` |
| `full_name` | text | not null |
| `ig_handle` | text | nullable |
| `discord_handle` | text | nullable |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()`, maintained by `public.handle_updated_at()` trigger |

### `public.shift_student_notes`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | `default gen_random_uuid()` |
| `student_id` | uuid | not null, FK → `shift_students(id)` `on delete cascade` |
| `week_label` | text | not null, e.g. `"Week 1"` |
| `body` | text | not null |
| `created_by` | uuid | nullable, references `auth.users(id)`; null if the author account is removed |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()`, maintained by trigger |

Indexes: `shift_student_notes(student_id, created_at desc)`.

### RLS

Enable RLS on both tables. One policy per table, copied from the pattern in
`supabase/migrations/20260412000000_admin_submission_comments.sql`:

```sql
CREATE POLICY "Admins can manage shift students"
  ON public.shift_students FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));
```

(same shape for `shift_student_notes`). Grant `SELECT, INSERT, UPDATE, DELETE` to
`service_role` on both tables. API routes use the service-role client, so RLS is
defense-in-depth.

## API routes

All under `app/api/admin/shift/`, each guarded by `requireAdmin` from
`lib/security/route-guards.ts` (returns 401/403 JSON). DB work uses the SSR
client handed back by `requireAdmin` (`admin.value.supabase`), the same pattern
as `app/api/admin/users/roles/route.ts` — the admin RLS policy already grants
full access, so no service-role client is needed. Validation failures return
400 `{ error }`; unexpected failures return 500 `{ error }` via
`safeServerError` (no internals leaked to the client).

| Route | Methods | Behavior |
| --- | --- | --- |
| `/api/admin/shift/students` | GET | List all kids ordered by `created_at`, each with `note_count` and `latest_note` (body, week_label, created_at) |
| `/api/admin/shift/students` | POST | Add a kid. Body: `{ full_name, ig_handle?, discord_handle? }`. `full_name` required, non-empty after trim. Handles trimmed; leading `@` stripped from `ig_handle` |
| `/api/admin/shift/students/[id]` | PATCH | Edit `full_name` / `ig_handle` / `discord_handle` (partial updates allowed) |
| `/api/admin/shift/students/[id]` | DELETE | Remove kid; notes cascade |
| `/api/admin/shift/students/[id]/notes` | GET | List the kid's notes, newest first |
| `/api/admin/shift/students/[id]/notes` | POST | Add a note. Body: `{ week_label, body }`, both required non-empty. `created_by` set to the authed admin's user id |
| `/api/admin/shift/notes/[id]` | PATCH | Edit `week_label` / `body` |
| `/api/admin/shift/notes/[id]` | DELETE | Delete the note |

## UI

### `app/admin/shift/page.tsx`

Thin server component matching `app/admin/beta/page.tsx`:
`export const dynamic = "force-dynamic"`, heading "SHIFT Tracker", short
description, renders `<AdminShiftTracker />`. The admin gate comes free from
`app/admin/layout.tsx` (`requireAdmin()` redirect). No proxy changes needed
(`/admin` is not a public prefix, so unauthenticated users are already bounced to
`/login`).

### `components/admin/AdminShiftTracker.tsx` (`"use client"`)

Follows `AdminBetaRegistrations.tsx` conventions (shadcn `Card`/`Table`/`Badge`/
`Input`/`Button`, `lucide-react` icons, `date-fns` for dates):

- **Stats row** (`grid gap-4 md:grid-cols-3`): total kids, notes logged in the
  current week, kids with no note in the current week. "Current week" = the week
  label produced by the helper below.
- **Add kid** — inline card with three inputs (name, IG, Discord) + submit.
- **Kids table** — columns: Name, IG (`@handle`, links to
  `https://instagram.com/<handle>`), Discord, Last note (week label + relative
  date), Notes count, actions (edit kid inline, delete kid with confirm).
- **Row expand** — clicking a row renders `<ShiftStudentNotesPanel />`
  (`components/admin/ShiftStudentNotesPanel.tsx`) beneath it: a timeline of
  entries (week-label `Badge`, date, body) plus an add-note box (week label input
  prefilled by the helper, textarea, submit). Each note has edit (inline textarea)
  and delete (confirm) controls.

### Week-label helper

`lib/shift/week-label.ts`: `getShiftWeekLabel(date = new Date())` returns
`Week N` where N = `floor((date - SHIFT_COHORT.startDate) / 7 days) + 1`, clamped
to a minimum of 1. Unit-tested in `lib/shift/__tests__/week-label.test.ts`
(Jest, matching the existing `lib/content/__tests__/` convention). "Notes logged
this week" in the stats row compares against this label.

### Nav

Add `{ href: "/admin/shift", label: "SHIFT", icon: Rocket }` to
`ADMIN_NAV_ITEMS` in `components/admin/AdminNav.tsx`.

## Error handling

- API: 400 on invalid input, 401/403 from `requireAdmin`, 500 otherwise; client
  surfaces errors with `toast` from `sonner`, as in `AIAgentManagement.tsx`.
- UI: table shows an empty state ("No kids added yet") and per-request loading
  states on buttons.

## Testing

- Jest unit tests for `getShiftWeekLabel` (before cohort start, during week 1,
  later weeks, exact 7-day boundary).
- Manual end-to-end verification on the dev server: add kid → add note → edit →
  delete; confirm non-admin gets 403/redirect.

## Out of scope

- Import from the Google Form responses sheet.
- Linking kids to PassionSeed app accounts / `profiles.discord_uid`.
- Mentor (`passion-seed-team`) access.
- Push/Discord notifications when a note is logged.
