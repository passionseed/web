# SHIFT High quests (Discord)

A quest bot for the SHIFT High alumni community in the SHIFT Discord server.
Students choose or propose quests, keep a private progress journal, ask for
help in group channels, submit work for human review, and can earn
Passioncoin under published rules. The founder's spec is
`mentor/packs/shift-high-discord-quest-spec.md` (outside this repo); this
page describes what was built from it.

**Status (2026-11-11):** built and tested locally, not deployed. The
migrations are not applied to production. Coins, redemption, public sharing
and reminders all start switched off and refuse to switch on until an admin
publishes the rules they depend on.

## What people can do

| Who | Commands |
|---|---|
| Student (holds a pilot Discord role) | `/start`, `/island` (tap, milestone, quest board, stuck, rest, open work, name sign), `/project new\|list\|invite\|view\|ownership\|leave`, `/squad new\|invite\|withdraw\|view` (students only; answers "not open yet" while the `squads` switch is off), `/work start\|end`, `/help`, `/celebrate`, `/inbox`, `/coins`, `/rewards`, `/settings`, `/data` |
| Reviewer | `/review queue\|help\|awards` |
| Fulfillment operator | `/fulfill` |
| Admin | `/admin status\|feature\|channel\|student-role\|terms\|role\|rule\|template-rule\|templates\|template\|catalog\|ledger\|report\|data\|season\|recognize` |

`/quest` and `/progress` are no longer registered (the register step deletes
them); their handlers stay behind the `/island` buttons. `/admin season` takes
the name and only the values to change: a left-out option keeps its stored
value, a name alone shows the season and its unlock button, `clear_goal`
removes the island goal, and `surprise_cap` sets how many surprise
recognitions one student may get in the season. `/admin feature` switches
`awards`, `redemption`, `sharing`, `reminders` and `squads`. Staff are told
squads are for students before any squad call; while `squads` is off (the
default), `/squad` stays registered and every subcommand answers that squads
are not open yet, without a database call, and `/inbox` shows no squad
invites. With `shift-quests` enabled the bot refuses to start when
`shift_quest_schema_version()` is below the version it needs (`REQUIRED_SCHEMA`
in `bot/src/quests/index.ts`, now 2) and says which migration to apply.

Most flows are buttons, selects and modals behind these commands. Every bot
reply is ephemeral. Channel posts happen only for: help requests (the
community help channel, or the staff channel for mentors-only requests),
review and proposal notices (staff channel, title only), and celebrations,
peer recognitions and coworking intentions after the author confirms a
preview (and, for a recognition, after the peer accepts).

The seven starter quests from the spec are seeded in Thai
(`20261111090500_shift_quests_starter_templates.sql`) with no reward rule.

## How it is built

```
Discord ──▶ bot/src/quests (thin UI) ──▶ public.shift_quest_*() ──▶ shift_quest_* tables
                 ▲                              (all rules)              (RLS on, no grants)
                 └── outbox loop ◀── shift_quest_outbox_claim()
```

- **The database holds every rule.** Each `shift_quest_*` function takes the
  caller's Discord user ID first and checks rights itself: ownership,
  application roles, conflicts of interest, versions, balances. The bot
  connects as `shift_quest_bot`, which can execute those functions and read
  no table. Nothing is reachable through the Supabase Data API.
- **Application roles, not Discord permissions.** `reviewer`, `admin` and
  `fulfillment` live in `shift_quest_members.roles`. Server admins get
  nothing automatically. Students qualify by holding a Discord role an admin
  names with `/admin student-role`; until one is named the pilot is closed.
- **Copy lives in one file**, `bot/src/quests/copy.ts`. The database queues
  `kind` + `params`; the bot renders the words.
- **Delivery is durable.** Channel posts and DMs go through
  `shift_quest_outbox` with a dedupe key. A missing channel parks the message
  until it is configured; a failed send retries with backoff; nothing a
  student did is undone by a Discord error.

## What is stored, and what is not

Stored: a member row (opaque ID, Discord ID, display name, preferences,
roles), projects and consenting memberships, quests and their revisions,
reviews and appeals, journal entries, coworking intentions and reflections,
help requests, ownership checks, shares, the coin ledger, redemptions, private
notices, data requests, and an audit trail of who did what to which record
(no free text).

Not stored: message content, voice time, screen share, audio, passwords,
tokens, contact details, test users' identities. Browsing the bot stores
nothing; only `/start` creates a member.

The one thing the bot notices on its own (from schema 7,
`20261111093000_shift_quest_campfire.sql`) is who is in the coworking voice
channel right now, for the island's campfire:

- **Stored**: live presence in the coworking voice channel only, one row per
  person in it now (Discord ID, channel ID, display name, `joined_at`) in
  `shift_quest_voice_presence`, plus the bot's heartbeat in
  `shift_quest_voice_state`. Anyone in the channel counts, member or not,
  adult or student: it is a group space, and nothing here opens a 1:1 channel.
  Other voice channels are never written. The row is not linked to a member,
  project or plot, and is not part of `/data`: it exists only while the person
  is in the channel.
- **Deleted**: on leave, the row is deleted at once. The bot replaces the
  whole table from Discord's voice cache on every start (ready), resume and
  clean stop, so a missed event never lingers. If the bot goes silent, the
  web shows the campfire as empty 3 minutes after its last heartbeat. There is
  no history, no voice time and no audio.
- **Shown**: the island page carries only the count and the join link. Names
  (as the server shows them) load only when a signed-in, eligible SHIFT
  student taps the campfire on `/shift/island`. People sit only at the
  campfire, never at their plot, so nothing ties a name to a project.
