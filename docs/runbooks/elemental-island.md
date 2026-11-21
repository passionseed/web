# Elemental hackathon: runbook

How to set up, deploy, rehearse and run the Elemental hackathon (Fri 4 to
Mon 7 Dec 2026) on Discord and passionseed.org. Do the steps in order and
tick each box. Every step says what to run and what you should see.

Background: [`bot/README.md`](../../bot/README.md) ("Elemental hackathon",
"Deploying"), [`docs/features/whiteboard.md`](../features/whiteboard.md) (boards
and project canvases). The rehearsal checklist is
[`elemental-dry-run.md`](elemental-dry-run.md).

**How the pieces fit.** One bot container, `passionseed-discord-bot-elemental`
(`BOT_MODULES=elemental` only, its own Discord application), serves two
Discord servers: the **real** server (always edition `elemental-2026`) and a
separate **rehearsal** server (edition `elemental-dryrun`). Each server's row
in `elemental_settings` names its edition, roles, channels and schedule, so a
rehearsal can never write into the real event. The bot reaches the database
only as `elemental_bot`, which may call `elemental_bot_*` functions and read
no table.

**Never paste a secret on a command line**: it stays in your shell history.
Read it into a variable instead, which prints nothing:

```bash
read -rs NAME && export NAME     # paste, press Enter
```

## Dates at a glance

| When | Who | What | Section |
|---|---|---|---|
| Sat 21 Nov | Big | `#reports` made by hand in the real server | G |
| Wed 25 Nov | Big | Migrations PR (E16) merged, `supabase db push`, bot password | B, C |
| Wed 25 to Sat 28 | Big | Discord application, both servers' roles and channels, element boards | D, E, F |
| Fri 27 Nov | agents | This runbook, the end-to-end test, the rehearsal checklist | A |
| **Fri 27 and Sat 28 Nov** | nobody | **No `supabase db push`.** Sat 28 is SHIFT Demo Day: full freeze | |
| Sun 29 Nov | Big | Early web PR (E36) opened; seed both servers; deploy container #2 from a clean `proj` checkout; register commands; first real codes go out | G, H, I, J |
| Mon 30 Nov | Big | E36 merge go; open the final `proj` to `main` PR | |
| Tue 1 Dec 18:00 | Big | Cut line, then the merge go for `proj` to `main` | |
| Tue 1 Dec evening | Host | 40 rehearsal codes (`/el test-codes n:40`) for Wed | K |
| Wed 2 Dec 19:00 | Host + 30 people | Rehearsal in the rehearsal server, [checklist](elemental-dry-run.md), then `/el dryrun-cleanup` | K |
| Thu 3 Dec | Big | Fix list from the rehearsal. No edition switch: the real server was always `elemental-2026` | |
| Fri 4 Dec 19:00 | bot | Opening post in news; `/team create` opens at `team_create_opens_at` (Big decides) | L |
| Fri 4 to Mon 7, 19:30 | Host | Pre-flight and fallbacks, every night | M |
| Fri 4 to Mon 7, 19:55 and 20:30 | bot | Campfire call with the legend; the nightly card | L |
| After `retention_until` | Big | Purge (section N) | N |

## A. Local run (no Discord, no production)

This proves the whole chain on your own machine: seed, codes, `/join`,
picker, teams, canvas link, `/tester`, `/report`, `/checkin`, the 19:55
legend, the 20:30 card and the rehearsal cleanup. Discord is faked; the
database is a throwaway Postgres that is removed at the end.

You need Docker running, or Homebrew Postgres 15 or newer
(`brew install postgresql@15`); the harness picks whichever it finds.

- [ ] A checkout of `proj/hackathon-island`, then:

```bash
pnpm install --frozen-lockfile
pnpm test:db:elemental                     # the SQL tests (migrations applied twice)
ELEMENTAL_E2E_OUT=/tmp/elemental-e2e \
  pnpm test:elemental:integration bot/src/elemental/__tests__/e2e.int.test.ts
open /tmp/elemental-e2e/card.png           # the posted 20:30 card
```

