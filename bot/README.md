# PassionSeed Discord bot

One long-running process with two modules, chosen by `BOT_MODULES`:

- **`shift-voice`** (default): records SHIFT students' voice participation in
  the SHIFT server (time in voice, mic open, screen share, camera, joins) and
  feeds `/admin/shift/voice`.
- **`projectseed`**: records who was in voice, reminds people about the hours
  they declared, and answers `/stats`. Linear: PS-213.

It is a gateway client, not a webhook or a serverless function. Discord sends
voice state only over the gateway, a WebSocket the bot keeps open, so it needs
a process that stays up (Railway, Fly, or any small VM). Vercel cannot host it.
shift-voice connects as `shift_voice_bot`, a database login that can call four
functions and read no table (`supabase/migrations/20261109200000_shift_voice_bot_role.sql`),
so the host never holds the service role key. projectseed still uses
`service_role`-only functions (`supabase/migrations/20260801000000_projectseed_bot_rpcs.sql`).

## Running

```bash
pnpm bot:dev        # local, reads .env.local
pnpm bot:start      # production
pnpm bot:register   # projectseed only: once, and after changing any slash command
```

Run one instance at a time. Two would both write rows for the same people.

## Deploying

Any host with Docker works. `bot/deploy.sh <ssh-host>` ships the committed bot
(not the whole web app), builds `bot/Dockerfile` on the host, replaces the
`passionseed-discord-bot` container (`--restart unless-stopped`, so it comes
back after a crash or reboot) and installs `bot/watchdog.py` in the host's
crontab. The previous image is kept for a rollback.

On the host, in `~/passionseed/discord-bot/` (`chmod 600`, never in the repo):

- `bot.env`: plain `KEY=value` lines without quotes, for the modules you run
  (see Environment).
- `alert-webhook`: a post-only Discord webhook URL for a staff channel. The
  watchdog posts once when the container has been stopped or unhealthy for 10
  minutes, and once when it is back.

```bash
bot/deploy.sh <ssh-host>                              # deploy or update
ssh <ssh-host> docker logs -f passionseed-discord-bot  # logs
ssh <ssh-host> docker stop passionseed-discord-bot     # stop
```

**Health.** The container is healthy while heartbeats reach the database
(Docker `HEALTHCHECK`). After 15 minutes without one the bot exits and Docker
starts it fresh.

**The database login.** The migration creates `shift_voice_bot` without a
password. To set or rotate one, generate a random password, run
`ALTER ROLE shift_voice_bot WITH LOGIN PASSWORD '<SCRAM-SHA-256 verifier>'`
with `supabase db query --linked` (a verifier, so the plain password never
reaches Postgres logs), and put
`postgresql://shift_voice_bot.<project ref>:<password>@<pooler host>:5432/postgres`
in `bot.env` as `SHIFT_VOICE_DATABASE_URL`. TLS is verified against
`bot/supabase-ca.pem`, Supabase's root CA: the pooler's certificate does not
chain to a public one.

## Environment

| Variable | Module | Notes |
|---|---|---|
| `BOT_MODULES` | all | Comma-separated: `shift-voice`, `projectseed`. Default `shift-voice` |
| `DISCORD_SHIFT_BOT_TOKEN` | shift-voice | Falls back to `DISCORD_BOT_TOKEN`, like the web app, so the bot that hands out SHIFT roles is the one watching voice |
| `DISCORD_SHIFT_GUILD_ID` | shift-voice | The SHIFT server |
| `SHIFT_VOICE_DATABASE_URL` | shift-voice | The `shift_voice_bot` login through the pooler (see Deploying) |
| `NEXT_PUBLIC_SUPABASE_URL` | projectseed | |
| `SUPABASE_SERVICE_ROLE_KEY` | projectseed | |
| `DISCORD_BOT_TOKEN` | projectseed | Regenerate in the Discord developer portal if it 401s |
| `DISCORD_GUILD_ID` | projectseed | |
| `DISCORD_REMINDER_CHANNEL_ID` | projectseed | Text channel the reminders post to |
| `PSEED_COHORT_SLUG` | projectseed | Defaults to `alumni-mvp` |
| `PSEED_VOICE_CHANNEL_IDS` | projectseed | Comma-separated. Empty means every voice channel |
| `PSEED_REMINDER_INTERVAL_MS` | projectseed | Defaults to 60000 |