- **Who can reach it**: `shift_quest_voice_set`, `_sync` and `_beat` are
  granted to `shift_quest_bot` (and `service_role`) only, never the website;
  `shift_quest_campfire` (the privacy-shaped read, no Discord IDs) to
  `shift_quest_web` (and `service_role`) only, never the bot. The tables have
  RLS on, no policies and no Data API access.
- `coworking_channel_id` may be a voice channel (`/admin channel
  kind:coworking`). Intention posts then land in that voice channel's text
  chat. A text channel still works for intentions; the campfire then stays
  empty, and the bot logs one warning. The bot must be able to view the voice
  channel.
- **Only while students can see it**: the bot publishes who sits in the
  channel only while a student role (or `@everyone`, when no student role is
  set) can view and join it, the rule `/admin channel` checks when it is set.
  The bot checks again on every sync, before every voice write, on a channel
  update or delete, and on every heartbeat (which catches role permission
  edits and changed student roles, from `shift_quest_voice_beat`). If staff
  make the channel private later, the campfire is synced empty at once,
  nothing per person is written while it stays closed, and the bot logs one
  warning with no names.

`/data` exports everything about the caller as JSON. An approved erasure
(`/admin data`) deletes the journal, help requests, shares and notices,
redacts submissions, reviews and appeals, strips their words and name from
queued messages and from other people's notices, and unlinks the Discord ID.
Ledger rows and quest states stay, keyed by an opaque ID, so balances and
audits still add up. The ledger never holds student-written text (award rows
say `quest_award`; the title is read from the quest, which erasure redacts),
but reversal reasons are written by an admin and kept forever: never put a
name or personal detail in one. Messages already posted in Discord are not
deleted by the bot; an admin removes those by hand.

The last admin cannot be erased; grant another admin first.

## Invariants and where they are enforced

| Spec acceptance criterion | Enforced in | Tested in |
|---|---|---|
| Understand, choose, find help with no coins and no public sharing | `/start`, `/help` need no coins; sharing off by default | `bot_flows.ts` |
| Pause, resume, resize, replace without penalty | `shift_quest_set_state`, `shift_quest_update` (versioned) | `db_rules.ts` |
| A negative test with a credible reflection can pass | Review is human; no outcome checks | `db_rules.ts` |
| Coworking and screen share never mint coins | No path from `work_*` to the ledger | `db_rules.ts` |
| Reviewer cannot approve an old or withdrawn revision, their own, or a conflicted one | `shift_quest_review_decide` (row lock, latest revision, `shift_quest__conflicted`) | `db_rules.ts` |
| Retried and concurrent approvals credit once | Row lock + unique `source_key` `award:<quest>:<member>` | `db_rules.ts` (two connections) |
| Team credit needs explicit contributions and a configured allocation | `shift_quest__issue_award` (`contributions_pending`, `team_allocation_missing`) | both |
| Concurrent redemption cannot overspend balance or stock; cancel releases once | `shift_quest_redeem`, `shift_quest__release` (member then item locks, `release:<id>` key, allowed statuses checked under the lock, expected price) | `db_rules.ts` (two connections) |
| Public posts need a confirmed preview and the peer's consent | `shift_quest_share_*` | both |
| Ownership blockers become help; mentor-held access needs a continuation path | `shift_quest_ownership_set` + table check | `db_rules.ts` |
| Opted-out students get no reminders; pausing rewards keeps help | `shift_quest_enqueue_reminders`, `shift_quest_outbox_claim` | `db_rules.ts` |
| Export and erasure; no personal data in logs or fixtures | `shift_quest_data_export`, `shift_quest_admin_erase`; bot logs SQLSTATE only | `db_rules.ts`, unit tests |
| Restart recovers pending work without duplicates | Everything is in the database; outbox leases expire and are reclaimed | `db_rules.ts` |
| Incomplete reward configuration keeps redemption disabled | `shift_quest_admin_set` refuses with the missing items | both |

Run them: `pnpm test:db:quests` (throwaway Postgres, needs a local Postgres
15+ install) and `pnpm test bot/src`.