You should see `Tests: 12 passed`. `/tmp/elemental-e2e/` then holds
`card.png` (1080x1920, two plots, 10 people helped, 2 teams checked in),
`campfire-island.png`, `legend.txt` (`01 · ไฟ · Ember Watch` and
`04 · น้ำ · Tide Map`) and `posts.json` (every message the bot posted, by
channel). If the card hash test fails after a deliberate change to the card,
island or slot pool, look at `card.png` and update `CARD_SHA256` in the test.

- [ ] The image the deploy builds passes its smoke check here too (no
      Discord, no database; the values are placeholders):

```bash
BOT_MODULES=elemental ELEMENTAL_BOT_TOKEN=stub \
ELEMENTAL_GUILD_IDS=800000000000000001,800000000000000002 \
ELEMENTAL_DATABASE_URL=postgresql://elemental_bot:stub@127.0.0.1:5432/postgres \
  pnpm -s bot:smoke --env
```

You should see `smoke ok ... modules=elemental ... health=file`.

## B. Migrations (production, Wed 25 Nov)

Three files, all additive, applied only by Big after the migrations-only PR
(E16) merges to `main`:

- `supabase/migrations/20261123100000_elemental_core.sql`
- `supabase/migrations/20261123100100_elemental_testers_canvas.sql`
- `supabase/migrations/20261123100200_elemental_lessons.sql`

E16 renames them if `main` gains a later migration first; use the names in
its PR body.

- [ ] E16 is green (including `elemental-sql` and `elemental-int`) and merged.
- [ ] From a **clean checkout of `main`** linked to production (never the
      shared `~/dev/passionseed/web` checkout):

```bash
git status                       # nothing to commit
supabase db push --dry-run
```

It must list only the elemental files. If PR #344 is on `main` and its
`20261120100000_hackathon_ops_board.sql` is pending, the push needs
`--include-all` and the dry run shows that file too; anything else listed:
stop.

- [ ] `supabase db push` (with `--include-all` only in the case above).
- [ ] Never on Fri 27 or Sat 28 Nov.

## C. The bot's database login (right after B)

The migration creates `elemental_bot` without LOGIN. From your machine, with
an admin URL (Supabase **Connect** panel: "Direct" or the session pooler,
user `postgres`):

```bash
read -rs ELEMENTAL_ADMIN_DATABASE_URL && export ELEMENTAL_ADMIN_DATABASE_URL
openssl rand -hex 32             # copy it into your password manager
read -rs ELEMENTAL_BOT_PASSWORD && export ELEMENTAL_BOT_PASSWORD
pnpm exec tsx scripts/elemental/set-role-password.ts --check   # before: "LOGIN off"
pnpm exec tsx scripts/elemental/set-role-password.ts
pnpm exec tsx scripts/elemental/set-role-password.ts --check   # "Check passed."
```

- [ ] The output says `exposure outside elemental_bot_*: none` and
      `elemental_bot_* functions: N, executable by elemental_bot: N` with the
      two numbers equal. N is 42 on `proj` as of 22 Nov (all three files);
      the E16 PR body has the number for what was pushed.
- [ ] The bot's URL, for `bot.env` (section H):
      `postgresql://elemental_bot.<project ref>:<password>@<session pooler host>:5432/postgres`.
      Exit codes: 0 ok, 1 a check failed, 2 usage.

## D. Discord application (once)

- [ ] Discord Developer Portal: a **new application** for Elemental (its own
      token and rate limit, separate from the SHIFT bot). Bot tab: copy the
      token into your password manager. No privileged intent is needed.
- [ ] OAuth2 URL generator: scopes `bot` and `applications.commands`;
      permissions below (integer `2252111467367504`). Invite it to **both**
      servers.

| Bot permission (server-wide) | Why |
|---|---|
| Manage Roles | Paid and element roles; channel overwrites on team channels |
| Manage Channels | Create, rename, move, lock and (rehearsal) delete team channels |
| View Channels, Send Messages, Read Message History | Posts, invites, the picker; re-reading pins and card-override images |
| Embed Links, Attach Files | `/report` embeds; the island, card and legend file |
| Create Public Threads, Send Messages in Threads | One `/tester` mirror thread per element in the staff channel |
| Pin Messages (or Manage Messages) | The team welcome and the canvas link pins |
| Add Reactions, Use Application Commands | A channel overwrite may only grant what the bot holds; team members get these |

