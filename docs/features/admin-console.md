# Admin console

`/admin` is the team's ops console. The overview answers "what needs us right
now" (work queues), "how are we doing" (KPIs with trends), and "what just
happened" (activity). The shell shows live queue counts as sidebar badges, and
Cmd+K searches records across the app. This page explains how the pieces fit
and how to extend them. UI rules live in
[`docs/ui-design-system.md`](../ui-design-system.md), section "Admin workspace (Dusk)".

## How it fits together

| Piece | File | Notes |
|---|---|---|
| Shared contract | `lib/admin/console.ts` | Client-safe types and the queue registry (`ADMIN_QUEUES`), plus `openQueues`, `navBadgeCounts`, `totalAttention`. |
| Overview loaders | `lib/admin/overview/index.ts` | `getAdminQueueSnapshot`, `getAdminKpis`, `getAdminActivity`, `getAdminShiftSnapshot`. Server only. |
| Queues | `lib/admin/overview/queues.ts` | One loader per `AdminQueueKey`. |
| KPIs | `lib/admin/overview/kpis.ts` | `KPI_DEFINITIONS`, cached for 5 minutes. |
| Activity | `lib/admin/overview/activity.ts` | Last 72 hours, merged from several tables. |
| SHIFT snapshot | `lib/admin/overview/shift.ts`, `cohort.ts`, `rounds.ts` | Static cohort facts plus the application funnel and the live `shift_rounds` row. |
| Helpers | `lib/admin/overview/time.ts`, `query.ts`, `db.ts` | Bangkok days and windows, timeouts, paging, head counts. |
| Live counts API | `app/api/admin/overview/counts/route.ts` | Polled by `AdminLiveCountsProvider` (`components/admin/console/live-counts.tsx`). |
| Search API | `app/api/admin/search/route.ts` | Logic in `lib/supabase/admin-search.ts`. |
| Admin gates | `utils/supabase/proxy.ts`, `lib/admin/requireAdmin.ts`, `lib/security/route-guards.ts` | See "Security" below. |

Data flow:

1. The overview server page checks the admin role, then calls the four
   loaders and passes the results to client components as props. It renders
   `SeedAdminLiveCounts` with the queue snapshot so the shell starts with
   fresh counts.
2. `AdminLiveCountsProvider` polls `GET /api/admin/overview/counts` every
   60 seconds while the tab is visible, and refetches on focus. After a
   mutation that clears queue items (reply sent, slip verified), call
   `refreshAdminCounts()` to refetch at once.
3. The command palette calls `GET /api/admin/search?q=&types=&limit=`.

### Rules every loader follows

- **Never throw.** Each loader resolves. A failed or slow part becomes `null`
  (a queue `count`, a KPI `value`, the SHIFT `funnel`) and the rest render.
  Sources run under `Promise.allSettled`.
- **Bounded queries.** Queue counts are head counts
  (`select("id", { count: "exact", head: true })`), so no rows travel. Every
  request carries `.abortSignal(timeoutSignal())` (2.5 s). Calls that take no
  signal go through `withTimeout`.
- **Bangkok days.** Every series and window is bucketed by the Bangkok
  calendar day with the helpers in `time.ts` (fixed +07:00, no daylight
  saving).
- **Which client.** Most tables are admin-only under RLS, so the loaders use
  the service role (`createAdminClient`), only behind an admin check. The
  `shift_round_admin_*` RPCs check `auth.uid()` and return `unauthenticated`
  under the service role, so `rounds.ts` calls them with the signed-in admin's
  session client (`utils/supabase/server.ts`).