Locks: every mutex is `FOR NO KEY UPDATE` (foreign-key checks take
`KEY SHARE`, which it does not block), and the order is always quest, then
the project's plot, then members, then catalog item, then redemption; the
active season row comes last. An approval (and an award retry) locks every
member it may touch in one sorted pass right after the plot
(`shift_quest__lock_approval_members`: the confirmed contributors and the
project's active members), so later member locks are re-entrant. Joining or
leaving a project takes the plot lock, so that set cannot change under an
approval: leaving first locks the leaver's open milestone quests on the
project (the ones it releases), then the plot; joining takes the plot, then
(with seasons) the project's active members in one sorted pass. Erasure locks
the member's quests, then the plots of their active projects, then the
member. A season or unlock edit locks every plot, then every member, then
the season row. A lock wait that still loses a race (deadlock,
serialization failure, timeout) reaches the student as "try again", never
as a generic error.

Privileges: no `shift_quest_*` function, table or sequence is open to
`PUBLIC`, `anon` or `authenticated`; the bot executes every entry point
except `shift_quest_bootstrap_admin` and no helper (`shift_quest__*`), and
reads no table. `db_rules.ts` checks this from the catalog for every object,
and `run-local.sh` checks it after a single pass and for wave 1 alone.

The SQL was reviewed independently (Fable 5.2, 2026-11-11). Its six findings
(erasure leftovers, a cross-project conflict of interest, an erased teammate
blocking an award, repeat appeals, foreign-key deadlocks, a cancel-after-start
race) are fixed and covered by the regression block in `db_rules.ts`.

## Design choices made where the spec left room

These are defaults, easy to change; flag any that are wrong.

- **No DMs by default.** Private notices live in `/inbox` (ephemeral). A
  student can opt in to a content-free DM nudge, and opt-in reminders are
  DMs. The bot never reads DMs, matching the safeguarding rules in
  `bot/README.md`.
- **Submission previews are held in memory** for 30 minutes before the
  student picks who sees it. A bot restart loses an unconfirmed preview,
  never a submitted one.
- **A reward rule's cap counts awards that still stand**: an award reversed
  in full frees its place; a partly reversed one still counts.
- **One appeal per declined revision.** A different reviewer decides it; if
  they decline too, the student can rework and submit a new revision or start
  a follow-up quest.
- **Repeats** of a repeatable quest earn only when the reviewer presses
  "approve + different from before".
- **Awards withheld while paused are not back-filled automatically.** A
  reviewer can retry each one from `/review awards`.
- **Reversals may take a balance below zero** if the coins were already
  spent; a negative balance just blocks redemption.

## Island and seasons (data)

The database side of SHIFT High Island (plan:
[`docs/designs/shift-high-island.md`](../designs/shift-high-island.md)), in
two migrations, with small hooks in the earlier files:

- **Wave 1, the island core:** `20261111090700_shift_quests_island.sql`
  (plots, milestones, the map, check-ins, rest). It applies and works on its
  own: where wave-1 code needs a season answer it calls a hook that is a
  no-op here (`shift_quest__island_season`, `__island_extras`,
  `__season_after_approval`, `__season_report`, `__island_export`,
  `__island_erase`, `__on_role_grant`, `__on_project_join`,
  `__feature_flags`, `__set_feature`).
- **Wave 2, seasons:** `20261111090800_shift_quests_seasons.sql` (seasons,
  dated unlocks, the island goal, recognitions, squads, the weekly post). It
  replaces those hooks with `CREATE OR REPLACE` (same signatures). No wave-1
  file names a wave-2 table.

`shift_quest_schema_version()` returns 1 with wave 1 alone and 2 with both,
for the bot's startup check. Tested in
`supabase/tests/shift_quests/island_rules.ts`, which `run-local.sh` runs on
the full schema and again with `SHIFT_QUESTS_WAVE=1` on a database with wave
1 alone; that run ends by applying wave 2 (twice) to the populated database.

**Tree stage.** Each starter template carries `milestone` 1 to 7 (unique among
published templates), and a quest chosen from it copies it into
`shift_quest_instances.milestone`. A project's stage is the number of
distinct milestones with an approved quest filed under it: any member's
quest, any order, all time. Nothing lowers it: an approved quest is never
re-decided, archived or moved, and a member leaving takes nothing away. Taps,
notes, coworking and proposed quests never change it.

**One open quest per milestone.** A project has at most one open (active,
paused, submitted, clarification or appealed) quest per milestone: the unique
index `shift_quest_instances_one_open_milestone`. `shift_quest_milestone_submit`
reuses it only when the caller holds it; a teammate's is refused with
`milestone_open` (`/island` shows who holds it in `in_flight.owner`), and one
under appeal with `milestone_appealed`. Choosing the template
(`shift_quest_choose`) and appealing a declined quest (`shift_quest_appeal`)
refuse a second one with `milestone_open` too. Teammates pressing the same
milestone at once take turns on an advisory lock keyed by project and
milestone.

**Leaving frees what you were working on.** When a member leaves a project
(`shift_quest_project_leave`), their open milestone quests on it that are not
with the reviewers (active, paused, clarification) are archived, version + 1,
with any pending revision withdrawn (`shift_quest__release_milestones`), so a
teammate can take the milestone at once. Submitted and appealed ones stay for
the reviewers; deciding them frees the milestone (an approval still grows the
tree). Erasure archives every open quest of the erased member, version + 1,
submitted and appealed ones included, because their words are redacted and
there is nothing left to review.

**Plots, names and privacy.** `shift_quest_plots` gives every project a stable
slot (the lowest free one, assigned on create; existing projects are
backfilled). Archived projects keep their slot but are not drawn. Consent is
per member (`shift_quest_project_members.show_name`), off by default, and
cleared on leaving and on every re-invite. A plot shows its real stage,
decorations and name to everyone only while it has an active member and
every active member consented. Its own active members always see its stage
and decorations (the name only with full consent). Everyone else, including
the weekly post, sees the slot only: stage 0, no decorations, no name,
`plain: true`. One helper (`shift_quest__plot_json`) builds both maps. Neither
map carries a Discord ID, member ID or display name.
`shift_quest_island_map` refuses a null caller (`not_started`); the weekly
post uses `shift_quest_island_post_map()`.

**Check-ins.** `shift_quest_progress.kind` is `tap` (no words, one per member
per Bangkok day, a second tap returns the first) or `note` (`changed`
required). The journal (`/progress`) lists and edits notes only. The report
counts taps; nothing else reads them.

**Season counting (wave 2).** One helper, `shift_quest__season_approvals`,
decides every season number: demo-day bars, dated unlocks, the island goal,
squad progress and the report. A milestone counts when its quest was approved
and its qualifying submission falls in the window, in Bangkok whole days:
from `starts_on` 00:00 to the end of demo day (bars), of the unlock's deadline
or of the goal deadline. The qualifying submission is the first of the
unbroken chain that ended in the approval: a clarification or a replaced
revision continues it, a withdrawal or a decline breaks it. So slow review
never costs a student, and a submission pending at the cutoff counts once it
is approved. The count is one per distinct milestone, plus each further
approval of milestone 3 or 4 the reviewer confirmed as distinct (a new real
test counts again). The tree stage stays all-time, so a new season starts
from the current tree but counts only fresh work.

**Pending at the cutoff.** The demo-day bars have two numbers. The confirmed
one counts approved work only and is the only one that grants anything. The
provisional one (`shift_quest__season_pending`, `__season_count`) also counts
milestone work submitted in the window that a mentor has not decided yet (a
pending revision, or a declined one under appeal), by the same chain rule; it
adds only milestones not already counted. So a student whose slot rests on
work still waiting at the cutoff sees "รอพี่เลี้ยงยืนยัน" on `/island` instead
of losing the slot, and staff see in `/admin report` how many projects reach
each bar with pending work and how many milestone submissions they still have
to decide before demo day. A decline takes it back out; work sent after the
cutoff never counts.

**Seasons.** At most one `active` season. A gallery table needs at least
`table_bar` counted milestones including milestone 2; a stage slot needs
`stage_bar` including milestone 3. `shift_quest_admin_season` creates a
season by name or updates a draft or active one: on an update every argument
left null keeps its stored value, and `p_clear_goal` removes the goal.
`p_surprise_cap` (default 1, 0 or more, `bad_input` below 0) is the season's
cap on surprise recognitions per member.

**Island goal.** `goal_target` non-archived projects with `goal_milestone`
counted by the goal deadline. When it is reached, `goal_reached_at` is set
once (under the season row, which is locked last), and the goal stays
reached even if a project is archived or erased later. Changing the goal's
milestone, target or deadline clears the mark and checks it again at once.

**Dated unlocks.** Every active member of a non-archived project that meets
an unlock (counted milestones by the end of its deadline) earns it, whenever
that happens: when the unlock is created or edited, when the season is
created, edited or activated (a sweep over the whole island), after every
approval on the project, and when a member joins the project
(`shift_quest__on_project_join`, called by `shift_quest_project_create` and by
`shift_quest_project_respond` on accept). It does not matter when the unlock
was created, when the member joined or when they were last active: a student
who joins a project that already meets an unlock earns it at once (a join
grant has no actor on its ledger row). A join that races the approval reaching
a count waits on the plot lock and then earns it too. Each grant is recorded once (primary
key) and credited at most once, under the unlock's published rule and its
cap, with source key `unlock:<unlock>:<member>` and ledger kind `award`. A
grant made while awards are off is recorded and told with no coins, and is
never paid later. Once anyone earned an unlock it can only get easier (a
lower count or a later deadline) and its rule stays; anything else is
`unlock_has_grants`.

**Recognitions.** Admin-only, never oneself, 0 to 200 coins (0 means words
only; coins need awards to be live). Per member per season, counted under the
member lock after the request-key lookup: at most the season's `surprise_cap`
surprise recognitions (no category; 1 by default, and 1 when no season is
active), and at most 200 coins from all recognitions (`recognition_cap`).
Category awards (demo-day categories) have no count cap. A retry with the
same request key is still a no-op. The student sees the reason in their
notice. The reason and category are written by an admin and **kept forever,
also after the member is erased: never put a name or personal detail in
them.** The ledger row says only `recognition`.

**Squads.** Behind a switch, `shift_quest_settings.squads_enabled`, off by
default and set with `shift_quest_admin_set(actor, 'squads', 'on'|'off')` (no
blockers; `/admin feature squads`). While it is off, starting a squad,
inviting and answering an invite are `squads_off`; viewing, leaving and
withdrawing an invite still work, so nothing that exists is lost. The session
carries it as `settings.squads`. Students only: anyone holding a staff role
can neither start nor join nor be invited to a squad (`staff_no_squad`), and
granting a role ends the holder's squad places and invites. At most 4 active
members and live invites; an invite lives 3 days, and the member who sent it
can withdraw it (`shift_quest_squad_withdraw`), which also removes it from
the invitee's inbox. A window of 1 to 28 days (default 14) from the day it is
created. A squad is `forming` until 3 members are active, then `running`, then
`ended` after its window. A member is active in at most one squad per season
whose window has not ended. Only active members see a squad. Its progress is
one group number, shown only once the squad is not forming: counted
milestones in the window on the active members' current projects, each
project once. No member ever carries a number of their own.

**Weekly island post.** `shift_quest_enqueue_island_post` (the bot calls it
every minute) queues one `island_weekly` post to the celebrate channel on
Mondays 18:00 to 18:59 Bangkok time, only during an active season and while
sharing is on, deduplicated per ISO week (`island:2026-W47`). Its params hold
the week and goal counts only; the bot draws the image from
`shift_quest_island_post_map()` when it sends.

**Erasure** ends the member's squad places and invites, renames every squad
they created to `[erased]` (also when others are still in it) and puts
`[erased]` in place of its name in other people's squad invites, does the
same for the name of a project they created that no one is left on in
project invites, clears their name consent, and deletes their taps with the
rest of the journal. Earned unlocks and recognitions stay, keyed by the
opaque ID. **The report** adds an `island` block: projects by stage, taps in
the window, members resting, and with wave 2 the active season's goal, the
bar counts confirmed and with pending work (`projects_at_table_bar`,
`projects_at_stage_bar`, `projects_at_table_bar_with_pending`,
`projects_at_stage_bar_with_pending`), `milestones_pending_review`, unlocks
earned, recognitions, running and forming squads. No names.

Functions the bot calls (all take the caller's Discord ID first, except the
worker functions):

| Function | Returns |
|---|---|
| `shift_quest_schema_version()` | 1 (wave 1 alone) or 2 (with seasons) |
| `shift_quest_island(actor)` | `{project: null \| {id, name, route, slot, stage, milestones_done[], next_milestone, show_name, name_visible}, milestones: [{milestone, template_id, title, purpose, evidence_criteria, reflection_prompt, done, in_flight: null \| {instance_id, state, version, mine, owner}}], taps_today, resting, season}`; `season` is null without an active season, else `{id, name, starts_on, ends_on, demo_day, days_to_demo, table_bar, stage_bar, stage_at_cutoff, season_milestones[], qualifies: 'stage' \| 'table' \| null, stage_with_pending, qualifies_with_pending: 'stage' \| 'table' \| null, goal, unlocks: [{id, label, milestone_count, deadline, expired, earned}]}` (`stage_at_cutoff` is the confirmed count; the `_with_pending` pair also counts work in the window a mentor has not decided yet) |
| `shift_quest_island_map(actor)` | `{plots: [{slot, stage, visitor, key, helper, lantern, name, mine, plain}], goal: null \| {milestone, target, count, deadline, unlock, reached, reached_at}, season: null \| {name, demo_day, days_to_demo}}`; a null actor is `not_started` |
| `shift_quest_island_post_map()` | the same shape as seen by an outsider (`mine` always false) |
| `shift_quest_island_optin(actor, project \| null, show)` | `{project_id, show_name, project_name_visible}` |
| `shift_quest_checkin(actor, note \| null)` | `{kind, taps_today, progress_id}` |
| `shift_quest_milestone_submit(actor, milestone, proof, reflection, artifact_url)` | `{instance_id, submission_id, revision, version, created}` |
| `shift_quest_rest(actor, on)` | `{paused, resumed}` |
| `shift_quest_squad_create(actor, name, target, days = 14)` | squad id |
| `shift_quest_squad_invite(actor, squad, invitee)`, `shift_quest_squad_respond(actor, squad, accept)`, `shift_quest_squad_withdraw(actor, squad, invitee)`, `shift_quest_squad_leave(actor, squad)` | nothing |
| `shift_quest_squad_mine(actor)` | `[{id, name, status, starts_on, ends_on, phase, running, members_active, invite_expires_at}]` (active places and live invites; staff get `[]`) |
| `shift_quest_squad_view(actor, squad)` | `{id, name, target, starts_on, ends_on, days_left, phase, running, members_active, milestones_gained, members: [{name, me}]}`; `milestones_gained` is null while `forming` |
| `shift_quest_admin_season(actor, name, starts_on, ends_on, demo_day, table_bar, stage_bar, goal_milestone, goal_target, goal_deadline, goal_unlock, activate, clear_goal = false, surprise_cap = null)` | the season with its unlocks and `surprise_cap` (by name: creates, or updates a draft or active one, keeping stored values for null arguments; activating closes the other) |
| `shift_quest_admin_unlock(actor, season, label, milestone_count, deadline, rule_key)` | unlock id (by label: creates or updates, then grants it to everyone who meets it) |
| `shift_quest_admin_recognize(actor, target, amount, reason, category, request_key)` | `{entry_id, recognition_id, duplicate, balance?}` |
| `shift_quest_enqueue_island_post(now)` | 1 if queued, else 0 |

`shift_quest_review_decide` also returns `island: {milestone, stage,
unlocks_earned}` and puts `milestone` and `stage` in the `review_approved`
notice. New notices: `unlock_earned {label, amount}`, `recognized {category,
amount, reason}`, `squad_invite {squad_id, name, from, actor_id}`. New
refusals: `milestone_done`, `milestone_open`, `milestone_appealed`,
`awards_paused`, `bad_dates`, `not_squad_member`, `staff_no_squad`,
`squad_full`, `squad_limit`, `squad_closed`, `squads_off`, `recognition_cap`,
`unlock_has_grants`. `shift_quest_session` adds `settings.squads` and
`shift_quest_admin_status` adds `settings.squads_enabled` (both false without
wave 2); `shift_quest_admin_set` takes the key `squads`.

### Roots (schemas 10 and 11)

`20261113090000_shift_quest_roots` (design:
`docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md`)
lets reflections grow a tree's **roots**, a second layer drawn over the
tree's soil. The 7 stages still come only from mentor-confirmed milestones,
and coins and shop gates stay on stage. Nothing new is stored: roots are
counted from the progress journal at read time.

- **What counts.** A `shift_quest_progress` row with `kind = 'note'` whose
  `learned` has at least 10 characters (the journal trims it on write),
  whose `project_id` is the tree's project (the writer's current project when
  they wrote it), by someone who is an active member now. At most 3 count per
  member per Bangkok day (`created_at` in Asia/Bangkok), the earliest first.
  A member who leaves takes their reflections along; erasure already deletes
  the journal. Private and team notes count alike.