## E. Both servers: roles, channels, categories

Do this in the **real** server and again in the **rehearsal** server (its
own roles and channels; the same names are fine). Turn on Developer Mode
(User Settings > Advanced) to copy ids by right-click > Copy ID.

**Roles.** Drag the Elemental bot's role **above Paid and the five element
roles** (Server Settings > Roles), or `/join` and the picker fail with a 403
and staff get one alert in the staff channel.

| Role | Who | Sees |
|---|---|---|
| Host | Big and the event leads | Everything; every `/el` tool |
| Helper | Helpers | Team channels, the staff mirror channel; `/el tester-add`, `/el sample`, Remove and Reviewed |
| Mentor | Mentors | Team channels, the staff mirror channel (its buttons refuse them) |
| Judge | Judges | Neither team channels nor the mirror |
| Safety | Angpao and a second staff member | `#reports`; `/el whois`; the Handled button |
| Paid | Given by the bot on `/join` | The event channels |
| Water, Earth, Air, Fire, Aether | Given by the bot on the picker | Nothing extra; a label |

**Channels** (keys are what `seed.json` calls them):

| Key | Channel | Who sees it | The bot needs there |
|---|---|---|---|
| `start_here` | `#start-here` | @everyone (the only channel they see): View, Read History, Use Application Commands | Send (picker, invites) |
| `news` | `#news` | Paid and staff; only staff and the bot post | View, Send, Attach Files |
| `campfire` | the campfire **voice** channel (its text chat gets the island and legend) | Paid and staff | View, Send, Attach Files |
| `mirror` | `#staff-testers` (staff alerts, `/tester` mirror threads, card-override images) | **Host, Helper, Mentor only** | View, Send, Create Public Threads, Send in Threads, Read History, Attach Files |
| `reports` | `#reports` | **Safety and Host only** (the bot sets no overwrites here) | View, Send, Embed Links |

**Categories.** One private category per element (deny @everyone View). The
bot makes `fire-07`-style channels in them, visible to the team, Host,
Helper, Mentor and the bot, never Judge and never one student alone. A
category holds 50 channels; list a second one per element in `seed.json`
when an element may pass 45 teams.

- [ ] Server Settings > Integrations > the Elemental app: show `/el` to
      Helper, Mentor and Safety (by default only Manage Server sees it; the
      bot checks roles itself anyway).
- [ ] Real server only: `#reports` and a pinned fallback line
      ("message @Safety in #reports-intake") exist from Sat 21 Nov.

## F. Element boards (passionseed.org)

Teams make their own project canvas on their element's board
(**+ แคนวาสโปรเจกต์**, tag teammates with **ทีม**) and run `/canvas link`
with the canvas's `?focus=` link. The bot writes tester notes onto that
canvas as the board's owner.

**How many.** E07's load test (`scripts/elemental/whiteboard-load.ts`,
22 Nov, on a busy laptop) passed 20 teams per board when boards grow about
80 KB per team and editors save every 10 s, and failed at 25. So: **at most
20 teams per board**; boards per element = expected teams in that element /
20, rounded up, at least 1. Re-run on a quiet machine to confirm:
`pnpm tsx scripts/elemental/whiteboard-load.ts --kb-per-team 80 --save-every 10 --teams 10,15,20,25 --editors 30,45,60,75`.

- [ ] Signed in as the **staff account** that will own them, create the
      boards: "Elemental Water 1", ..., at least one per element, for the
      real server. Then a **separate** set for the rehearsal server
      (`seed.ts` refuses one board in two editions).
- [ ] Each board: Share, link access "edit". Copy the board id (the uuid in
      `/whiteboard/<id>`) into `seed.json` (section G).
- [ ] Students who have not finished onboarding lose the board link at
      `/onboard` until E06 (in E36) is live on `main`; send them the link
      again afterwards.

## G. Seed both servers (Sun 29 Nov; again after any id change)

`scripts/elemental/local/seed.json` is git-ignored. Start from the example in
`--help`:

```bash
pnpm exec tsx scripts/elemental/seed.ts --help
```

