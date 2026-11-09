# Integration watch

Keeps the Instagram and LINE integrations from failing silently. A cron job on
the team server runs `watch.py` every 30 minutes. It:

1. Reads `GET /api/ops/integration-health`, which checks three things:
   - **`instagram_token`**: `META_PAGE_ACCESS_TOKEN` (an Instagram-Login token)
     is still valid. It dies when the account's password changes or after 60
     days unrefreshed; webhooks keep arriving, but replies, profile lookups and
     the backfill all fail.
   - **`instagram_webhook`**: an Instagram webhook event arrived in the last 18
     hours. Normal is about 90 a day, with at most 12 quiet hours overnight
     (Oct to Nov 2026).
   - **`line_webhook`**: LINE's own webhook test passes. LINE sends a signed
     request with no events to the endpoint set in the LINE console and reports
     what came back, which proves the token, the URL and the handler at once.
     LINE OA can be quiet for days, so silence is not checked.
2. Runs `GET /api/cron/meta-backfill`, which catches up Instagram DMs and
   comments the webhook missed. Nothing else schedules it.

A check failing two runs in a row (an hour) posts once to a staff channel; the
backfill gets four runs, since Meta rate limits come and go. Each posts again
when it recovers. Responses and alerts carry statuses and reasons only, never
message content or anyone's identity.

## Secrets

`OPS_CRON_SECRET` authorizes these two routes and nothing else, so the host
never holds `CRON_SECRET` (which also triggers parent emails and data
retention). It must be set in Vercel (production) and on the host.

On the host, in `~/passionseed/ops/` (`chmod 600`, never in the repo):

- `ops-secret`: the value of `OPS_CRON_SECRET`.
- `alert-webhook`: a post-only Discord webhook URL for the staff channel.

## Install or update

```bash
ops/integration-watch/deploy.sh <ssh-host>
ssh <ssh-host> tail -f ~/passionseed/ops/watch.log
```

To rotate the secret, set a new `OPS_CRON_SECRET` in Vercel, redeploy, then
replace `ops-secret` on the host.