Both modules in one process need the same token; with two different bots,
run two processes.

## Discord setup

Intents: `Guilds` and `Guild Voice States`, plus `Direct Messages` for
projectseed. None of them is privileged, so nothing needs switching on in the
developer portal.

Permissions: `View Channel` on the voice channels it should observe. It never
connects to voice. projectseed also needs `Send Messages` and
`Use Slash Commands` on the reminder channel.

## SHIFT voice participation

**Who is recorded.** Only students of a round in session (its 7 days include
today, Bangkok time): a non-declined application with a linked Discord
account, or a member holding the round's `SHIFT[n]` role who never linked.
Everyone else in the shared server is dropped before anything is written. The
roster refreshes every 5 minutes, so a student who links mid-session is picked
up, and a declined student's open row is closed.

**What is recorded.** `shift_voice_spans` gets one row per stretch of unchanged
state: channel, mic open (not self-muted, deafened or server-muted), screen
share (Go Live), camera, and whether the row began with entering voice. The
server's AFK channel counts as not in voice. No audio is received: "mic on"
means unmuted, not talking.

**Restarts.** A heartbeat moves `seen_at` forward on open rows once a minute,
only while the gateway is connected. On startup and on every fresh gateway
session the bot closes all open rows at their last heartbeat, then reopens rows
for whoever is in voice now. Time the bot did not see is never counted, and the
admin page ends every row at `seen_at`.

**Reading it.** `/admin/shift/voice`: per student, for a session, a day or the
whole round. Admins only.

## ProjectSeed: what it does

**Voice presence.** `voiceStateUpdate` opens and closes rows in
`pseed_voice_sessions`. Mute, deafen, stream and camera all fire the same event
with an unchanged channel, so only a channel change counts as presence.

On startup it closes every open session in the cohort and re-opens for whoever
is genuinely in voice right now. While the process is down no leave events
arrive, so an untouched open row would bank hours nobody was present for.
Shutdown closes sessions for the same reason. `pseed_voice_close_all` caps a
recovered session at four hours.

**Reminders.** Polls `pseed_due_reminders` once a minute — that RPC applies each
person's lead time and `notify_min_people`, and excludes anyone already in
`pseed_reminder_log`. Channel post first, then DMs. The log is written only
after a send resolves: a crash then resends next tick, and a duplicate ping is
better than a silently dropped one.

**`/stats`.** Ephemeral, guild-only. Someone else's hours are theirs to share,
so a public reply would turn `/stats @someone` into a way to put a quiet week on
display.

## Safeguarding constraints — not optional

`docs/project/PROJECTSEED-SAFEGUARDING.md` §3 permits bot DMs under three rules,
and the code implements all three. Do not relax them without changing that
policy first.

1. **Broadcast only, never conversational.** The bot never asks a question or
   invites a reply.
2. **Replies are refused, not read.** `dm-guard.ts` answers a DM once per hour
   with a fixed refusal. It never reads `message.content`, never stores it, and
   never surfaces it to a mentor.
3. **Anything that matters is also in the channel.** The channel post is the
   record; a DM is a convenience on top of it, never the only copy.

The reason is stated in the policy: a bot cannot groom anyone, but a Discord
bot's name and avatar are trivially copied by an ordinary account. If students
learn ProjectSeed sometimes DMs them, they lose the clean signal that a private
message claiming to be from us is always wrong.

Voice presence is behavioural data about minors. Retention and what parents are
told must be decided before this runs against a cohort containing any. For
SHIFT, `shift_voice_spans` is admin-only, never shown to students, and is
deleted with the application it belongs to. Retention: kept indefinitely for
now (decided 9 Nov 2026); revisit before the data is used for anything beyond
checking in on a student. What parents are told is still open.
