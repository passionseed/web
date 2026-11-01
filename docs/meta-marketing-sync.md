# Meta marketing sync

A read-only daily copy of Instagram organic insights and Meta Ads results in
Supabase, shown at [`/admin/marketing`](../app/admin/marketing/page.tsx) next to
SHIFT applications and paid seats.

The sync only ever sends `GET` requests to Meta. It never sends messages,
edits posts, or changes ads, budgets or campaigns, and the tokens below should
carry read permissions only.

## What it stores

| Table | One row per | What |
|---|---|---|
| `ig_account_daily` | account, day | reach, views, profile visits, link taps, accounts engaged, interactions, follows, unfollows; follower total on days a sync ran |
| `ig_media` | post or Reel | type, caption, permalink, posted time |
| `ig_media_insights` | post, sync day | lifetime reach, views, likes, comments, saves, shares, interactions, follows, profile visits, Reel watch time |
| `meta_ads` | ad | ad name, ad set and campaign ids, destination URLs, `url_tags`, parsed `utm_*` |
| `meta_ads_daily` | ad, day | spend, impressions, reach, clicks, link clicks, CTR, CPC, landing page views, leads, InitiateCheckout, messaging conversations, and every action Meta reported |
| `meta_marketing_sync_runs` | source, run | status and error code, shown on the admin page |

Every write is an upsert on the natural key, so reruns and overlapping
backfills replace rows instead of duplicating them. Stories are not synced:
the `/media` edge does not list them.

## How it runs

- **Daily:** Vercel cron calls `/api/cron/meta-marketing-sync` at 01:15 UTC
  (08:15 Bangkok). It re-reads the last 3 complete days, because Meta revises
  insights for about 48 hours, and refreshes lifetime insights for posts from
  the last 90 days.
- **Manual backfill:** the same route with `since`, `until` and optionally
  `sources` (see below). One request covers up to 93 days.
- A source whose env vars are missing is skipped, not failed, so nothing
  breaks before the tokens exist.

Code: [`lib/meta/marketing/`](../lib/meta/marketing/) (fetch, parse, sync,
report) and [`lib/supabase/meta-marketing.ts`](../lib/supabase/meta-marketing.ts)
(writes).

## Setup

### 1. Apply the migration

```bash
supabase db push
```

This applies `20261022130000_meta_marketing_sync.sql` to production. It only
creates new tables (RLS on, service role only).

### 2. Instagram insights permission

Instagram insights use the existing Instagram-Login token (`IGAA...`) on
`graph.instagram.com`. It needs two permissions:

- `instagram_business_basic` (the DM setup already has this)
- `instagram_business_manage_insights` (probably missing: the DM and comment
  features never asked for it)

To check: after deploying, open `/admin/marketing`. If the Instagram cards
show `ig_insights_permission_missing`, the token lacks the insights
permission.

To add it, pick one:

**A. Reissue the existing token (simplest).**

1. [developers.facebook.com/apps](https://developers.facebook.com/apps), open the PassionSeed app.
2. Use cases, the Instagram use case ("Manage messaging & content on Instagram"), Customize, Permissions: add `instagram_business_manage_insights`.
3. API setup with Instagram login, "Generate access tokens": generate a token for `passion_seed.th` and approve the new permission.
4. In Vercel (Project, Settings, Environment Variables), replace `META_PAGE_ACCESS_TOKEN` with the new token for Production, then redeploy.

The new token keeps the messaging and comment permissions the app already
has, so DMs and comment replies keep working.

**B. A separate read-only token.** Issue a second Instagram-Login token for
`passion_seed.th` with only `instagram_business_basic` and
`instagram_business_manage_insights`, and set it as
`META_IG_INSIGHTS_ACCESS_TOKEN`. The sync prefers it over
`META_PAGE_ACCESS_TOKEN` and leaves the DM token untouched.

The app needs only standard access for this, because `passion_seed.th` is the
app's own account. If the app is in Live mode and Meta refuses, check that the
account still has a role on the app (App roles, Instagram testers).

Instagram-Login tokens last 60 days. When one expires, the admin page shows
`token_expired`.

### 3. Meta Ads token

The Instagram token cannot read ad accounts. Ads need a separate token on
`graph.facebook.com` with `ads_read` only:

1. In the Meta app, add the Marketing API use case ("Measure ad performance data with Marketing API") if it is not there yet.
2. [business.facebook.com/settings](https://business.facebook.com/settings), Users, System users: add a system user (for example `web-reporting`) with the Employee role.
3. Assign assets, Ad accounts: pick the SHIFT ad account and grant **View performance** only. Leave "Manage campaigns" off.
4. Generate new token: choose the PassionSeed app, expiry Never, and tick **`ads_read` only**.
5. In Vercel, set `META_ADS_ACCESS_TOKEN` to that token and `META_AD_ACCOUNT_ID` to the ad account id (the `act=` number in the Ads Manager URL; the `act_` prefix is optional). Redeploy.

### 4. Env vars

| Variable | Needed for | Value |
|---|---|---|
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram | already set for DMs |
| `META_PAGE_ACCESS_TOKEN` | Instagram (fallback) | already set; needs `instagram_business_manage_insights` unless the next one is set |
| `META_IG_INSIGHTS_ACCESS_TOKEN` | Instagram (optional) | read-only Instagram-Login token, option B above |
| `META_ADS_ACCESS_TOKEN` | Meta Ads | system-user token with `ads_read` |
| `META_AD_ACCOUNT_ID` | Meta Ads | ad account id |
| `CRON_SECRET` | the route | already set |

## First backfill

Run these against the deployed site after the migration, the env vars and the
deploy are in place. Export the Vercel `CRON_SECRET` in your shell first.

Ads (one request covers up to 93 days):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://passionseed.org/api/cron/meta-marketing-sync?since=2026-07-24&until=2026-10-21&sources=meta_ads"
```

Instagram posts published since a day (one snapshot of lifetime insights):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://passionseed.org/api/cron/meta-marketing-sync?since=2026-07-24&until=2026-10-21&sources=ig_media"
```

Instagram account days take two calls per day, so go a month at a time:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://passionseed.org/api/cron/meta-marketing-sync?since=2026-09-22&until=2026-10-21&sources=ig_account"
```

Each response lists every source with `status`, `errorCode` and
`rowsUpserted`. If a source answers `partial` with `resumeFrom`, run the same
command again with `since` set to that day. `rate_limited` means wait an hour
and run it again.

## Reading the numbers

- **Seats by source.** `shift_applications.source` records `utm_source` only.
  Every SHIFT ad today uses `utm_source=meta_ads` (see
  `components/shift/poster/grid/adCopy.ts`), so paid seats are attributed to
  Meta Ads as a whole, not to one ad. To compare ads, give each ad its own
  `utm_source` (for example a `/go/<source>` link), or record `utm_campaign`
  and `utm_content` on applications too.
- Applications count when they were created in the range; paid seats are the
  ones with `paid_at` set.
- Daily reach is unique per day, so summing days counts a person once per day.
- Account days use Bangkok midnight boundaries; Meta may round them to its own
  reporting day.
- Post insights are lifetime totals as of the sync day. A backfill takes one
  snapshot today; it cannot recreate past snapshots.
- `follows_and_unfollows` is only reported for accounts with 100 or more
  followers; when Meta omits it, follows stay empty and the rest still syncs.
