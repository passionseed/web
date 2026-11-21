# PassionSeed Discord bot

One long-running process with four modules, chosen by `BOT_MODULES`:

- **`shift-voice`** (default): records SHIFT students' voice participation in
  the SHIFT server (time in voice, mic open, screen share, camera, joins) and
  feeds `/admin/shift/voice`.
- **`shift-quests`**: SHIFT High quests in the SHIFT server: quests, a private
  progress journal, group help, human review, Passioncoin and redemption.
  Slash commands only; it records nothing passively. See
  [`docs/features/shift-high-quests.md`](../docs/features/shift-high-quests.md).
- **`projectseed`**: records who was in voice, reminds people about the hours
  they declared, and answers `/stats`. Linear: PS-213.
- **`hackathon-ops`**: the staff operations board for a hackathon: `/ops` for
  one staff role in one server, and a morning post in one staff channel. See
  [Hackathon operations board](#hackathon-operations-board).

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
pnpm bot:register   # projectseed, shift-quests and hackathon-ops: once, and after changing any slash command
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

**Registering never removes another module's commands.** Every module
upserts only its own commands (one POST per command, which creates or updates
it by name): projectseed `/stats`, the SHIFT High commands, and `/ops`. None
uses a PUT, which replaces a server's whole list. projectseed's registration
(`registerCommands` in `bot/src/commands.ts`) used to be a PUT, so with one
token it deleted every other command in `DISCORD_GUILD_ID`; an image built
before the change to an upsert still does, so deploy before registering on a
server that has `/ops` or the SHIFT High commands. Still keep `DISCORD_GUILD_ID`
different from `DISCORD_SHIFT_GUILD_ID`: `/stats` does not belong in the SHIFT
server.

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
| `BOT_MODULES` | all | Comma-separated: `shift-voice`, `shift-quests`, `projectseed`, `hackathon-ops`. Default `shift-voice` |
| `DISCORD_SHIFT_BOT_TOKEN` | shift-voice | Falls back to `DISCORD_BOT_TOKEN`, like the web app, so the bot that hands out SHIFT roles is the one watching voice |
| `DISCORD_SHIFT_GUILD_ID` | shift-voice | The SHIFT server |
| `SHIFT_VOICE_DATABASE_URL` | shift-voice | The `shift_voice_bot` login through the pooler (see Deploying) |
| `DISCORD_SHIFT_GUILD_ID` | shift-quests | The SHIFT server (same variable as shift-voice) |
| `SHIFT_QUEST_DATABASE_URL` | shift-quests | The `shift_quest_bot` login through the session pooler: `postgresql://shift_quest_bot.<project ref>:<password>@<pooler host>:5432/postgres`, no `?sslmode=` (migration `20261111090600`; password with `pnpm shift:role-passwords`, see Deploying) |
| `SHIFT_ISLAND_URL` | shift-quests | Optional. Full URL of the island page, used as is, e.g. `https://www.passionseed.org/shift/island`. Falls back to `NEXT_PUBLIC_SITE_URL` + `/shift/island`. With neither set, the "🌐 เปิดเกาะบนเว็บ" button is left off. https only; http just for `localhost` and `127.0.0.1`, and only with `SHIFT_ISLAND_URL_ALLOW_HTTP=1` (Discord may refuse an http link button and fail the whole card, so to try the link locally prefer an https tunnel URL); a value that is set but refused also leaves the button off |
| `SHIFT_ROUND_CHIME` | shift-quests | Optional. `off` mutes the campfire chime. Otherwise, as each focus and rest round starts with someone at the fire, the bot joins the coworking voice channel for a few seconds, plays `bot/assets/sounds/{focus,rest}.ogg` and leaves. Needs Connect and Speak there |
| `SHIFT_REST_MUSIC` | shift-quests | Optional. `off` mutes only the rest music (it fades in a minute before each rest and plays through it); the chimes stay |
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
| `HACKATHON_OPS_GUILD_ID` | hackathon-ops | The staff server `/ops` is registered to and answers in; every other server is ignored |
| `HACKATHON_OPS_CHANNEL_ID` | hackathon-ops | The staff channel for the morning post, and the only channel where `/ops` replies are visible to others. Must be hidden from @everyone, or the bot posts nothing there and answers privately |
| `HACKATHON_OPS_STAFF_ROLE_ID` | hackathon-ops | Only members holding this role can use `/ops` or see its autocomplete lists |
| `HACKATHON_OPS_DATABASE_URL` | hackathon-ops | The `hackathon_ops_bot` login through the session pooler: `postgresql://hackathon_ops_bot.<project ref>:<password>@<pooler host>:5432/postgres` (migration `20261120100000`) |
| `HACKATHON_OPS_BOARD` | hackathon-ops | Optional. Which board to read, the seed script's `--board`. Default `hackathon` |

Both modules in one process need the same token; with two different bots,
run two processes. hackathon-ops has no token of its own: it uses the one the
process runs as (alone, `DISCORD_BOT_TOKEN`, else `DISCORD_SHIFT_BOT_TOKEN`),
so that bot must be a member of the ops server. All of its variables are
required once it is in `BOT_MODULES`; startup fails, before anything posts,
when one is missing.

## Discord setup

Intents: `Guilds` and `Guild Voice States`, plus `Direct Messages` for
projectseed. None of them is privileged, so nothing needs switching on in the
developer portal.

Permissions: `View Channel` on the voice channels it should observe. It never
connects to voice. projectseed also needs `Send Messages` and
`Use Slash Commands` on the reminder channel. shift-quests' deep fire also
needs `Manage Channels` and `Move Members` (and the permissions its rooms set)
on the deep fire lobby's category: see "The deep fire" under SHIFT High quests.

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

`docs/project/PROJECTSEED-SAFEGUARDING.md` §4 permits bot DMs under three rules,
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
- It never reads message content and never DMs anyone who did not opt in.
  DMs it does send are content-free: the nudge ("there is an update, use
  /inbox") and the reminder, both opted into in `/settings`, and from schema
  23 the come-back DM (outbox kind `away`, below), opted into on the island
  or in `/settings`. That keeps the safeguarding rules above intact.
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
- Moving pictures (`bot/src/quests/island/gif.ts`): the live post and the
  story pages are looping GIFs drawn with the website's living-island code
  (`lib/shift-island/live`, on the software canvas `pixelCanvas.ts`) and
  encoded with `gifenc`. One seamless 6 second loop: the sea, foam, the moored
  boat, one gust through the trees, and lanterns at night; no gulls or cloud
  shadows, which cannot loop that fast. Only changed pixels are encoded after
  the first frame, so a big island stays a few hundred KB. The light follows
  Bangkok time (dawn, day, dusk, night).
- `/start` before starting is the island's story (`bot/src/quests/story.ts`):
  five pages, each a moving picture and a few lines, stepped with ▶ ถัดไป,
  ◀ ย้อน and ข้าม on the same private message, with no database call. The
  pictures are the web story's panels (`components/shift/island/story/scenes.ts`)
  and are drawn once when the bot is ready. The last page holds the two ways
  in: "🏝️ ขึ้นเกาะ" (the website, when its address is set) and
  "🌱 เริ่มใน Discord". After starting, the card shows the island at dawn and
  offers 🌱 จับจองที่ดิน first.
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
  consent-shaped view as the weekly post, as a moving GIF in the light of the
  Bangkok hour; a GIF over 2 MB or one that fails to draw goes out as the
  still PNG). With a coworking channel set, the picture shows the plaza's
  campfire as the web island does (`island/firepit.ts` over
  `lib/shift-island/live/plaza.ts`): the pit, a flickering flame while anyone
  sits in the voice channel, and one figure per seat by seat order (at most 8,
  never tied to a person; the text has the exact count). The pit stays unlit
  when nobody is there or the count is not live. /island draws the same from
  what the running campfire knows, with no extra database call. Then trees and the mentor-confirmed
  milestones of the trees shown by name (quiet projects never count), the island goal, the Demo Day
  countdown, how many people sit at the campfire (a number, never names), and
  a button panel. The first row is personal: "🏝️ ของฉัน" (the /island card),
  "📜 กระดานเควสต์" (the quest card, below; its 📋 งานที่ส่งไว้ button opens
  your own open and sent work, as before), "✍️ เช็กอิน" (the island's 🔨 check-in; without a plot it
  offers 🌱 จับจองที่ดิน instead), "🆘 ขอช่วย" (the help form) and "🎁 รางวัล"
  (the /rewards card). The second row has "📖 วิธีเล่น" (how the island works;
  its 🌱 จับจองที่ดิน shows only to students without a project), then
  links: "🌐 เปิดเกาะบนเว็บ", "🔥 เข้ากองไฟ" (the coworking voice channel) and
  "💡 เสนอไอเดีย" (the suggestions channel, only once
  `shift_quest_live_post()` returns a `suggest_channel_id`; it does not yet,
  so the link stays off). Every panel button is one action, `sq|lp|<target>`
  (`bot/src/quests/handlers/panel.ts`), which answers only the person who
  pressed it, in a new private reply, and never edits the shared post. It
  uses the slash commands' gate: someone outside the pilot gets the same
  polite "not yet", and someone in the pilot who has not started gets the
  /start story. The post is edited about 5 seconds after every gateway
  ready (so a new release puts its buttons on the existing post right away),
  then only within a minute of something real changing on the island
  (approvals, new plots, opt-ins, roots and looks, the goal, the campfire
  count, the day count); never on a timer, and not for a new light of the
  hour. At most one edit a minute. It is not gated on sharing: setting the channel turns it
  on, clearing it stops the edits and leaves the last message as it is.
  - Finding its message after a restart: the message id is stored in the
    database (`shift_quest_live_state`) with its channel, written with a
    compare-and-set (`shift_quest_live_mark`), so two overlapping processes
    during a deploy never leave two posts (the loser deletes its own). When
    the stored message is gone (staff deleted it; the bot reads, never
    edits, the post every 10 minutes to notice) or no id was stored, the bot
    first adopts its own pinned message carrying the "🏝️ โพสต์นี้อัปเดตเองเมื่อเกาะเปลี่ยน"
    line (or an earlier release's "🏝️ โพสต์นี้อัปเดตเองทุก 10 นาที"), and only
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
    18:00 Bangkok), which needs `CRON_SECRET`, `SHIFT_QUEST_DATABASE_URL` and
    `ANTHROPIC_API_KEY` on Vercel. Below schema 9 the bot runs without it.
    Once a news channel is set (schema 19) it posts nothing of its own.
  - The nightly island news (`bot/src/quests/news.ts`, schema 19): one card
    every evening at 20:00 Bangkok in the news channel (`/admin channel
    kind:news`, a text or announcement channel): the night island picture,
    island-wide totals (check-ins and campfire rounds with no number for 1 or
    2, approvals and stages grown, never minutes), the Demo Day countdown, a
    lore line, and the AI lines of eligible teams when there are any. It
    needs no website, cron or key. Claimed, sent and marked once a day; the
    AI lines are kept true for 7 days by edits that re-attach the same
    picture. Never a ping, a DM or a crosspost. Below schema 19 the bot runs
    without it. From schema 20, when no card is recorded by 22:30 Bangkok,
    the database queues one note a night for the staff channel (outbox kind
    `news_missed`, the day only), by about 22:40: what to check is the bot's
    View Channel and Send Messages in the news channel, else the bot's
    `nightly island news` log lines (the bot offline at 20:00). A failed
    send is retried until midnight, so a fix before then may still post the
    card. Below 20 the check re-reads the
    schema every 5 minutes, so deploy the bot first, then apply
    `20261118140000_shift_quest_island_news_missed.sql`; no restart needed.
  - The campfire call (`bot/src/quests/call.ts`, copy in `callCopy.ts`,
    schema 21, `20261118150000_shift_quest_campfire_call`): every day at
    18:50 Bangkok, one call in the news channel: the fire lights at 19:00.
    It pings the student roles once, on the send only (never users,
    `@everyone` or `@here`; edits never ping), while `/admin feature
    campfire_call_ping` is on; `/admin feature campfire_call` switches the
    whole call off (both on by default). It is edited through the evening
    (lit, the guest, embers) at most once a minute, and yesterday's call is
    deleted when today's is recorded. Claimed, sent and marked once a day; a
    stale claim it cannot check (no Read Message History) sends nothing, so
    nobody is pinged twice. It posts only when students can see and join the
    campfire voice channel and the bot can post in its chat. While a SHIFT
    cohort round is in session (`roundsInSession` in
    `lib/shift/voiceWindow.ts`) it sends no call and makes no drop, and the
    latest call becomes the paused note. During a season an evening guest
    comes for the 19:25 to 19:30 rest: every 30-second check in it that can
    read the room passes the ids there (`campfire.present()`, the voice
    cache; empty when nobody sits there) to `shift_quest_campfire_seen`, and
    the database keeps which teams were there (no member, no time). The
    first check from 19:30 calls `shift_quest_campfire_drop`, which settles
    the night once: one roll per team, rows deleted the next day (when the
    database is not at 19:30 yet, that check passes the room as the rest's
    last). A night the bot missed more than a minute of answers a team it
    never saw `unseen`, never `away`. When the
    founder or a mentor (an admin or reviewer member) is in the room at any
    check of the rest, they are that night's guest: the call and the round
    messages name them (`คืนนี้ <name> มาเป็นแขกที่กองไฟ`, two at most) and
    the drop gives the 2 staff-night looks; logs say only how many names.
    The round
    messages show the guest and how many teams got a look (never which); 🎁
    (`rd_guest`) answers privately about the presser's own team. The send
    carries a nonce Discord enforces (`callNonce`), so a POST discord.js
    retries never posts or pings twice. `/admin feature campfire_call off`
    edits the latest call into a paused note within 30 seconds. Below
    schema 21 the loop only
    re-reads the version each check, so deploy the bot first, then apply the
    migration; no restart needed. The bot needs, in the news channel, View
    Channel, Send Messages, Read Message History and (unless the student role
    is mentionable) Mention @everyone, @here and All Roles; in the campfire
    voice channel's chat, View Channel and Send Messages.
- Campfire rounds (`bot/src/quests/rounds.ts`, buttons in
  `handlers/rounds.ts`, rules in `lib/shift-island/rounds-rules.ts`): while
  anyone sits in the coworking voice channel (the campfire), the bot keeps one
  message in that channel's chat on the clock: 🔥 focus from :00 to :25 and
  :30 to :55, then 🌊 rest (diffuse mode, one tip each time) to :30 and :00.
  It edits the message from focus to rest, deletes it when the next round
  posts, when a round ends with nobody left, on stop, and (its own, by the
  marker line) after a restart. 🎯 ตั้งใจ starts a work session with an
  intention; ✍️ ปิดรอบ ends it and saves a private journal entry (what was
  learned, at least 10 characters, and where it is stuck, with the help
  button when it is). No minutes are stored or shown, nobody is pinged, every
  answer is private. The bot needs Send Messages in the voice channel's chat
  (Read Message History to sweep leftovers); without it, rounds log once and
  stay off. Students learn about it from the 📖 card and the web guide
  (`/shift/island/guide`).
  - Encounters: on about one rest in three, the rest message also carries a
    moment from the island's lore (a person from the boat, a bottle on the
    shore, a gull, a mentor passing; `R.encounters` in `rounds-copy.ts`, DRAFT)
    and a button that shows its note privately: one side quest from the
    board, as the quest card's side quest card, with 🧭 take it and 🌟 send
    it. Which rest and which moment follow from the round number alone
    (`encounterAt` in `rounds.ts`), so a restart shows the same one and
    everyone at the fire sees the same lines. The quest is read from the
    presser's board when they press (`pickSide` in `handlers/board.ts`): the
    same starting place in the board's order for everyone in that round, then
    the first one that person can take, on their project's route first.
    Nothing is stored, nothing pays for being there: a side quest pays only
    through its normal mentor review.