- **Caching.** KPIs are the same for every admin, so `getAdminKpis` wraps
  them in `unstable_cache` (revalidate 300 s, tag `ADMIN_OVERVIEW_TAG`,
  `"admin-overview"`, in `lib/admin/overview/cache.ts`). Cached functions
  must not read cookies, which is fine because the service role needs none.
  After a write that moves revenue or seats, expire the tag so the next
  overview load recomputes:
  - In a route handler, call `expireAdminOverviewKpis()` from
    `lib/admin/overview/cache.ts`. It runs
    `revalidateTag(ADMIN_OVERVIEW_TAG, { expire: 0 })`: Next 16 requires the
    second argument, and `{ expire: 0 }` expires at once where `"max"` would
    serve the old number one more time. It never throws.
  - In a server action, call `updateTag(ADMIN_OVERVIEW_TAG)` from
    `next/cache`. Next 16 throws if `updateTag` runs in a route handler.
  - Callers today: trial slip review (`app/api/admin/trials/[id]`), SHIFT
    paid toggles (`app/api/admin/shift/applications`, single and bulk), and
    manual payments (`app/api/admin/track-payment`).

  Queue counts, activity and the SHIFT snapshot are not cached.
- **No migrations.** Everything reads the current production schema. KPIs
  page through timestamp-only selects (`readAllPages`, 1,000 rows a page, a
  hard cap of 20,000 rows per source, with a hint when the cap is hit).
  When a source outgrows that, move the aggregation into a SQL function.

## Recipes

### Add a queue

1. In `lib/admin/console.ts`, add the key to `AdminQueueKey` and an entry to
   `ADMIN_QUEUES`: an action label, one line on why it matters, the deep link,
   the sidebar item it badges (`navHref`), `urgency`, and `badge` (off for
   low-signal or system queues). No em dashes in the copy.
2. In `lib/admin/overview/queues.ts`, add a loader to `LOADERS`. The
   `Record<AdminQueueKey, QueueLoader>` type fails the build until you do.
   Use `headCount(ctx.db(), table)`, your filters,
   `.abortSignal(timeoutSignal())`, and wrap it in `readCount` so an error
   throws instead of reading as 0. Return a more specific `href` or a short
   `context` when it helps. Set `approximate: true` if the count is an upper
   bound.
3. Make the deep link open the tool already filtered (URL params, IDs only).
4. Call `refreshAdminCounts()` after the mutations that clear the queue.
5. Add a case to `lib/admin/__tests__/overview.test.ts`.

### Add a KPI

1. Add the key to `AdminKpiKey` in `lib/admin/console.ts`.
2. Add an entry to `KPI_DEFINITIONS` in `lib/admin/overview/kpis.ts`: label,
   format (`number`, `baht`, or `ratio` with `total`), a `hint` that says how
   the number is computed, the `href` of the most relevant tool, and `load`.
3. In `load`, read timestamps only with `readAllPages`, from
   `kpiWindows(window, SERIES_DAYS, now).since`. Bucket with
   `bucketByBangkokDay` (sums) or `distinctByBangkokDay` (people), then
   `windowTotals` or `windowDistinct` give `value`, `previous` and `series`.
   For several tables, use `readSources`: it only fails when every source
   fails and notes the missing ones in the hint.
4. Add a case to the KPI tests.

### Add a search entity

1. Add the type to `AdminSearchType` in `lib/admin/console.ts`.
2. In `lib/supabase/admin-search.ts`, add it to `SEARCH_TYPES` and
   `SEARCH_LABELS`, and add a `SEARCH_ENTITIES` entry:
   - `select`: an explicit column list. Never `*`, and never a secret or
     sensitive column (tokens, password hashes, legal names, birth dates,
     parent contacts). The privacy test checks every entity.
   - `text`, and optionally `email`, `phone` and `number`: the columns each
     query shape searches.
   - `toCandidate`: title (name, @handle or title), a subtitle with emails
     and phones masked (`maskEmail`, `maskPhone`), and an `href` with the
     record ID only. Set `needsAction` for records waiting on the team.
3. Make the destination page accept the ID in its URL.