Fill in `real_guild_id`, then one entry per server: `guild_id`, `edition`
(`elemental-2026` for the real server, `elemental-dryrun` for the
rehearsal), `role_ids`, `channel_ids`, `element_category_ids` (lists),
`boards` (every element needs at least one), `team_create_opens_at` (ISO
with `+07:00`; Big decides; until then `/team create` says "not open yet"),
`retention_until`, and for the rehearsal server only a `schedule`, e.g.
`{"2026-12-02": {"opening_at": "19:00", "call_at": "19:55", "card_at": "20:30"}}`.
The real server's schedule comes from the flags, whose defaults are the
programme in `components/hackathon/poster/elemental/facts.ts`: opening Fri 4
Dec 19:00, call 19:55 and card 20:30 on 4 to 7 Dec.

```bash
read -rs ELEMENTAL_ADMIN_DATABASE_URL && export ELEMENTAL_ADMIN_DATABASE_URL
pnpm exec tsx scripts/elemental/seed.ts --dry-run   # the plan; "rolled back, nothing changed"
pnpm exec tsx scripts/elemental/seed.ts             # "Done."
```

- [ ] Both servers show `settings created` (later runs: `updated` or
      `unchanged`), and `boards: water 1, earth 1, ...`.
- [ ] It refuses (and changes nothing) if the real server is mapped to the
      rehearsal edition, a board is shared between editions or is not a
      whiteboard, or an element has no board. Read the line, fix the JSON,
      run again.

## H. bot.env for container #2

On the bot host, `~/passionseed/discord-bot-elemental/` (`chmod 700` on the
folder, `chmod 600` on the files), next to but separate from the SHIFT
container's `~/passionseed/discord-bot/`. Plain `KEY=value` lines, no quotes:

```
BOT_MODULES=elemental
ELEMENTAL_BOT_TOKEN=<the Elemental application's token>
ELEMENTAL_GUILD_IDS=<real server id>,<rehearsal server id>
ELEMENTAL_DATABASE_URL=postgresql://elemental_bot.<project ref>:<password>@<session pooler host>:5432/postgres
```