- The deep fire, กองไฟโฟกัส (`bot/src/quests/deepfire.ts`, decisions in
  `deepfire-state.ts`, copy in `deepfireCopy.ts`, schema 22,
  `20261120120000_shift_quest_deep_fire`; design in
  `docs/designs/shift-island-deep-fire.md`): a voice room built for one
  person to work alone. Join to create: whoever joins the lobby gets a new
  voice channel, "🔥 กองไฟโฟกัส" (never their name), in the lobby's category,
  and is moved in. The room is deleted the moment it is empty; joining the
  lobby while your room stands moves you back into it. At most 40 rooms at
  once; at the cap people stay in the lobby.
  - **Locked, but visible.** A room copies the lobby's role overwrites
    (@everyone's too) with only View Channel kept, so whoever sees the lobby
    sees the room and who sits in it. Connect and the room's chat (messages,
    threads, voice messages, polls, reactions) are denied on every role and
    for the owner too; only the owner and the bot may connect; user limit 1.
    The lobby's member overwrites are not copied.
  - **The bot is the lock.** Administrators, the server owner and anyone
    with Move Members get past overwrites, so anyone other than the owner
    and the bot who is in a room (other bots too) is disconnected at once,
    straight from the voice update (never waiting behind a build or the
    heartbeat) and on every reconcile, never moved anywhere else. When
    Discord will not disconnect someone, the room is deleted, which
    disconnects everyone in it; an owner is never moved back into a room
    someone else is in. The owner leaving while someone else is inside
    disconnects them and deletes the room. Moves and disconnects check the
    voice cache first, so nobody is pulled out of wherever they went.
  - **Nothing stored per person.** The bot recognises its rooms by a marker,
    in any category: a voice channel, never a lobby, with user limit 1, a
    member overwrite for the bot's own user allowing exactly View Channel,
    Connect, Manage Channels and Move Members, and `@everyone` denied
    Connect; the owner is the room's one other member overwrite allowing
    Connect. A room stays guarded after the lobby moves, changes or is
    cleared, across restarts. It reconciles on ready, resume, a lobby
    change and every 5 minutes from the gateway caches (no new intent, no
    member fetch), at most 5 new rooms per pass. Stopping leaves every room
    as it is (it waits a few seconds at most); the next start picks them
    up. Logs carry counts and short codes only.
  - **Heartbeat.** Every 60 seconds `shift_quest_deepfire_beat(guild,
    ready)` records whether rooms can be built and answers the lobby. The
    web's จุดไฟ button is live only while the last beat named the current
    lobby, said ready, and is under 3 minutes old. Never ready while the
    gateway is disconnected. A Discord 50013 (missing permissions) stops
    building, and the next beat says not ready, then checks again. The
    heartbeat runs beside the work on the rooms and gives up on the
    database after 20 seconds. Below schema 22 the module
    only re-reads the version each beat (while connected), so deploy the bot
    first, then apply the migration; no restart needed.
  - **Setup.** Make a voice channel inside a category (for example
    "🔥 จุดกองไฟโฟกัส"), visible and joinable by students, with no user limit.
    Give the bot, on that category: View Channel, Connect, Manage Channels,
    Move Members, plus every permission a room sets (Speak, Video, Use Voice
    Activity, Send Messages, Send Messages in Threads, Create Public Threads,
    Create Private Threads, Send Voice Messages, Create Polls, Add
    Reactions; Discord lets a bot set only permissions it holds there), and
    View Channel, Connect, Manage Channels and Move Members on the lobby
    itself. Then `/admin channel kind:deepfire channel:<the lobby>`. It
    refuses a channel that is not a plain voice channel, has no category,
    where the bot lacks any of these (unknown counts as missing), that
    students cannot see and join, or that is the campfire's coworking
    channel. Clear
    it with `/admin channel kind:deepfire` and no channel. Leave room for the
    rooms: Discord allows 50 channels per category. No rounds, chimes, music
    or bot messages in a room, and the evening guest never counts the rooms.
    In SHIFT cohort weeks shift-voice records voice time in every channel,
    these rooms included.