Search details: the query is trimmed, NFC-normalized, stripped of a leading
`@`, and must be 2 to 64 characters. Its shape decides the plan: a UUID looks
up `id` everywhere, a full email matches email columns exactly, a phone-like
query also searches phone columns, and anything else runs ILIKE `%q%` over the
text columns. Input is escaped before it reaches ILIKE or a PostgREST `or()`
filter. Ranking: exact 100, prefix 80, word prefix 65, substring 40, plus 10
for records needing action and up to 10 for recency; at most 40 hits.
Each entity has a 1.5 s timeout, and a failed entity marks the response
`partial`.

## Deep links

Every queue tool keeps its filters in the URL, so the overview, the command
palette and a pasted link all open the same view. Links the console builds
(queue hrefs, palette record hits, overview rows) carry IDs and filter values
only, never names, emails or phones (see Security). Free text an admin types
into a tool's own search box (`q`, `search`) does stay in that tool's URL so
Back and sharing work, as the DM inbox already did; palette record search sends
its query to `/api/admin/search` and never writes it into a page URL. Parsers live in
`lib/admin/queue-tools/*.ts` (users and maps in `lib/supabase/admin-users.ts`
and `admin-maps.ts`); unknown values fall back to the default instead of
reaching SQL. `lib/admin/queue-tools/__tests__/queue-hrefs.test.ts` checks
that every `ADMIN_QUEUES` href parses to the filter its count uses.

| Tool | Params | Queue links (`ADMIN_QUEUES` in `lib/admin/console.ts`) |
|---|---|---|
| SHIFT applications `/admin/shift/applications` | `cohort` (cohort name such as `SHIFT[3]`; default is the cohort taking applications), `status` (`new`, `accepted`, `waitlist`, `declined`), `paid` (`paid`, `unpaid`, `not_in_discord` for paid seats with no `discord_joined_at`), `q` (names, handles, parent contact), `sort` (`newest`, `oldest`, `name`, `status`), `id` (application UUID to scroll to; switches cohort if needed) | `?status=new`, `?status=accepted&paid=unpaid`, `?paid=not_in_discord`. The overview adds `cohort=` for the focus cohort. |
| DM leads `/admin/dm-leads` | `turn=mine` (lead wrote last and the conversation is not converted, lost or spam, the same rule as the "รอเราตอบ" count), `status` (a lead status, or `open` for not converted, lost or spam, applied in SQL), `sort` (`newest`, `waiting`, `propensity`, `engagement`), `followup=due`, plus `bucket`, `stage`, `grade`, `intent`, `platform`, `search`, `link=pathlab`, `star=1`, `tag` | `?turn=mine&status=open&sort=waiting` (same rule as the `dm_awaiting_reply` count), `?followup=due` |
| LINE `/admin/line` | `filter=unanswered` (contact wrote last and still follows), `c` (contact UUID, the open chat), `q` (name search) | `?filter=unanswered` |
| IG comments `/admin/ig-comments` | `filter=unreplied` (`replied_at` is null, filtered in SQL), `filter=missed` (keyword comments from the last 7 days that never got a DM: `getCommentsMissedByDm(7)`), `stage` (`unknown`, `exploring`, `building`, `job_seeking`), `page` (300 comments a page; the missed list is not paged) | `?filter=missed` (same rule as the `ig_missed` count) |
| Meta webhooks `/admin/meta-webhooks` | `status` (`failed` matches failed and partial receipts; also `partial`, `processed`, `received`), `kind` (exact event kind such as `message.attachment`), `since` (`24h`, `7d`; bounds `received_at`) | `?status=failed&since=24h` (same window as the `meta_webhook_failures` count) |
| Talent `/admin/talent` | `filter=unverified`, `id` (signup UUID to scroll to; stays visible under the filter) | `?filter=unverified` |
| Experts `/admin/experts` | `status` (`pending` by default, `approved`, `rejected`, `claimed`, `all`), `page`, `id` (submission UUID to open) | `?status=pending` |
| Users `/admin/users` | `q`, `role` (`student`, `TA`, `instructor`, `admin`, `beta-tester`, `passion-seed-team`), `page`, `id` (user UUID to open), also `sort=oldest` and `pageSize` | none |
| Maps `/admin/maps` | `q` (`search` also works), `visibility` (`public`, `private`, `team`), `difficulty` (1 to 10), `page`, also `limit` | none |

