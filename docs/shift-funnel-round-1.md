# SHIFT Round 1 link kit and measurement

Round 1 remains ฿670, 15 seats, applications close October 3, 2026 (Bangkok).
Future-round prices are unchanged. SHIFT uses the existing payment account
`@161irjbq`; this does not establish whether `@passionseed` is an alias.

## Links to copy after deployment

| Source | SHIFT page | LINE account |
| --- | --- | --- |
| Reel 01 | https://passionseed.org/go/ig_reel_01 | https://passionseed.org/go/ig_reel_01?to=line |
| Reel 02 | https://passionseed.org/go/ig_reel_02 | https://passionseed.org/go/ig_reel_02?to=line |
| CampHub | https://passionseed.org/go/camphub | https://passionseed.org/go/camphub?to=line |
| LINE broadcast | https://passionseed.org/go/line_bc | https://passionseed.org/go/line_bc?to=line |

Replace the reel number for each post. Sources accept letters, digits, underscores,
and hyphens, up to 80 characters. Page links redirect to `/shift?utm_source=SOURCE`.
Direct UTM links also work, e.g. `/shift/1?utm_source=camphub`, but do not generate
a redirect click event. `/shift` currently remains the round gallery; `/shift/1`
is the Round 1 sales page.

LINE links count the outbound click. They do **not** tag a LINE contact or prove
that someone added the account. Cross-device chat-to-application attribution
requires sending the source-tagged page link in chat.

## What gets recorded

- `hackathon_events`: `shift_link_click` (source and destination),
  `shift_page_view` (source and page path), `shift_apply_click` (source and CTA),
  `shift_parent_share_click` (source and round). A share click is not proof a
  message was sent.
- `shift_applications.source`: last explicit source in the browser tab, carried
  across the gallery, round and form. A new tagged campaign replaces it.
  Untagged new submissions use `direct`. Legacy null sources remain
  unknown. Storage-blocked browsers rely on the explicit UTM links.
- `shift_applications.paid_at`: existing admin confirmation after checking the
  PromptPay slip. The public counter subtracts these rows from cohort capacity.
  Keep payment confirmations current. This is an informational counter, not an
  atomic seat reservation or an overselling guard.

The counter refreshes every minute and returns only aggregate availability.
If counting fails, it shows capacity without claiming how many seats remain.

No new migration is required. Production must already have the existing
`20260927000000_hackathon_events_analytics.sql` and
`20260928000000_shift_applications_paid.sql` migrations applied. Do not assume
this local implementation deployed those migrations.

## Sunday baseline

Run this read-only query with admin access. Keep results and exports containing
applicant details out of the public repository. These counts are aggregate
events, not a deduplicated person-by-person funnel; bots, previews, reloads, and
repeat applications can inflate them. Payment counts below are for applications
created in the window and reflect their current confirmation state.

```sql
WITH events AS (
  SELECT COALESCE(event_data->>'source', 'unknown') AS source,
    count(*) FILTER (WHERE event_type = 'shift_link_click'
      AND event_data->>'target' = 'shift') AS page_link_clicks,
    count(*) FILTER (WHERE event_type = 'shift_link_click'
      AND event_data->>'target' = 'line') AS line_link_clicks,
    count(*) FILTER (WHERE event_type = 'shift_page_view'
      AND page_path IN ('/shift', '/shift/1')) AS page_views,
    count(*) FILTER (WHERE event_type = 'shift_page_view'
      AND page_path = '/shift/apply') AS form_views
  FROM public.hackathon_events
  WHERE created_at >= '2026-09-28 00:00:00+07'
    AND created_at < '2026-10-04 00:00:00+07'
    AND event_type LIKE 'shift_%'
  GROUP BY 1
), applications AS (
  SELECT COALESCE(NULLIF(source, ''), 'unknown') AS source,
    count(*) AS applies,
    count(*) FILTER (WHERE paid_at IS NOT NULL) AS paid
  FROM public.shift_applications
  WHERE cohort = 'SHIFT[1]'
    AND created_at >= '2026-09-28 00:00:00+07'
    AND created_at < '2026-10-04 00:00:00+07'
  GROUP BY 1
)
SELECT COALESCE(e.source, a.source) AS source,
  COALESCE(page_link_clicks, 0) AS page_link_clicks,
  COALESCE(line_link_clicks, 0) AS line_link_clicks,
  COALESCE(page_views, 0) AS page_views,
  COALESCE(form_views, 0) AS form_views,
  COALESCE(applies, 0) AS applies,
  COALESCE(paid, 0) AS paid
FROM events e FULL JOIN applications a USING (source)
ORDER BY paid DESC, applies DESC;
```

Record reel reach, comments, and DMs sent from Instagram/auto-DM tooling next to
these counts. Those platforms are not configured by this change. Form views
currently include all rounds, so use them only as a site-level indicator.

Still separate work: FAQ input from actual conversations, the parent information
section, automated payment confirmation, paid-only Discord access, LINE tags and
reminders, the admin funnel dashboard, and campaign publishing. Decide future
pricing, the canonical LINE account, reply ownership/SLA, and ad spend before
the corresponding operations launch.

Parent sharing follows the [LINE share URL documentation](https://developers.line.biz/en/docs/line-social-plugins/install-guide/using-line-share-buttons/).
Discord changes are deferred and are not included in this batch.
