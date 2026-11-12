# PassionSeed Discord bot

One long-running process with three modules, chosen by `BOT_MODULES`:

- **`shift-voice`** (default): records SHIFT students' voice participation in
  the SHIFT server (time in voice, mic open, screen share, camera, joins) and
  feeds `/admin/shift/voice`.
- **`shift-quests`**: SHIFT High quests in the SHIFT server: quests, a private
  progress journal, group help, human review, Passioncoin and redemption.
  Slash commands only; it records nothing passively. See
  [`docs/features/shift-high-quests.md`](../docs/features/shift-high-quests.md).
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
pnpm bot:register   # projectseed and shift-quests: once, and after changing any slash command
pnpm bot:smoke      # loads every module and draws a tiny island: no Discord, no database
```

Run one instance at a time. Two would both write rows for the same people.

**Registering never starts a bot.** `--register-commands` makes its REST calls
to Discord and exits without logging in to the gateway, so it is safe while the
deployed bot runs. (A second gateway client would close and reopen every open
voice row of the running one.) On the host it uses the container's own
environment:

```bash
ssh <ssh-host> docker exec passionseed-discord-bot node --import tsx bot/src/index.ts --register-commands
```

**projectseed must never register in the SHIFT server.** Its registration
(`registerCommands` in `bot/src/commands.ts`) replaces every command the bot's
Discord application has in `DISCORD_GUILD_ID` with its own list (`/stats`).
With one token for both, as one process requires, a `DISCORD_GUILD_ID` equal
to `DISCORD_SHIFT_GUILD_ID` would delete every SHIFT High command. Keep the two
IDs different, and check them before registering with `projectseed` in
`BOT_MODULES`. The shift-quests registration only touches its own commands.

## Deploying

Any host with Docker works. `bot/deploy.sh` ships the committed bot (not the
whole web app), builds `bot/Dockerfile` on the host, checks the new image,
swaps the `passionseed-discord-bot` container (`--restart unless-stopped`, so it
comes back after a crash or reboot) and installs `bot/watchdog.py` in the
host's crontab.

On the host, in `~/passionseed/discord-bot/` (`chmod 600`, never in the repo):

- `bot.env`: plain `KEY=value` lines without quotes, for the modules you run
  (see Environment).
- `alert-webhook`: a post-only Discord webhook URL for a staff channel. The
  watchdog posts once when the container has been stopped or unhealthy for 10
  minutes, and once when it is back.

```bash
bot/deploy.sh <ssh-host>                              # deploy HEAD
bot/deploy.sh <ssh-host> --rollback                   # run the previous image again
ssh <ssh-host> docker logs -f passionseed-discord-bot  # logs
ssh <ssh-host> docker stop passionseed-discord-bot     # stop
```

A deploy stops at the first step that fails:

1. **Stage.** Only `bot/`, the two lib files it imports and `tsconfig.json`,
   from HEAD (uncommitted bot changes refuse), plus a `package.json` pinned to
   the versions in `node_modules` here. The pinned packages are `DEPS` at the
   top of `bot/deploy.sh`, the one list; a package missing from `node_modules`
   refuses.
2. **Build** on the host, tagged with the revision only.
3. **Smoke check.** The new image runs once with `--network none` and
   `bot.env`: `bot/src/smoke.ts --env` loads every module, validates the
   environment the way startup does and draws a tiny island. On failure the
   deploy prints the revision, "The old container (<rev>) is still running;
   nothing changed", the last lines and the fix, and removes the new image.
   `pnpm bot:smoke` runs the same check here, without the env file.
4. **Swap.** The old container stops (30 seconds to close open voice rows, so
   two bots never overlap), the new one starts, and the deploy waits up to 4
   minutes for Docker to report it healthy. If it turns unhealthy, restarts or
   is still not healthy, the deploy prints its last log lines, stops it and
   starts the old image again. With `projectseed` alone no module writes the
   health file, so it waits for a minute without a restart instead.
5. **Keep.** The healthy image is tagged `latest` and the one it replaced
   `previous`; older images are removed.

**Rollback.** `bot/deploy.sh <ssh-host> --rollback` stops the running container,
starts the `previous` image and swaps the `latest` and `previous` tags, so
running it again returns to the image you rolled back from. Database migrations
are additive, so an older bot runs against a newer schema.

**Release order** when a release has migrations: `supabase db push`, then
`bot/deploy.sh`, then the register step. The migration rules are in
[`docs/features/shift-high-quests.md`](../docs/features/shift-high-quests.md);
the SHIFT High island rollout, step by step, in
[`docs/runbooks/shift-high-island-rollout.md`](../docs/runbooks/shift-high-island-rollout.md).
A bot newer than its database does not start: with `shift-quests` enabled,
startup reads `shift_quest_schema_version()` before any module runs, and when
it is below `REQUIRED_SCHEMA` (`bot/src/quests/index.ts`, now 2) the bot exits
with a message naming the migration to apply, so the swap fails and the old
container comes back.

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

The SHIFT High logins (`shift_quest_bot` for this bot, `shift_quest_web` for
the website) are also created without LOGIN. Give them LOGIN and a password
with `pnpm shift:role-passwords` (`scripts/shift-quests-set-role-passwords.ts`)
from your own machine: it reads an admin URL and the new passwords from the
shell (`SHIFT_QUEST_ADMIN_DATABASE_URL`, `SHIFT_QUEST_BOT_PASSWORD`,
`SHIFT_QUEST_WEB_PASSWORD`), sends Postgres a SCRAM-SHA-256 verifier, prints
nothing secret and logs in as each role to prove it; `--check` changes
nothing and reports whether each role can log in, `--only bot` rotates one.
The full production order (migrations, checks, passwords, Vercel and bot
env, Discord setup, smoke test, rollback) is
[`docs/runbooks/shift-high-island-rollout.md`](../docs/runbooks/shift-high-island-rollout.md).

## Environment

| Variable | Module | Notes |
|---|---|---|
| `BOT_MODULES` | all | Comma-separated: `shift-voice`, `shift-quests`, `projectseed`. Default `shift-voice` |
| `DISCORD_SHIFT_BOT_TOKEN` | shift-voice | Falls back to `DISCORD_BOT_TOKEN`, like the web app, so the bot that hands out SHIFT roles is the one watching voice |
| `DISCORD_SHIFT_GUILD_ID` | shift-voice | The SHIFT server |
| `SHIFT_VOICE_DATABASE_URL` | shift-voice | The `shift_voice_bot` login through the pooler (see Deploying) |
| `DISCORD_SHIFT_GUILD_ID` | shift-quests | The SHIFT server (same variable as shift-voice) |
| `SHIFT_QUEST_DATABASE_URL` | shift-quests | The `shift_quest_bot` login through the session pooler: `postgresql://shift_quest_bot.<project ref>:<password>@<pooler host>:5432/postgres`, no `?sslmode=` (migration `20261111090600`; password with `pnpm shift:role-passwords`, see Deploying) |
| `SHIFT_ISLAND_URL` | shift-quests | Optional. Full URL of the island page, used as is, e.g. `https://www.passionseed.org/shift/island`. Falls back to `NEXT_PUBLIC_SITE_URL` + `/shift/island`. With neither set, the "🌐 เปิดเกาะบนเว็บ" button is left off. https only; http just for `localhost` and `127.0.0.1`, and only with `SHIFT_ISLAND_URL_ALLOW_HTTP=1` (Discord may refuse an http link button and fail the whole card, so to try the link locally prefer an https tunnel URL); a value that is set but refused also leaves the button off |
| `SHIFT_ISLAND_URL_ALLOW_HTTP` | shift-quests | Optional. `1` lets the island link use `http://localhost` or `http://127.0.0.1` for local tries. Never set it in production |
| `NEXT_PUBLIC_SITE_URL` | shift-quests | Optional. The site's address, e.g. `https://www.passionseed.org`; only read when `SHIFT_ISLAND_URL` is unset |
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