## Security

Students are minors. Never send secrets (`join_token`, `claim_token`,
`password_hash`, `legal_name`, birth dates) to the browser, and never build
links that carry names, emails or phones: URLs land in browser history, logs
and analytics. (Known open item: a tool's free-text `q` is in its URL and the
palette's query is in a GET query string; moving both to POST bodies is a
product call.)

**S1: admin pages are gated in the proxy.** `app/admin/layout.tsx` calls
`requireAdmin()`, but a layout is not a boundary on its own: an RSC request
with a client-supplied `Next-Router-State-Tree` header can make Next render an
admin page without its layout. So `updateSession` in
`utils/supabase/proxy.ts` also checks `user_roles.role = 'admin'` for every
request to `/admin` and `/admin/*`, using the request's own client.
Non-admins are redirected to `/me` with the session cookies copied, and a
failed lookup fails closed. Signed-out requests to an admin path go to
`/login` even when a public rule (such as the `.md` suffix) would match. The
check matches `routingPathname()`, the percent-decoded path Next's router
uses, so `/%61dmin/users` and `/admin%2Fusers` are gated like `/admin/users`;
`request.nextUrl.pathname` keeps the escapes and must not be used for guards. Link-preview bots never reach the check: `proxy.ts`
rewrites them to `/link-preview` first. Pages and server actions that read
private data should still call `requireAdmin()` themselves. It is wrapped in
React `cache()`, so the layout and page checks in one request cost one query.
To verify on a preview: request an admin page as a signed-in non-admin with
`RSC: 1` and a forged router-state header, and expect a redirect to `/me`.

**S3: admin APIs are never publicly cached.** `proxy.ts` used to add
`Cache-Control: public, s-maxage=300` to every GET `/api/*` path ending in
`/search` or `/list`, admin routes included, so a CDN could serve one admin's
results to anyone requesting the same URL. Every GET under `/api/admin` now
gets `private, no-store`, checked before the public rules and against the
decoded routing path, so `/api/%61dmin/...` is covered too. The public
`/search` rule is an allowlist of the four music-catalogue searches, not a
suffix match. The search, counts and team-directions search routes also set
`private, no-store` themselves, and the search route never logs the query.

**Audit.** Role changes and profile edits (`PUT /api/admin/users`, action
`update_profile`) are written to `admin_activity_log`. A profile edit logs the
changed field names, plus old and new values for `username` and
`discord_uid`; full names stay out of the log.

**Manual payments are only as trusted as their recorder.** `funnel_events`
takes inserts from any signed-in user (its INSERT policy is
`WITH CHECK (true)`), so the revenue KPI and the CEO payment views count a
`payment_convert` row only when `metadata.recorded_by` is a current admin and
the amount is positive. Follow-up (needs a migration): restrict that INSERT
policy, or move manual payments to an admin-only table.

API routes use `requireAdmin` from `lib/security/route-guards.ts` (it returns
`{ ok }`; check it before creating the service-role client). Page code uses
`requireAdmin` from `lib/admin/requireAdmin.ts` (it redirects).

## Known limits

- `ig_missed` runs the IG comments page's own rule (`getCommentsMissedByDm(7)`),
  two small reads over the 7-day private-reply window. The bulk-reply card on
  that page uses a 30-day window on purpose (public replies have no 7-day
  limit), so its number can be larger than the queue's.
- Users, maps and experts: a page past the end (a stale link, or a list that
  shrank) is served as the last page for users and maps; the experts route
  returns the real total so the queue can offer page 1.
- LINE replies typed in LINE OA Manager are not stored, so "LINE chats to
  answer" can include chats already answered there.
- SHIFT revenue is paid seats times the list price; the pair discount is not
  recorded per application.
- Active learners count web activity only (map progress, PathLab activities,
  SHIFT round evidence and check-ins). The mobile app writes `user_events`,
  which is not included.