- The come-back DM (`bot/src/quests/away.ts`, copy `AWAY_DM` in `copy.ts`,
  schema 23, `20261121090000_shift_quest_away`; design in
  `docs/designs/shift-island-away.md`): a student who said yes (on the
  island's one-line strip, its ตั้งค่า, or the 🌱 button in `/settings`) gets
  one short DM after a stretch away from the island. It is a pointer, never a
  question (safeguarding §4): a title, one line, one "🌐 เปิดเกาะบนเว็บ" link
  button (no interaction), why it came and where to turn it off, and "the bot
  does not read or answer private messages". No question, no day count, no
  project. Without an island address (`SHIFT_ISLAND_URL` or
  `NEXT_PUBLIC_SITE_URL`) it fails permanently and nothing is sent. The
  question about why lives on the island, in a card the website opens once
  when anyone comes back; its answers are read by admins without names,
  never by mentors. The database decides everything: each minute the
  delivery loop calls `shift_quest_enqueue_away()` (students only, onboarded,
  never resting or waiting on a review of their own quest or their team's
  milestone, at most one per stretch and per 14 days, queued at the set hour,
  17:00 Bangkok by default, during a season; time on hold and the break
  between seasons never count as time away, and a mentor's decision or the
  end of a rest starts a fresh stretch), and the claim drops a come-back DM
  outside 09:00 to 19:59 Bangkok or for someone who came back (or whose hold
  ended) meanwhile. `/admin feature away` turns the whole
  feature on (off by default; it shows in `/admin status` from schema 23).
  Below schema 23 the loop only re-reads the version each minute and starts
  by itself once the migration is applied; `/settings` shows the line only
  from 23, while the switch is on (or, while it is off, to a student who said
  yes, offering only "off", so a yes can always be taken back), and never to
  staff. A new command choice:
  run `pnpm bot:register` once after deploying.
- Quest card (`bot/src/quests/handlers/board.ts`, copy `QB` in
  `island/copy.ts`): "📜 กระดานเควสต์" on the island card and the live post's
  panel shows the website's quest board in Discord, read with the same
  `shift_quest_board(actor)`: the next main quest for the tree (and your other
  open main quests), the community quests (milestones 6 and 7), and the side
  quests, one line each with its state (tile states from
  `lib/supabase/shift-quests/board.ts`, the web board's own). Actions where
  Discord already has them: 🌟 sends a main quest (the island's milestone
  picker), the menu opens a side quest with 🧭 รับเควสต์นี้
  (`shift_quest_side_choose`, then the quest as 📋 shows it) and 🌟 ส่งงานเลย
  (`shift_quest_side_submit`: proof and the quest's question), 📋 งานที่ส่งไว้
  stays one tap away, and "🌐 กระดานบนเว็บ" opens `/shift/island?at=board`,
  which opens the board sheet (`islandBoardUrl` in `weblink.ts`; only when the
  island's address is set). The bot already holds these functions (the grant
  loop of `20261111090900`); no migration, no new command.
- Roots (schema 10, `20261113090000_shift_quest_roots`;
  `bot/src/quests/island/roots.ts`): reflections grow a tree's roots, drawn
  over its soil in the live post and the /island picture (`roots_1` to
  `roots_3` in `bot/assets/island/sprites.ts`). A journal note with at least
  10 characters of what was learned counts, at most 3 per member per Bangkok
  day, written for the project by someone still on it; level 1 is 1 to 4, 2 is
  5 to 14, 3 is 15 or more. Only trees every member agreed to show (with
  consent) get roots; a plain plot never does. Stages, coins and shop gates
  do not change. The bot reads `shift_quest_island_roots()` only from schema
  10; below it, or when the read fails (logged once), trees have no roots.
  From schema 11, the ephemeral /island picture uses
  `shift_quest_island_my_roots(actor)` for the caller's own tree even when
  quiet, falling back to the public value on error. The live post stays public.
  No new command.
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

## Hackathon operations board

`BOT_MODULES=hackathon-ops` (`bot/src/ops/`). For staff only: the founders
see and update the hackathon's operations (owner, deadline, status, a
checklist of steps) from Discord. No student data, no DMs, no pings.

- `/ops board`: every operation with owner, deadline, status and steps done
  out of total. 🔴 overdue (the deadline day is past and a step is open),
  🟡 due within 48 hours, ✅ every step done.
- `/ops show operation:`: one operation, its goal and its steps with done marks.
- `/ops claim operation:`: the owner becomes your display name in the server.
- `/ops done operation: step:`: ticks a step (`undo:True` unticks it). Both
  options autocomplete; typing a title or the start of a step works too.
- `/ops status operation: text:`: sets the status line (up to 300 characters).
- Every morning at 08:30 Bangkok, one post in `HACKATHON_OPS_CHANNEL_ID`:
  what is due in the next 48 hours, what is overdue, and the board. Claimed
  in the database first, so a restart or a deploy never posts twice; a bot
  that was down at 08:30 still posts until noon. Nothing is posted when the
  board is empty or every step is done.

Who sees what: only members with `HACKATHON_OPS_STAFF_ROLE_ID`, in
`HACKATHON_OPS_GUILD_ID`, can use `/ops` (others get a private "staff only"
and empty autocomplete). Replies are visible to others only in the ops
channel, and only while @everyone cannot see that channel; anywhere else, and
every error, is private. The bot checks the same before each morning post and
posts nothing (logging once a day) if the channel is public, missing, in
another server or not writable. Server admins can also hide `/ops` from
everyone but staff in Server Settings, Integrations.

It never stops the process: if the database is missing the migration or
cannot be reached, it logs that and `/ops` says the board could not be
reached, while the other modules keep running.

**Storage.** `hackathon_ops`, `hackathon_ops_steps` and
`hackathon_ops_morning` (migration `20261120100000_hackathon_ops_board.sql`):
RLS on, a deny-all policy for `anon` and `authenticated`, no table grants.
The bot connects as `hackathon_ops_bot`, which can only execute the
`hackathon_ops_*` functions (not the `hackathon_ops__*` helpers) and reads no
table, like `shift_voice_bot`. The operations themselves are never in this
repo: they are loaded at run time from the private pages.

**Trying it, step by step** (each step needs a person's go; nothing here
runs on its own):

1. Apply the migration: `supabase db push` (production).
2. Give the login a password, as for `shift_voice_bot` (see Deploying):
   `ALTER ROLE hackathon_ops_bot WITH LOGIN PASSWORD '<SCRAM-SHA-256 verifier>'`
   with `supabase db query --linked`, and keep the URL out of git.
3. Seed from a local folder of operation pages (each page: a two-column
   table with Goal, Done when, Owner, Deadline and Status, and a `## Steps`
   list of `- [ ]` items; a README there only sets the order):

   ```bash
   read -rs HACKATHON_OPS_DATABASE_URL && export HACKATHON_OPS_DATABASE_URL
   pnpm exec tsx bot/scripts/hackathon-ops-seed.ts <folder> --dry-run   # parse only, prints counts per page
   pnpm exec tsx bot/scripts/hackathon-ops-seed.ts <folder>             # upsert
   ```

   Re-running is safe: titles, goals, deadlines, order and step text follow
   the pages; an owner or status set in Discord is kept, and a step ticked in
   Discord stays ticked while its text is unchanged (`--overwrite` takes
   owner, status and ticks from the pages instead). A deadline's first date
   (`Tue 17 Nov`, `2026-12-19`) is what overdue and due soon use; its year is
   the page's `updated` year unless `--year` says otherwise.
4. Set the five variables above in `bot.env` and add `hackathon-ops` to
   `BOT_MODULES`. Give the bot View Channel and Send Messages in the ops
   channel, and keep that channel hidden from @everyone.
5. Deploy (`bot/deploy.sh`), then register: `--register-commands` (see
   Running) adds or updates `/ops` in `HACKATHON_OPS_GUILD_ID` and leaves
   every other command there alone.
6. In the ops channel: `/ops board`.

Tests: `pnpm test bot/src/ops` (made-up operations only).