## SHIFT High quests

What it is, what it stores and how to run a pilot:
[`docs/features/shift-high-quests.md`](../docs/features/shift-high-quests.md).
The short version for whoever runs the bot:

- Add `shift-quests` to `BOT_MODULES` and set `SHIFT_QUEST_DATABASE_URL`. It
  needs no extra intent: slash commands, buttons and modals arrive on the
  `Guilds` gateway connection.
- `pnpm bot:register` creates or updates its 15 commands in the SHIFT server
  (one upsert per command; other commands are left alone).
- Its delivery loop posts queued messages every 10 seconds and touches the
  same health file as shift-voice, so the Docker `HEALTHCHECK` covers it.
- It never reads message content and never DMs anyone who did not opt in in
  `/settings`. DMs it does send are content-free nudges ("there is an update,
  use /inbox"), which keeps the safeguarding rules below intact.
- Tests: `pnpm test:db:quests` needs Postgres 15 or newer, finds it on `PATH`
  or in the usual install folders (`PG_BIN=<folder>` picks one) and says how to
  install it when missing. On throwaway databases it applies every shift_quest
  migration once (then checks grants and row level security, with Supabase's
  default grants stubbed) and twice (the catalogs must match), applies wave 1
  alone once a later migration exists, and runs the database rules, island
  rules and bot flows. CI runs it on Postgres 15, the production major, in the
  `shift-quests-db` job, with the bot typecheck and `pnpm bot:smoke`.
  `pnpm test bot/src` runs the unit tests.
- Preview: `pnpm island:render` draws the island with the bot's renderer, no
  Discord and no database, to `/tmp/shift-island-preview.png` and prints the
  path. `--fixture full|empty|overflow`, a saved `shift_quest_island_map`
  result as a JSON file, `--out <file>`, `--thumb` (scale 1), `--no-festival`
  and `--no-pin` change what it draws.
- Students use one command, `/island`: a private picture of SHIFT Island with
  their tree, the next milestone, the season (Demo Day countdown, shared island
  goal, unlocks) and one-tap buttons. When `SHIFT_ISLAND_URL` or
  `NEXT_PUBLIC_SITE_URL` is set, the island card and the `/start` cards also
  get a "🌐 เปิดเกาะบนเว็บ" link button to the island on the website
  (`bot/src/quests/weblink.ts`); the link never carries a Discord id or
  anything a student typed. `bot/src/quests/island/render.ts` draws
  it in pure JavaScript and encodes the PNG with Node's own zlib: no extra
  dependency, no fonts or native modules, and the same map always gives the
  same picture.
- The art is pixel matrices in `bot/assets/island/sprites.ts` (generated with
  Codex, original). After editing a sprite, run
  `node_modules/.bin/tsx bot/assets/island/generate.ts` to refresh the PNGs and
  the contact sheet `bot/assets/island/png/_sheet.png`; the bot itself reads
  only `sprites.ts`.
- Once a week (Monday 18:00 Bangkok, while sharing is on) the bot posts the
  island to the celebrate channel with only the project names every teammate
  opted in to show.
- Live island post (schema 8, `20261111094000_shift_quest_live`;
  `bot/src/quests/live.ts`): `/admin channel kind:live` picks a text channel
  (the bot needs View Channel, Send Messages, Attach Files and Read Message
  History there; Pin Messages too, or the post works unpinned). The bot keeps
  one message there and edits it in place: the island picture (the same
  consent-shaped view as the weekly post), trees and the mentor-confirmed
  milestones of the trees shown by name (quiet projects never count), the island goal, the Demo Day
  countdown, how many people sit at the campfire (a number, never names), a
  "🔥 เข้าห้อง" link to the coworking voice channel and the "🌐 เปิดเกาะบนเว็บ"
  link. It edits about 5 seconds after every gateway ready, then within a
  minute of anything shown changing, and at least every 10 minutes; at most
  one edit a minute. It is not gated on sharing: setting the channel turns it
  on, clearing it stops the edits and leaves the last message as it is.
  - Finding its message after a restart: the message id is stored in the
    database (`shift_quest_live_state`) with its channel, written with a
    compare-and-set (`shift_quest_live_mark`), so two overlapping processes
    during a deploy never leave two posts (the loser deletes its own). When
    the stored message is gone (staff deleted it; noticed at the next edit,
    within 10 minutes) or no id was stored, the bot first adopts its own
    pinned message carrying the "🏝️ โพสต์นี้อัปเดตเองทุก 10 นาที" line, and only
    then posts and pins a new one. Moving the live channel posts once in the
    new channel and leaves the old message alone. A send or edit refused
    because of the picture (the bot lost Attach Files, Discord 50013, or the
    file is too large, 40005) goes out once more without it, with the "รูปเกาะ
    วาดไม่ขึ้น" line, and logs once. Any other Discord error posts nothing and
    is logged once.
  - Below schema 8 the bot runs without it and logs `live post off`.
- `/admin channel kind:suggest` picks the suggestions forum (a text channel
  works too). It is refused unless a student role (or @everyone while no
  student role is set) can see the channel and post in it, so the website's
  link never opens a staff-only room. The bot never posts there; the website's island ⋯ menu links to
  it (schema 8). Both kinds are new command choices: run `pnpm bot:register`
  once after deploying them.
- Player, economy, island news and consent (schema 9,
  `20261111095000_shift_quest_player`). New and changed admin commands, so run
  `pnpm bot:register` once after deploying:
  - `/admin island action:status|consent-on|consent-off|digest-on|digest-off|digest-hide|digest-show|consent-reset`
    (`plot:` and an optional `reason:` for hide and show; `user:` for
    consent-reset). Parent consent is
    required by default: until a student's parent agrees (or a student 20 or
    older confirms their own age, or the website imports their SHIFT consent),
    their team's name stays off other students' maps, the weekly and live
    posts and the AI news, shares and community help posts are refused, and
    they cannot redeem. AI news always needs the island's own AI line (a
    parent's tick, or the student's own age confirmation), even with
    consent-off; SHIFT imports never carry it. A parent's no (declined or
    withdrawn) stays until an admin runs `consent-reset user:@student` after
    talking with the family; the audit log keeps the earlier answer.
  - The daily island news post is claimed before it is sent (no double post
    after a restart) and re-rendered for 7 days: when staff hide a team, a
    parent withdraws or a member stops showing the name, the bot edits the
    message within 5 minutes (a post with no team left says it was taken down).
  - `/admin catalog` takes `min_stage:` (0 to 7) and `requires_community:`;
    the redeem function enforces both and the shop shows them as lock reasons.
  - `/admin award kind:taught|helped user:` opens a reason form and gives the
    published `taught-next-shift` or `helped-most` staff award (capped, never
    to yourself, only to a student with consent).
  - The daily island news post (`bot/src/quests/digest.ts`): once a day, in
    the live channel or the celebrate channel when live is unset, no pings,
    only teams that opted in and have consent, while `digest-on`. The
    summaries come from the website's cron (`/api/cron/shift-island-digest`,
    20:00 Bangkok), which needs `CRON_SECRET`, `SHIFT_QUEST_DATABASE_URL` and
    `ANTHROPIC_API_KEY` on Vercel. Below schema 9 the bot runs without it.
- Try it locally: `bot/quests-sandbox.sh` (a test Discord server and a test bot
  token; never the SHIFT server). Coins are on: `bot/scripts/economy-seed.ts`
  applies the DRAFT economy from `lib/content/shift-island-economy.ts` (reward
  rules pinned on the main, community and side quests, the shop ladder with its
  stage and community gates, the terms) on every build; `--rewards` is kept for
  old commands and does nothing more. With schema 9 it also keeps parent
  consent required, gives neighbours A, B and D adult consent (so their names
  show), leaves your admin account without consent (to try the flow), and
  turns island news on with fixed sample summaries (model `sandbox-sample`,
  not AI output).
  `--db-only` needs no Discord credentials and keeps the database up until
  Ctrl-C. It prints a hash of the shift_quest migrations and refuses a sandbox
  built from other ones, an unfinished build or another admin;
  `bot/quests-sandbox.sh --reset` wipes it and builds it again.