- **What is shown.** `shift_quest_island_roots()` (bot and website, no
  caller) returns `[{slot, roots}]` for drawn plots with roots above 0: level
  1 (1 to 4 counted), 2 (5 to 14) or 3 (15 or more). Never a count, a name,
  an id or journal text. Only plots every active member agreed to show (and,
  with `consent_required`, have consent) get roots, so a quiet team's
  writing is never measured in public; the scene also draws roots 0 on every
  plain plot. From schema 11 (`20261113173515_shift_quest_own_roots`),
  `shift_quest_island_my_roots(actor text)` returns only the current project's
  level, including quiet trees, or 0 for no project or an archived project.
  It shares an internal counter with the public read. Only trusted server
  roles can call it.
- **Where.** The live post, `/island` and the island page (picture, living
  canvas and the bot's GIF), merged by slot in `bot/src/quests/island/roots.ts`.
  The member page, picture route and ephemeral `/island` override only the
  caller's own plot from schema 11, falling back to the outsider value on
  error or older schemas. The public live post never uses the own-tree read.
  Both read public roots only from schema 10 and draw no roots below it or when the
  read fails (logged once per cause); the page and the post never fail
  because of it. Tested in `supabase/tests/shift_quests/roots.ts` and
  `bot/src/quests/__tests__/roots.test.ts`.

### Quest card and campfire encounters (Discord)

Phases 4 and 5 of
`docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md`.
No migration and no new command: the bot already executes the board
functions (the grant loop of `20261111090900`), and nothing new is stored.

- **Quest card** (`bot/src/quests/handlers/board.ts`). "📜 กระดานเควสต์" on the
  island card and the live post's panel (the panel's `sq|lp|quests` button,
  which used to open 📋) reads `shift_quest_board(actor)`, the web board's own
  read, and shows one line per quest with its state: the next main quest for
  the tree (the lowest one outside 6 and 7 not yet passed) and the caller's
  other open main quests, the community quests (6 and 7), and the side quests
  that are not locked (the caller's open ones first; locked ones are counted,
  and all of them are in the menu). Tile states come from
  `lib/supabase/shift-quests/board.ts`, as on the web. Actions: 🌟 opens the
  island's milestone picker (`shift_quest_milestone_submit`), a side quest's
  card offers 🧭 take it (`shift_quest_side_choose`) and 🌟 send it
  (`shift_quest_side_submit`, proof and the quest's question), or opens the
  caller's own open one; 📋 งานที่ส่งไว้ (`shift_quest_my_quests`) stays one
  tap away; "🌐 กระดานบนเว็บ" opens `/shift/island?at=board`, which opens the
  board sheet. Side quests pay only through their mentor review, as on the web.
- **Encounters** (`bot/src/quests/rounds.ts`, `handlers/rounds.ts` `rd_enc`,
  copy `R.encounters`, DRAFT). On about one 🌊 rest in three (a hash of the
  round number, so a restart never rerolls), the round's public message adds
  one moment from the lore (a person from the boat, a bottle, a gull, a mentor
  passing) and a button. Everyone at the fire sees the same lines and names no
  one. The button answers privately, deferred first and never an edit of the
  round message: it reads the presser's board and shows one side quest open
  to them, starting from the same place in the board's order for everyone in
  that round (also from the round number), on their project's route first.
  With none open it says so and points to the board (or to claiming a plot).
  Nothing is stored per person, and being at the fire pays nothing.

Tested in `bot/src/quests/__tests__/board.test.ts` and `rounds.test.ts`
(no new database call order in existing flows, so `supabase/tests` is
unchanged).

## Before a pilot

1. Decide the spec's open items that block each feature (amounts, caps, team
   allocation, terms, budget, stock, fulfillment owner, retention,
   eligibility, moderation owner). The bot runs without them; only the
   features that need them stay off.