Only if the web card (E24) shipped, add both (the same secret goes where
E24's route reads it; see its PR):

```
ELEMENTAL_CARD_URL=https://passionseed.org/api/elemental/card
ELEMENTAL_CARD_SECRET=<openssl rand -hex 32>
```

Without them the nightly card is the pixel card. Also put a post-only
Discord webhook URL for a staff channel in `alert-webhook` in the same
folder (the watchdog posts there when the container is down 10 minutes).

- [ ] Never add `shift-voice`, `shift-quests`, `projectseed` or
      `hackathon-ops` to this file: the bot refuses to start with them.

## I. Deploy container #2 (Sun 29 Nov)

From a **clean checkout of `proj/hackathon-island`** (a fresh worktree is
fine; never a checkout another session is editing):

```bash
git status                                  # clean; deploy refuses uncommitted bot changes
pnpm install --frozen-lockfile              # deploy pins the versions in node_modules
BOT_NAME=passionseed-discord-bot-elemental bot/deploy.sh --print-plan
```

- [ ] The plan says exactly:

```
container: passionseed-discord-bot-elemental
app dir:   ~/passionseed/discord-bot-elemental
env file:  ~/passionseed/discord-bot-elemental/bot.env
webhook:   ~/passionseed/discord-bot-elemental/alert-webhook
cron line: */5 * * * * python3 ~/passionseed/discord-bot-elemental/watchdog.py --name passionseed-discord-bot-elemental --app ~/passionseed/discord-bot-elemental >> ~/passionseed/discord-bot-elemental/watchdog.log 2>&1
```

- [ ] Note the SHIFT container's start time **before**:

```bash
ssh <bot host> "docker inspect -f '{{.State.StartedAt}}' passionseed-discord-bot; crontab -l"
```

- [ ] Deploy. It asks you to type the container name
      (`passionseed-discord-bot-elemental`) before any SSH:

```bash
BOT_NAME=passionseed-discord-bot-elemental bot/deploy.sh <bot host>
```

It stages, builds, smoke-checks with `bot.env` (refuses if `bot.env` is
missing; only warns without `alert-webhook`), starts the container and waits
for Docker to report it healthy (the heartbeat reaches the database every
60 s).

- [ ] **After**, check that the SHIFT container was not touched and the new
      cron line names container #2:

```bash
ssh <bot host> "docker inspect -f '{{.State.StartedAt}}' passionseed-discord-bot; \
  docker ps --format '{{.Names}}  {{.Status}}'; crontab -l"
```

The SHIFT start time is identical to before; `docker ps` shows both
containers `(healthy)`; `crontab -l` has the SHIFT line unchanged plus the
cron line above.

- [ ] Register the slash commands in both servers (POST per command, never
      PUT, so nothing else is deleted):

```bash
ssh <bot host> docker exec passionseed-discord-bot-elemental node --import tsx bot/src/index.ts --register-commands
ssh <bot host> docker logs --tail 30 passionseed-discord-bot-elemental   # "[elemental] serving 2 guild(s); ..."
```

- [ ] In each server, as Host: `/el totals` answers (zeros), and
      `/el picker` posts the element buttons in `#start-here`.

**Rollback.** Runs the previous image again (and swaps the tags, so running
it twice returns):

```bash
BOT_NAME=passionseed-discord-bot-elemental bot/deploy.sh <bot host> --rollback
```

To stop the Elemental bot entirely: `ssh <bot host> docker stop passionseed-discord-bot-elemental`.
The SHIFT container is never involved. Migrations are additive, so an older
bot runs against the newer schema.

## J. Codes (Sun 29 Nov, then as registrations are paid)

```bash
read -rs ELEMENTAL_ADMIN_DATABASE_URL && export ELEMENTAL_ADMIN_DATABASE_URL
pnpm exec tsx scripts/elemental/issue-claims.ts --dry-run   # counts only
pnpm exec tsx scripts/elemental/issue-claims.ts
```

- [ ] One code per member row of every **paid** `elemental-2026`
      registration, at most 5 per registration (over-cap rows are listed for
      staff). Codes never print in the terminal.
- [ ] Files in `scripts/elemental/local/`: `claims-<date>.csv` and
      `claims-<date>-messages.txt` (one block per registration between
      `----- registration <uuid>: copy from the next line -----` and
      `----- end -----`). Paste each block into the Discord invite message
      staff already send by hand. The Thai lines in it are placeholders until
      reviewed (`[TH-REVIEW]`).
- [ ] Run it again whenever more registrations are paid: issued codes come
      back unchanged, new ones are added.
- [ ] Lost or used code: a Host runs `/el link user:@x registration:<id>
      position:<n>` (also gives Paid). Safety follow-up: `/el whois user:@x`
      gives the registration id and position only; the parent contact is in
      the admin page, never in Discord.

## K. Rehearsal (Wed 2 Dec)

- [ ] Tue 1 Dec: rehearsal server seeded with the Wed schedule (section G);
      as Host in the rehearsal server, `/el test-codes n:40` (or
      `pnpm exec tsx scripts/elemental/issue-claims.ts --rehearsal 40`, file
      `rehearsal-<date>.csv`). Rehearsal codes work only there; in the real
      server they say the code is for another server.
- [ ] Wed 2 Dec: run [the checklist](elemental-dry-run.md) with 30+ people.
- [ ] After: `/el dryrun-cleanup confirm:elemental-dryrun` in the rehearsal
      server. It archives the rehearsal teams, un-counts their entries and
      deletes their channels; it refuses in the real server and on any other
      confirm text, and touches no `elemental-2026` row (the end-to-end test
      checks this row for row).

## L. Event nights (Fri 4 to Mon 7 Dec)

What the bot does on its own (Bangkok time, from `elemental_settings.schedule`):

| Time | Post |
|---|---|
| Fri 4 19:00 | Opening post in news: the island and the `/join` and picker steps |
| 19:55 nightly | News: the campfire call with the voice link. Campfire chat: the island and the legend (`NN · element · project`, one line per live team; a `legend.txt` past 6 messages). Not sent if more than an hour late |
| 20:30 nightly | The card in news (that day's `/el card-override`, else the web card if set, else the pixel card), totals in the caption |
| post time + 15 min | If a post is still unsent: one note in the staff channel pinging Host |

The opening and call ping nobody; Hosts ping roles by hand if they want.
`/team create` opens at `team_create_opens_at`; solo students: `/el unteamed`,
then `/el team-create`.

## M. 19:30 every night: pre-flight and fallbacks

**Pre-flight (Host, 5 minutes):**

- [ ] `ssh <bot host> docker ps --format '{{.Names}}  {{.Status}}'`: both
      containers `(healthy)` (Big, or whoever holds SSH).
- [ ] In the real server, `/el totals` answers within a few seconds with
      tonight's numbers.
- [ ] The staff channel has no unread "unsent after 15 minutes" note and no
      403 alert.

**Fallbacks (who does what):**

| Symptom | Who | What |
|---|---|---|
| Bot silent, or "The application did not respond" | Big | `docker logs --tail 50 passionseed-discord-bot-elemental`; if the last deploy is the cause, `--rollback` (section I). Meanwhile Hosts post by hand and Helpers log testers from the Google Form with `/el tester-add slot:` when it is back |
| Container unhealthy: the database is unreachable | Big | Supabase status and the pooler; interactions answer "busy" and nothing is lost. The watchdog posts to `alert-webhook` after 10 minutes |
| Card missing or broken at 20:30 | Host | `/el post-now kind:card`; if the picture fails, post `/el totals` and the island PNG by hand. A hand-drawn image: `/el card-override image: day:` (needs the staff channel set) |
| Legend or campfire picture missing at 19:55 | Host | `/el post-now kind:legend` (picture and legend only) or `kind:call` |
| Notes not on the canvas ("canvas: failed" in the reply) | Helper | Entries still count. `/el resync`. Remind teams the board shows new notes only after a reload |
| A team's canvas link refused | Host | Check the board is the team's element board and a teammate owns or is tagged on the canvas; `/el canvas-link slot: url:` links it for them |
| Accept buttons not working, or teams still unformed | Host | `/el team-create` from the registration groups; `/el unteamed` lists who is left |
| Team channel not created | Host, then Big | The sweep retries every 3 minutes. Check the bot role has Manage Channels and Manage Roles and the element category is not full (50). Wrong element or name: `/el team-set-element`, `/el team-rename`; moves: `/el team-move-member` |
| Student cannot see channels after `/join` | Host | The staff channel shows a 403 alert: move the bot role above Paid. The student runs `/join` again (it repairs Paid), or `/el link` |
| `/report` not reaching `#reports` | Safety | Use the pinned fallback ("message @Safety in #reports-intake"); Big checks `channels.reports` in `seed.json` and the bot's View/Send there |
| Bell or badge missing | Host | Shout out first testers at the campfire; `/el badge-powerup voice:` for the power-up badge |
| Lesson player not shipped | Host | Unlisted YouTube clips plus the Google Form; no lesson badges |
| Island page `/hackathon/island` not shipped | Host | Screen-share the island PNG and legend from the campfire chat |
| Safety concern in a team channel | Safety | Act in `#reports`; the bot never DMs and never shows contacts. `/el whois` for the registration, then the admin page |

## N. After the event

- [ ] Stop the bot when Big decides: `ssh <bot host> docker stop passionseed-discord-bot-elemental`,
      then remove its cron line (`crontab -e`) so the watchdog does not
      report it as down.
- [ ] After `retention_until`: `select public.elemental_purge_edition('elemental-2026', 'purge elemental-2026');`
      (service role only, from the SQL editor) removes Discord ids, member
      links, codes, tester free text and reports, and keeps anonymous team
      and project totals. Big runs it; it refuses before the retention date
      or with `retention_until` unset.

## Calls only Big can make

- `team_create_opens_at` (and whether it closes). Until set, `/team create`
  answers "not open yet".
- How many boards per element (at most 20 teams each, section F) and where
  each team gets its board link: the bot does not hand out board links.
- Whether to turn on healing (`healing_enabled` is off; the island stays all
  healthy). It is a settings field, set with `elemental_bot_settings_set`
  from the SQL editor, not by `seed.ts`.
- `retention_until` and the purge date.
- Every Thai line marked `[TH-REVIEW]` in `bot/src/elemental/copy/` and the
  claim messages needs a native review before codes go out on Sun 29 Nov.