2. Have the Thai in `bot/src/quests/copy.ts` and the starter quests reviewed
   (see "Thai copy review" in `AGENTS.md`).
3. Decide how this sits with **shift-voice**: that module records voice time,
   mic, screen share and camera for students of a SHIFT round in session.
   The quest bot never uses those, and its intro says only that *quests* do
   not count voice time or record audio or screens. If pilot students can
   also be in a running round, tell them, or exclude them. The campfire
   (schema 7) is separate: its own listener, its own tables, live presence in
   the coworking channel only, no history (see "What is stored").
4. Apply the migrations (`supabase db push`, production, after an explicit
   go), set the `shift_quest_bot` password with `pnpm shift:role-passwords`
   (it sends a SCRAM verifier), and put its pooler URL in `bot.env` as
   `SHIFT_QUEST_DATABASE_URL`. The whole order, with commands and checks:
   [`docs/runbooks/shift-high-island-rollout.md`](../runbooks/shift-high-island-rollout.md).
5. Make the first admin once, from a trusted shell:
   `select public.shift_quest_bootstrap_admin('<discord user id>', '<name>');`
6. Add `shift-quests` to `BOT_MODULES`, deploy with `bot/deploy.sh`, run
   `pnpm bot:register`, then in Discord: `/admin channel` (help, staff,
   celebrate, coworking; coworking may be a voice channel the bot can view,
   which lights the island's campfire), `/admin role` for mentors, `/admin student-role`
   for the pilot cohort, and `/admin status` to see what is still missing.

## Web board and shift_quest_web

The island website (`/shift/island`, plan:
[`docs/designs/shift-high-island-web.md`](../designs/shift-high-island-web.md))
reads and writes through `20261111090900_shift_quests_board.sql` and
`20261111091000_shift_quests_board_fixes.sql`, applied after wave 2. They add:

- **Side quests.** Templates with `side = true` (never a milestone, so they
  never grow the tree), plus `route_keys` (null: every route; a soft filter
  shown as `route_match`, any route may take any side quest),
  `requires_milestones` (main quests the current project must have approved),
  `requires_slugs` (side quests the project must have approved, by any
  member), `branch_of` (the main quest it hangs off on the board) and `icon`.
  One `BEFORE INSERT` trigger on `shift_quest_instances`
  (`shift_quest__side_gate`) refuses a side quest without a project
  (`no_project`) or with a prerequisite missing (`quest_locked`), on every
  path: the web functions, the bot's `shift_quest_choose`, a direct insert.
  `shift_quest_templates(actor)` (the bot's browse) leaves side quests out.
- **`shift_quest_board(actor)`**: the project, the seven main quests (with
  `in_flight` as in `shift_quest_island` and `mine`), the published side
  quests (`locked`, `missing_milestones`, `missing_slugs`, `approved` in the
  project, `mine`), the caller's proposed quests and open help requests.
  `mine` is only ever the caller's own quest.
- **`shift_quest_side_choose(actor, template)`** and
  **`shift_quest_side_submit(actor, template, proof, reflection, url)`**:
  one-step side quests like `shift_quest_milestone_submit`. Refusals:
  `quest_locked`, `quest_done` (a non-repeatable side quest the project
  already has approved; it only blocks a new quest, never the caller's own
  open one), `quest_appealed`, plus the usual ones. A declined
  non-repeatable side quest is archived when the student starts it again,
  so "try again" works. A side quest belongs to the project:
  `shift_quest_choose` counts `not_repeatable` for side quests in the current
  project only, so a student who moves to a new project can do it again there.
- **`shift_quest_milestone_start(actor, milestone)`**: start a main quest from
  the board without submitting (it becomes the caller's active quest and shows
  as held to teammates). Same gates as `shift_quest_milestone_submit`, through
  one shared helper (`shift_quest__milestone_open`): the advisory lock,
  `milestone_done`, `milestone_open` (a teammate holds it),
  `milestone_appealed`; the caller's own open quest is reused, a paused one
  resumed.
- **`shift_quest_resume(actor, instance)`**: resume one paused quest the
  caller owns, of any kind (rest pauses proposed quests too, and
  `shift_quest_submit` refuses a paused one).
- **Caps on group posts** (`shift_quest__cap`, bot and website alike):
  `shift_quest_help_create` refuses with `too_many_open` at 3 open or claimed
  requests, or 5 asked in the last hour; `shift_quest_propose` at 5 open
  proposed quests a mentor has not agreed yet.
- **Eleven draft side quests** in Thai, `status = 'draft'`, no reward rule.
  **Their copy needs the founder's multi-model Thai review (`AGENTS.md`)
  before an admin publishes each slug** with `/admin template` (or
  `select public.shift_quest_admin_template_state('<admin discord id>', '<slug>', true);`).
  Nothing shows on the board until then. The sandbox publishes them all.
- **`shift_quest_schema_version()` = 4.** The bot needs 2 and keeps working;
  the website needed 4 until the canvas link below.
- **SHIFT canvas link, schema 5** (`20261111091100_shift_quest_canvas_links.sql`,
  apply after `091000`; the website needs 5, the bot still 2):
  `shift_quest_canvas_links` (one row per quest project: whiteboard board id,
  canvas frame id and project tag, no text; RLS on, no policies) and
  `shift_quest_canvas_get(actor)`, `shift_quest_canvas_link(actor, board, frame, canvas_project)`,
  `shift_quest_canvas_unlink(actor)` on the web allowlist. The website re-verifies
  the link against the whiteboard on every read and snapshots ticked notes into
  `evidence` through the existing submit functions, so review, export and erase
  are unchanged. Sandbox: `psql -h 127.0.0.1 -p <port> -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20261111091100_shift_quest_canvas_links.sql`.
  The three canvas functions are website-only: the bot never gets them (only
  the website can check a canvas before linking it).
- **Ownership checklist on the web, schema 6** (`20261111091200_shift_quest_ownership_web.sql`,
  apply after `091100`; the website needs 6, the bot still 2):
  `shift_quest_ownership_get(actor)` returns the current project's five items
  as `{item, state, mentor_held, updated_at}` (no notes, continuation paths or
  help ids), website-only like the canvas functions. Quest 5 (ถือกุญแจเอง)
  shows the checklist read-only, lights its first เสร็จเมื่อ item when every
  item is done (and not on a mentor's account), and `submitMainQuest`
  snapshots the states under the proof when quest 5 is sent; proof and
  checklist over 2000 characters together is refused (`text_too_long`), never
  cut. The checklist is still ticked in Discord (`/project ownership`).
  **Any later migration that repeats the bot's grant loop must keep excluding
  `shift_quest_canvas_*` and `shift_quest_ownership_get`**, or end with the
  same explicit `REVOKE ... FROM shift_quest_bot`.
- **Live island post and suggestions link, schema 8**
  (`20261111094000_shift_quest_live.sql`, apply after `093000`; the website
  still needs 6, the bot still 2, and the live post starts only from 8):
  - Settings gain two nullable channels, set with `/admin channel`:
    `live_channel_id` (`kind:live`, a text channel) and `suggest_channel_id`
    (`kind:suggest`, a forum or text channel students can see and post in;
    the command refuses a staff-only one). Below schema 8 `admin_set`
    refuses both keys with `bad_input`.
  - **The live post** (`bot/src/quests/live.ts`): one message in the live
    channel that the bot edits in place, about 5 seconds after every gateway
    ready, then when something shown changes (checked once a minute) or
    every 10 minutes. It shows the same outsider view of the island as the
    weekly post (names and stages only for fully consented plots), tree and
    goal counts, the Demo Day countdown, and the campfire as a count only.
    The picture is a looping GIF in the light of the Bangkok hour
    (`bot/src/quests/island/gif.ts`), or the still PNG when the GIF is over
    2 MB or fails to draw.
    When Discord refuses the picture (no Attach Files, 50013, or too large,
    40005) the card goes out once more without it.
  - **Stored**: `shift_quest_live_state`, one row with the channel id and
    message id of the post (no text, no people; RLS on, `service_role`
    only). `shift_quest_live_post()` reads it with the island data and
    `shift_quest_live_mark(channel, message, previous)` writes it as a
    compare-and-set, so two overlapping bot processes never leave two posts.
    When nothing usable is stored, the bot reuses its own pinned post with
    the marker line before posting and pinning a new one. Both functions are
    bot-only, never the website.
  - `approved` adds up the confirmed milestones of the trees every member
    agreed to show, so it is always the sum of the stages on the picture.
    Quiet projects never count: students watch every edit, and a total that
    included them would give a quiet project's stage away as teams opt in
    one by one (compare two edits, or subtract your own team's stage).
  - **The website** reads the suggestions channel with
    `shift_quest_island_links(actor)` (website-only, same gate as
    `_island_map`) and shows "เสนอไอเดีย / แจ้งบั๊ก" in the island's ⋯ menu as
    `https://discord.com/channels/<DISCORD_SHIFT_GUILD_ID>/<channel>`, hidden
    while unset.
  - After deploying the bot, run `pnpm bot:register` once so the new
    `/admin channel` choices appear.

**The web role.** `shift_quest_web` is a login like `shift_quest_bot`:
`NOINHERIT`, `statement_timeout` 8s, 20 connections, `USAGE` on `public`, no
table privilege, no helper. Among the `shift_quest_*` functions it executes
exactly this allowlist: `shift_quest_schema_version`, `_session`, `_start`,
`_island`, `_island_map`, `_board`, `_checkin`, `_rest`, `_resume`,
`_island_optin`, `_milestone_start`, `_milestone_submit`, `_side_choose`,
`_side_submit`, `_propose`, `_submit`, `_help_create`, `_project_create`,
`_project_list`, `_project_respond`, `_canvas_get`, `_canvas_link`,
`_canvas_unlink`, `_ownership_get`, `_campfire` (schema 7),
`_island_links` (schema 8), the player functions (schema 9) and
`_island_roots` (schema 10). No review, staff, admin, outbox or data
function. The migrations revoke every `shift_quest_*` function from it, then
grant the list by full signature and stop if one is missing. `run-local.sh`
(`check_privileges`), `web_board.ts` and `web_canvas.ts` hold the same list
and fail on any extra or missing grant.

**Outside `shift_quest_*` it is not closed by default.** A LOGIN role is
always a member of `PUBLIC`, and the role has `USAGE` on `public`, so it can
execute any other function in `public` that still grants `EXECUTE` to
`PUBLIC` (the Postgres default unless a migration revoked it), over a raw SQL
session where `auth.uid()` and `auth.role()` are NULL. The same is true of
`shift_quest_bot`. The local sandbox only has the quest schema, so its
`check_privileges` cannot see these; run the runbook check below on
production before giving either role LOGIN.

**Every future student function the website needs must be added to the web
allowlist on purpose:** a later migration that grants it, plus the two test
lists. The grant loop at the end of each migration never touches
`shift_quest_web`, so a new function stays closed to the website until then,
and a function that is dropped and created again (a signature change) loses
its grant and fails the check.

Production, after an explicit go and after the bot's migrations:

1. Apply the migrations (`supabase db push`, production).
2. Check what else the logins could run (read-only; expect no rows). Every
   row is a function in `public` outside `shift_quest_*` that the role can
   execute through `PUBLIC`; revoke it from `PUBLIC` in an additive migration
   (`REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;`, then grant the roles that
   need it) before step 3:

   ```sql
   SELECT r.role, p.oid::regprocedure AS fn, p.prosecdef AS security_definer
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace,
     (VALUES ('shift_quest_web'), ('shift_quest_bot')) r(role)
   WHERE n.nspname = 'public'
     AND p.proname NOT LIKE 'shift\_quest\_%'
     AND p.prosecdef
     AND has_function_privilege(r.role, p.oid, 'EXECUTE')
   UNION ALL
   SELECT r.role, c.oid::regclass::text, NULL
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace,
     (VALUES ('shift_quest_web'), ('shift_quest_bot')) r(role)
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
     AND has_table_privilege(r.role, c.oid, 'SELECT, INSERT, UPDATE, DELETE')
   ORDER BY 1, 2;
   ```

   Invoker functions (`prosecdef` false) cannot touch a table the role has
   no privilege on, so the first half lists definer functions only; the
   second half lists any table or view the role reaches through `PUBLIC`.
3. From a trusted shell, never in this repo: `pnpm shift:role-passwords`
   (`scripts/shift-quests-set-role-passwords.ts`) runs
   `ALTER ROLE ... WITH LOGIN PASSWORD '<SCRAM verifier>'` for both logins,
   refuses while step 2 still returns rows, and logs in as each to prove it.
   Step 2 and the grant checks are in one read-only file:
   `supabase db query --linked -o table -f docs/runbooks/shift-high-island-checks.sql`
   (no rows means all is well).
4. The pooler user is `shift_quest_web.<project ref>` on the Supavisor
   transaction pooler (port 6543, TLS against Supabase's CA). Set
   `SHIFT_QUEST_DATABASE_URL=postgresql://shift_quest_web.<project ref>:<password>@<pooler host>:6543/postgres`
   in Vercel (Production only), then redeploy. The pool is attached to the
   function lifecycle with `@vercel/functions` `attachDatabasePool` (idle
   timeout 5 s), so Fluid Compute closes idle connections before an instance
   sleeps; it keeps no session state and sends only unnamed statements, as
   transaction mode requires.
5. Publish the side quests one slug at a time, after the Thai review.

Locally: `QUEST_SANDBOX_PORT=55451 QUEST_SANDBOX_ADMIN_ID=<your Discord user id> bot/quests-sandbox.sh --db-only --reset`
prints the web URL (`postgresql://shift_quest_web:sandbox@127.0.0.1:55451/postgres`,
for `SHIFT_QUEST_DATABASE_URL` with `pnpm dev`) and a command that approves
every pending submission as the stand-in reviewer `100000000000000701` (you
cannot approve your own work). Tested in
`supabase/tests/shift_quests/web_board.ts`.
