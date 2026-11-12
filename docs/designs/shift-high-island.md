<!-- /autoplan restore point: "/Users/bunyasit/dev/passionseed/web-shift-quests/.gstack/tmp/autoplan/feat-shift-high-quests-autoplan-restore-20261111-013654.md" -->
# SHIFT High Island: plan

Branch `feat/shift-high-quests` (worktree `web-shift-quests`). Builds on the
quest bot already on this branch (see `docs/features/shift-high-quests.md`).
Nothing is deployed; the migrations are not applied to production.

## Problem

SHIFT High (the alumni community) is slow: little urgency, few students keep
building. Projects tied to competitions move faster. The quest bot as built is
form-heavy (5-field modals) and reads as homework. The founder wants it simple,
game-themed (a small pixel island), aimed at real long-term projects, compatible
with self-determination theory (SDT), and wants competitions or prizes to jump-start
action.

Premise (from an outside advisor, accepted): competition projects move faster mainly
because of a fixed date, an audience and a team, not the prize. Season 1 is built
around those three; prizes stay small and symbolic.

## URGENT, outside this plan

- [High] `pnpm bot:register` on main registers commands and then logs in as a full bot (`bot/src/index.ts:65-70` at HEAD); running it while production runs starts a second instance, and shift-voice closes and reopens every open voice row on startup, corrupting minors' voice participation data. Fix on main in a separate PR; until then never run it with production credentials while the bot is up.

## Implementation plan

### 1. Island model (database)

Edit the unapplied migrations in place (nothing is in production yet), keeping
them additive and idempotent.

- `shift_quest_templates.milestone smallint` (1..7) for the 7 starter quests:
  1 claim a plot (find something worth fixing), 2 it exists, 3 a real person
  tried it, 4 they came back or you learned why not, 5 you own it (take the keys),
  6 you helped another builder, 7 you improved the community.
- Tree stage of a project = number of distinct milestones with an approved quest
  on that project (any order: autonomy). Time and inactivity never lower it; nothing wilts.
- Island-name consent is per member, on the project membership (default not consented): the
  project name appears in shared island posts only while every active member has consented.
- `shift_quest_plots (project_id pk, slot int unique)`: a stable plot position,
  assigned on project creation.
- `shift_quest_island(p_actor)`: the caller's plot, stage, which milestones are
  done, the suggested next milestone (lowest not done), quests in flight,
  and season status (below).
- `shift_quest_island_map(p_actor)`: every plot for rendering: slot, stage,
  decorations (milestone 3 visitor, 5 key flag, 6 path to helped neighbour's plot,
  7 plaza lantern), opt-in name or null. No member identities.
- Progress check-in without text: `shift_quest_progress.kind` ('tap' | 'note');
  `changed` required only for notes. A tap never grows the tree and never mints coins.

### 2. One command, one-tap actions (bot)

- `/island` replaces `/quest`, `/progress` and status for students. Reply: the
  island image (private), your tree stage, next milestone, and buttons:
  - 🔨 "ทำต่อวันนี้" (today I worked on it): a tap check-in, optional one line.
  - 🌟 "ถึงขั้นต่อไปแล้ว" (reached the next milestone): pick which milestone,
    then one modal with two fields: proof (a link or one line) and one portfolio
    question (the template's reflection prompt). Creates the milestone quest if
    needed and submits it for review.
  - 🧱 "ติด" (stuck): the existing help flow.
  - 🌙 "พัก" (rest): pauses in-flight quests. Trees do not die.
- Kept for staff and power users: `/review`, `/admin`, `/fulfill`, `/project`,
  `/help`, `/inbox`, `/coins`, `/rewards`, `/settings`, `/data`, `/celebrate`.
  `/quest` and `/progress` are no longer registered.
- Review copy becomes "a mentor visits your tree"; approval grows the tree.

### 3. Island image

- Pure-JS renderer (`pngjs`: in the root `package.json`; `bot/deploy.sh` must also stage it in the bot `package.json`) composing sprite PNGs with
  nearest-neighbour scaling: no native binary in the Docker image, no fonts
  (names go in the message text; plots carry number markers).
- Sprites authored as pixel matrices in code by Codex, exported to
  `bot/assets/island/*.png` with a reproducible generator script and a contact
  sheet: tiles (water, sand, grass, path, plaza), tree stages 0..7, decorations
  (visitor, key flag, lantern), festival banner.
- Private `/island` image marks "your plot". A weekly island post in the
  community channel shows the island with only opt-in names, via the outbox.

### 4. Season 1 (competitions and prizes)

Fixed dates, an audience and squads; small prizes; nobody ranked.

- `shift_quest_seasons`: name, starts/ends, demo-day date, qualifying milestone
  counts (table slot and stage slot), the island goal (N projects reaching
  milestone 3 by a date), and its unlock text. Admin-set; one active season.
- **Demo day slot:** a project at the table bar (default 2 milestones) by the
  cutoff gets a gallery table; at the stage bar (default 3) a stage slot. Shown
  on `/island` as a countdown and "you qualify" state.
- **Island goal:** an aggregate counter on every island post ("23 of 30 trees have
  had a real visitor"). Reaching it unlocks something for everyone. No names.
- **Threshold unlocks:** reaching a milestone count by a meetup earns the same
  small symbolic item for everyone (configured per season; delivered with
  mentor feedback; never tied to speed). Recorded as a season recognition with a unique source key, so it is idempotent and
  capped; Passioncoin moves only if awards are on and a season rule gives an amount.
- **Category awards at demo day:** several named categories (for example "best
  lesson from a failed test", "most useful to another builder"), decided by a
  small panel plus a peer vote, in the room. The bot only records winners as
  season recognitions with a reason. No podium beyond winners.
- **Squads (opt-in):** 3 to 4 builders, a two-week sprint with a self-chosen
  target, celebrated as a group. `shift_quest_squads` + members; squad progress =
  milestones gained in the window, shown only to the squad.
- **Surprise recognition:** an admin season recognition with a reason, capped per member per season
  (new: no admin award path exists today; ledger awards come only from approved quests).
- Avoided: coin or progress leaderboards, winner-takes-all cash, rewards for
  check-in volume or speed, random prize draws, "most users" contests, mentor 1:1
  time as a prize, streaks.
- Nobody who misses out loses anything: trees stay, everyone who presents gets
  written feedback and a portfolio verification note, Season 2 starts from the
  current stage.

### 5. Copy

Thai first, one file (`bot/src/quests/copy.ts`), island vocabulary (plot, seed,
tree, visit, rest, festival). No em dashes. Needs the Thai multi-reviewer pass
from `AGENTS.md` before a pilot.

### 6. Tests

- DB rules: stage math (any order, never decreases, taps do nothing), map has no
  identities and respects opt-in, season qualification at the cutoff, threshold
  unlocks idempotent and capped, squad visibility.
- Bot flows: `/island` → each button, milestone submit → mentor approval grows
  the tree.
- Renderer: deterministic output (hash) for a fixed map; image size limits.

### 7. Decisions the founder must make before launch

1. Season budget in baht (sets threshold items and whether redemption opens).
2. Mentor review capacity and a promised turnaround (suggested 48 hours).
3. Demo-day bars and whether a team project counts once or per member.
4. 2027 exam calendar check: M.6 exams around February and March may make that a
   dead window; weight the season to late March to May and to M.4/M.5.

### 8. Not in scope

Web version of the island, public pages, animated sprites, trading, cash prizes,
leaderboards, automated judging, image upload as proof (Discord attachment URLs
expire; revisit with private storage).


<!-- autoplan-accepted:ceo -->
- Deploy: `bot/deploy.sh` stages `pngjs` in the bot `package.json` dependencies, and before the old container
  is stopped it runs the new image once on the host (`docker run --rm <image> node --import tsx -e` importing the
  TypeScript renderer and rendering one PNG); a failure aborts the deploy and leaves the old container running.
- Season recognitions: threshold unlocks, the island-goal unlock, category awards and surprise recognition are
  stored in island tables separate from peer recognition shares (`shift_quest_shares`). Each grant has a
  unique source key: `unlock:<unlock id>:<member id>` for dated unlocks and the island goal,
  `season_award:<recognition id>` for category and surprise grants. Reasons hold no personal detail.
  Passioncoin moves only when awards are switched on and the season or unlock row gives an amount, as exactly
  one ledger row of kind `recognition` per grant. Grants are private (shown in `/island` and `/inbox`); category
  winners are announced in the room, and any channel post goes through the existing preview-and-consent share. Surprise recognition defaults to a cap of 1 per member per season (admin-set). Tests: a
  duplicate grant is a no-op; the cap is enforced; with awards off no ledger row is written.
- Per-milestone coins: in Season 1 no reward rule is attached to the seven milestone templates, so approvals
  grow trees without Passioncoin (founder decision 1 can change this with `/admin template-rule`).
- Island names: consent is per member on the project membership, default not consented, with a toggle in the
  project view reached from `/island` "more". A project's name appears in shared posts only while every active
  member has consented; a newly accepted or rejoining member starts not consented. Tests: one member
  withholding hides the name; a newly accepted teammate hides it until they consent.
- `/island` shows the member's current project. With several projects it offers a project picker; with none it
  replies with an empty plot and a button that starts `/project new`.
- Team milestones: at most one open (not approved, declined or archived) milestone quest per project and
  milestone; a teammate pressing the same milestone joins it as a contributor instead of opening a second one.
  A teammate who joins adds their own one-line part as a contribution on the pending revision; proof and
  reflection stay the submitter's. Dated unlocks and category awards go to every member active on the project
  when the grant is recorded (one row per member). An active project in a season is a non-archived project with
  at least one active member.
- Rest: rest pauses the member's own in-flight quests; a shared milestone quest pauses only when every
  contributor rests, and a submitted quest is never paused (its review goes on). Any later tap, milestone or a
  "back" button resumes them. The plot shows the rest marker only while every active member is resting, never a wilted tree or a
  decline.
- Stage is derived from approved milestones, so time and inactivity never lower it. An admin correction of a
  mistaken approval (`/season correct`, database checks the admin role, audited, reason required) is the only
  thing that can lower a stage. Derived values (stage, qualification, island-goal count, squad progress)
  recompute live; Passioncoin from the corrected approval is reversed with the existing `reversal` entry;
  unlocks and recognitions already earned stay, so no student loses a grant for a mentor mistake.
- Demo-day qualification counts a milestone when its eventually approved revision was submitted before the
  season cutoff, so mentor review time never costs a slot. The season has a review deadline between the cutoff
  and demo day, and `/review` lists pre-cutoff submissions first. Tests: a submission made before the cutoff and
  approved after it qualifies; one submitted after the cutoff does not. When the approved revision followed a
  clarification request, the quest's first submission time counts. A pre-cutoff submission still pending at
  the review deadline counts for the demo-day slot and is reviewed afterwards. The same submission-time rule
  decides dated unlocks and the island goal. Bars, dated unlocks and the island goal count approvals whose
  qualifying submission falls inside the season window, repeat approvals of milestones 3 and 4 included (a new
  real test counts again); the tree stage stays all-time and distinct, so Season 2 starts from the current tree
  but asks for fresh work. The table bar must include milestone 2 and the stage bar must include milestone 3,
  so a slot always has something working and something tested to show.
- Season dates: each season stores starts, ends, cutoff, review deadline and demo day; dated unlocks are child
  rows (date, milestone count, label). The island goal is one of those rows (kind goal: N projects at milestone
  3 by its date); when reached, every member with an active project in the season earns it. An admin sets them to the in-person SHIFT High meetups decided for
  Semester 2 (January to May 2027, company-brain decision log, 2026-10-30), weighted to late March to May per
  founder decision 4. No date is hardcoded.
- Weekly island post: runs only during an active season. The outbox gains an `island` channel key (set with
  `/admin channel`; the channel check is edited in place, allowed because the migration is unapplied) and image
  attachments. The post is queued once per season week (dedupe key per season and Asia/Bangkok ISO week) at an
  admin-set weekday and hour (default Monday 18:00 Bangkok) and rendered at send time from a system map
  function, `shift_quest_island_post_map()` (no actor, granted only to the bot role), that returns only consented
  names; `/island` keeps using `shift_quest_island_map(p_actor)`. The outbox send path for the island post calls
  the post-map function, never the actor map with a null actor. Tests: two enqueue runs in one week queue
  one post; a project whose members have not all consented shows only its plot number.
- External event target (student choice): any active member may set, replace or clear one optional target
  event per project (name up to 80 characters, a date), such as a real competition, from the project view;
  after its date it shows as past until replaced or cleared. `/island` shows its countdown privately; it never appears in
  the island map or any post. Tests: a past date is refused; the field is absent from the map payload.
- Mentor visit wait: the promised turnaround is a setting in hours (default 48, founder decision 2). `/island`
  shows when a milestone was sent and that a mentor visit is pending. The staff channel gets one notice per
  submission still waiting past the turnaround, with the quest title and plot number only. Tests: one notice per
  submission; none after a decision.
- Pilot health: `/admin report` adds island counts for the period: distinct students who tapped, milestones
  sent and approved, median and longest review wait, help requests, and how many students are quiet (no tap,
  note, submission or help request for 14 or more days), as counts with no names. Test: counts on fixture data;
  no member identity in the payload.
- Sprite review gate: the founder approves the sprite contact sheet before the pilot. Renderer tests hash the
  decoded RGBA pixels, not the compressed PNG bytes, so a Node or zlib upgrade cannot break them.
- Renderer failure: if rendering throws (missing sprite, bad map), `/island` still replies with the text view
  (stage, next milestone, buttons) and logs the error class only; the weekly post retries through the outbox.
  Test: a missing sprite yields the text reply, not an error.
- Growth feedback: an approval that grows the tree queues an `/inbox` notice (and the existing content-free DM
  nudge for students who opted in); the student's next `/island` shows the new stage with a "your tree grew"
  line. No image is ever sent by DM.
- Command surface: `/quest` (including `/quest status`) and `/progress` are no longer registered; `/start`,
  `/work` and every other existing command stay registered. A staff-only `/season` command (hidden by default
  permissions; the database checks the admin role) holds `set`, `unlock`, `award` (category or surprise) and
  `status` and `correct` (approval correction); the turnaround and the weekly post time are
  `/admin` settings. `/island` has a "more" button that opens the existing project, help, inbox, settings and data
  views, plus "propose my own quest" (the existing propose flow). Each quest in flight listed by `/island` has
  buttons for the existing answer-clarification, appeal and archive flows, so a student never needs `/quest`.
- Migrations: island tables and functions go in a new unapplied migration
  (`20261111090700_shift_quests_island.sql`) plus in-place edits to the unapplied `2026111109*` files; all ship
  in one `supabase db push` after an explicit go, additive and idempotent. The island migration enables RLS on
  every new table and ends with the same revoke and grant loop as `20261111090600`, so no `shift_quest_*`
  function reaches `PUBLIC`, `anon` or `authenticated`. Tests: the privilege check loops over every
  `shift_quest_*` function and table, and one suite applies the migrations once (not twice) before it runs.
- Data rights: `/data` export and `/admin data` erasure cover plots, island-name consents, squads and squad
  members, recognitions and unlocks, target events and tap check-ins. Tests extend the existing export and
  erasure regression in `supabase/tests/shift_quests/db_rules.ts`.
- Squads: a student starts a squad and invites 2 or 3 students, who accept like project invites (maximum 4).
  Invites expire after 3 days; a squad starts once 3 members (with the starter) have accepted; a student is in
  at most one active squad. The sprint runs for its chosen length from the start with one self-chosen target, then closes as history; a new sprint can start. Progress counts milestones approved in the window on each member's projects,
  once per project. Squad progress shows in `/island` to squad
  members only; a celebration uses the existing preview-and-confirm share flow and names only members who confirm it.
  Squads are built in wave 2 behind a `squads` feature switch, default off, turned on only if founder decision 5
  picks the island (the alumni board already has teams). The squad chooses its sprint length at start (3 to
  28 days, default 14), matching the existing `/squad` option. The bot creates no Discord
  channel or thread for squads; staff are never squad members, and nothing creates a 1:1 space between an
  adult and a student.
- Milestone 6 decoration: the helped project is optional and picked by plot number from projects the helper is
  not a member of; the path is drawn between plot numbers only.
- Island capacity: the layout has a fixed slot count set in code; an archived project keeps its slot; a project
  created beyond capacity still succeeds and sits on an overflow row; `/admin status` warns at 80 percent full.
  Test: the slot after the last layout slot lands on the overflow row.
- Delivery in two waves: wave 1 is the island model, `/island` and its buttons, the milestone flow, the
  renderer and the private image; wave 2 is seasons, recognitions, the weekly post and squads, landing before
  Season 1 opens. Each wave passes `pnpm lint && pnpm test && pnpm build` and `pnpm test:db:quests`.
- Success and stop rule: before the pilot opens, the founder writes a baseline (from the alumni board and
  session attendance, totals only) and a week-4 bar with a decision date; wave 2 and Season 1 software continue
  only if the bar is met. `/admin report` adds the evidence the bar needs: approved milestone 3 and 4 tests
  (repeats included), and mentor review minutes per approval (reviewer-entered, optional).
- Reviewer rota: founder decision 2 also names one reviewer and one backup for each pilot week.
- Pre-pilot checks (no code): count alumni active in the SHIFT Discord in the last 14 days (totals only); show the
  contact sheet and one rendered island to 3 or 4 students; confirm stages 4, 5 and 6 are distinguishable at
  Discord thumbnail size.
- Milestones 1 and 2 are self-declared: submitting them grows the tree at once and puts them in the mentor queue
  for comments only; milestones 3 to 7 still need mentor approval. A mentor can still correct a self-declared
  milestone with `/season correct`.
- Milestone 6 needs the helped student's confirmation through the existing peer recognition request (accept or
  decline) before it reaches review; unconfirmed help grows nothing.
- Public post privacy: in the weekly island post, a plot whose members have not all consented renders as a plain
  plot without stage or decorations; the island-goal total is the only aggregate shown. The private `/island`
  image still shows the student their own real stage.
- Demo day keeps an open work-in-progress corner where any builder below the bars gets feedback; the bars decide
  only gallery tables and stage slots.
- Verification note: a portfolio verification note states only what a mentor saw: the project's approved
  milestones and, for the named student, the proofs and contribution lines that student submitted. Team-wide
  grants never stand in for individual verification.
- Evidence export: `/data` adds a readable Thai text summary of the student's mentor-approved milestones (title,
  date, proof link or line, mentor feedback) next to the JSON, built from the existing export function.
- Founder decision 3 now decides only the demo-day bars (defaults 2 and 3 milestones); per-project counting
  and unlock recipients are set above.
- Founder decision 5 is added: which tool is the single home for weekly goals and check-ins, this island or the
  alumni board (company-brain `alumni.md`, Alumni board), so students never update both. It must be decided
  before the pilot opens to students, because the wave 1 tap check-in overlaps the board's check-ins.
<!-- /autoplan-accepted:ceo -->

<!-- autoplan-accepted:dx -->
- Command retirement: the register step lists the guild's commands, deletes the module's retired names (`quest`,
  `progress`), leaves every other command alone, and prints what it registered and removed. Launch order is
  `supabase db push`, then `bot/deploy.sh`, then the register step. A same-push rule keeps the old bot working
  between push and deploy: no function signature is removed or changed in place once applied.
- `--register-commands` exits after registering instead of logging in, so registering never starts a second
  bot. `bot/README.md` says so.
- Copy test: a Jest test extracts every `/command` named in `bot/src/quests/copy.ts` and fails if it is not in
  `questCommands()`; notices that pointed at `/quest` or `/progress` point at `/island` and its buttons.
- Error contract for operators: the generic error reply carries a short reference (the interaction ID), and the
  matching log line holds `ref`, the function name, the `sq:` code or SQLSTATE and the release revision, never
  student text. A test fails if any `sq:` code raised in a `shift_quest` migration has no entry in the Thai
  error copy. Unknown codes show the code to staff.
- Render errors are typed (`missing_sprite`, `bad_plot`, `too_large`) with the sprite key or slot; the log line
  carries the code and reference; `/admin status` counts render failures; the text fallback adds one line telling
  the student the picture failed, not their work. This replaces "log the error class only".
- Weekly post recovery: on final outbox failure, one staff notice names the reason code. Staff get
  `/season post preview` (renders the exact public post privately, needed because the post is about minors) and
  `/season post now` (one audited re-queue that bypasses the weekly dedupe). A weekly post still unsent at the end
  of its week expires instead of releasing late.
- Season command names: `/season new` and `/season edit` (autocomplete for the season, every option optional on
  edit, defaults shown in the reply) and `/season unlock add|edit|remove` replace `/season set` and `/season
  unlock`. `/season award`, `/season status` and the post commands stay.
- Season validation: each rule has its own refusal code (`season_dates_order`, `bar_out_of_range`,
  `bar_missing_milestone`, `season_active_exists`, `recognition_cap`) and the reply echoes the field and the
  value, for example "cutoff 2027-05-20 is after review deadline 2027-05-18". Setting an unlock amount while
  awards are off replies with a warning that no coins will move.
- Dates: season dates are Asia/Bangkok calendar dates and every deadline includes its whole day (to 23:59:59
  Bangkok); `/season status` echoes the exact times. Tests at 23:59 and 00:00 Bangkok.
- Approval correction ships in wave 1 as `/admin correct` (admin role, one transaction), replacing
  `/season correct`. The reply shows the stage before and after, the milestone removed, coins reversed or "no coins
  attached", any qualification change and grants kept; a repeat returns `already_corrected` with no side effect;
  a missing reason has its own code.
- Milestone modal: creating the milestone quest and submitting it is one database call with no side effect on
  refusal. The modal values are kept for 30 minutes in the existing drafts store; a refusal replies with a "send
  again" button that reopens the modal filled in, and a teammate collision offers "join as contributor" with the
  text carried over. Students get their own wording for a stale revision.
- Milestone 6: the helper picks the helped student with a Discord user select (the plot is derived from that
  student's project); the confirmation request expires after 7 days with a notice to the helper; a decline returns
  the milestone to not started with no penalty. This replaces picking by plot number.
- Escape hatches: a `checkins` feature switch (set by founder decision 5) hides the tap button when off; a setting
  lists which milestones are self-declared (default 1 and 2). Founder decisions 1, 2, 4 and 5 map to named settings,
  and activating a season refuses with `config_incomplete` until they are recorded.
- `/island` before `/start` replies with a Start button instead of a bare refusal. Length refusals state the limit.
- Production migration runbook (in the features doc): run `supabase db push --dry-run` and continue only if it
  lists exactly the eight files `20261111090000` to `20261111090700`; if any is missing, stop and write a forward
  migration instead of editing in place; if a push fails at file N, the files before N are applied, so fix N and
  push again; the human gives the go at the CLI prompt. After the first production push these files are frozen.
- CI: a `shift-quests-db` job in `.github/workflows/ci.yml` installs Postgres and runs `pnpm test:db:quests` (one
  first-apply pass and one idempotency pass); it is a required check.
- Local preflight: `supabase/tests/shift_quests/run-local.sh` and `bot/quests-sandbox.sh` check for `initdb` and
  Postgres 15 or newer first; when missing they print the install command and `PG_BIN` hint to stderr and exit 2.
- Sandbox: it records a hash of the migrations and a successful-init marker; on a mismatch or a failed init it
  prints the rebuild command (`QUEST_SANDBOX_RESET=1 bot/quests-sandbox.sh`) and exits 1. A database-only mode needs
  no Discord credentials. The default seed matches Season 1 defaults (no reward rule on milestones); a rewards
  scenario is an explicit option. The seed is updated in the same wave as any signature it calls.
- Render preview: `pnpm island:render --fixture full|empty|overflow [--thumb] --out island.png` renders without
  Discord or a database, from the same fixtures the renderer hash test and the deploy smoke check use. The hash test
  writes `_actual.png` on mismatch and accepts it with `UPDATE_ISLAND_HASH=1`; the expected hash lives in a fixture
  file.
- Deploy: `bot/deploy.sh` builds with the revision tag only, runs the smoke render with no env file and
  `--network none`, and on failure prints the revision, "old container still running, nothing changed", the last
  stderr lines and the fix, then removes the new image. It tags `latest` only after the new container reports
  healthy. Its staged dependency list lives in one place and the script fails before archiving if a listed package
  is missing from `node_modules`; the renderer adds no runtime dependency beyond that list.
- Docs per wave: each wave updates `bot/README.md` and `docs/features/shift-high-quests.md` (command table,
  island channel, launch order, the migration runbook, a one-screen `/season` card with copy-paste examples and
  expected replies, a troubleshooting and upgrade page, and shipped versus planned labels), and the features
  architecture diagram gains the renderer and the island channel.
- Island function contracts: the features doc lists each new island function with its arguments, defaults,
  timezone rule, refusal codes and retry behaviour; `/season status` explains why a project qualifies, including
  provisional pending submissions.
- If wave 2 lands as a later migration, a populated wave-1 fixture is upgraded to wave 2 in the DB suite.
<!-- /autoplan-accepted:dx -->

<!-- autoplan-accepted:eng -->
- Migration split (structure): wave-1 objects stay in `20261111090700_shift_quests_island.sql`; seasons, dated
  unlocks, earned unlocks, recognitions, squads, the weekly post enqueue and the season admin functions move to a
  later unapplied migration (`20261111090800_shift_quests_seasons.sql`). No wave-1 file references a wave-2 table;
  functions that need both (data export, erasure, the approval hook) are replaced in the later migration with
  `CREATE OR REPLACE`. The later migration ships only when wave 2 is approved, and the DB suite upgrades a
  populated wave-1 fixture to it.
- Team milestones in the schema: `shift_quest_instances.milestone smallint` is filled when a milestone quest is
  created, and a unique index on `(project_id, milestone)` over the open states (including the new awaiting
  confirmation state) enforces one open milestone quest per project. The submit lock is keyed on project and
  milestone; a unique violation maps to `sq:milestone_open`, which drives the "join as contributor" reply. Test:
  two teammates submitting the same milestone at once produce one quest and one join offer.
- Shared quest rights: any active project member may answer a clarification and resubmit; only the quest's owner
  withdraws or archives it; if the owner leaves or is erased, ownership passes to the longest-standing active
  member instead of archiving. Contribution lines are snapshotted per revision and must be confirmed before the
  revision reaches review, never after approval.
- Explicit project: every island action (`/island`, tap, milestone submit, rest, consent, target event) takes the
  project ID, carried in button custom IDs and drafts, and the database checks the caller is an active member.
  Milestone submits carry an operation key that the database records, so a retry after a lost response returns the
  first result instead of creating another revision; the bot distinguishes a known refusal from an unknown outcome.
  Test: pick project B, tap, and the row lands on B.
- Achievement provenance: submissions record `decision_kind` (`self` or `mentor`) and `mentor_seen_at`; the
  self-declaration policy in force is stored on the submission. The tree stage counts self-declared milestones;
  demo-day bars, dated unlocks, the island goal, verification notes and the evidence export count a milestone only
  once a mentor has seen it. Self-declaring writes no reviewer row.
- Season counting: one helper, `shift_quest__season_count(project, season, as_of)`, is used by bars, unlocks, the
  goal, squads, `/admin report` and `/season status`. Its unit is mentor-seen approvals whose qualifying time falls in
  the season window; repeats of milestones 3 and 4 count only when the reviewer set `distinct_confirmed`. The
  qualifying time is the earliest submission in the unbroken chain that ends in approval: clarification revisions
  continue the chain, a withdrawal or decline breaks it. Qualification is count at least the bar and the set
  includes milestone 2 (table) or 3 (stage); admin input refuses only an out-of-range bar.
- Provisional slots: slots are snapshotted at the review deadline; a project counted on a still-pending submission
  is labelled provisional in `/season status`; a later decline moves it to the work-in-progress corner. Provisional
  work never triggers an unlock.
- Grant reconciliation: an idempotent `shift_quest_reconcile_season(season)` runs on each outbox minute tick and after
  approvals, unlock edits and deadlines. It evaluates eligibility with the counting helper and records each grant
  with its qualifying evidence and recipient snapshot. The island goal sets `reached_at` once under the season row
  lock; recipients are members active on a project at `reached_at`; members are locked in id order in batches.
  Recognition and coin delivery are separate rows; switching awards on later does not back-pay earlier grants. Once
  an unlock has grants, only its label can be edited.
- Approval correction: submissions gain `corrected_at`, `corrected_by` and `reason`, and the instance moves to a
  `corrected` state that the shared counting helpers exclude; the milestone can be submitted again. Coins are
  reversed with the existing reversal entry and a balance may go below zero (existing rule). Tests check every
  derived value before and after a correction, including a correction racing an approval.
- Rest per member: `shift_quest_members.resting_since`. A shared quest pauses only when every participant rests; any
  tap or milestone clears `resting_since` in the same transaction; `/admin report` counts resting students separately
  from quiet ones. Test: a tap racing a rest.
- Milestone 6 attestation ships in wave 2 with the helped student's confirmation; wave 1 offers milestones 1 to 5
  and 7. The confirmation is a private attestation tied to the exact submission revision, separate from the peer
  recognition share flow (which needs an approved quest and queues a public post). The database accepts only an
  onboarded student, not staff, with an active project the helper is not on; the helped project is that student's
  current project at request time, frozen. One pending request per helper and at most two requests per target per
  week; the request is delivered through `/inbox` only. If the installed discord.js has no user select in modals,
  it is a two-step flow.
- Island privacy rule: both maps come from one helper, `shift_quest__plot_json(project, viewer)`. A plot that is
  neither the viewer's nor fully consented returns its slot only (no stage, no decorations); `shift_quest_island_map`
  refuses a null actor with `sq:bad_input`; the consent copy says it covers name, stage and decorations; a milestone
  6 path is drawn only when both ends are visible to the viewer. The outbox records which plots each weekly post
  showed; when consent is withdrawn or a member is erased, staff get a notice listing the affected Discord message
  IDs to delete by hand (the bot never deletes posts, per the existing policy).
- Production Postgres: CI runs the DB suite on Postgres 15, the production major (`supabase/config.toml:31`). Before
  merge, the unapplied migration files are renamed to timestamps after the newest migration on main if main has
  moved past them, and the runbook checks `supabase migration list` for the remote newest before `db push`.
- Weekly post delivery: enqueue whenever the current time is past this week's scheduled time and no row exists for
  (season, ISO week), until the week ends, so a bot outage at the scheduled hour does not skip a week. Keys are
  `island:<season>:<iso week>` and `island:<season>:<iso week>:manual:<request id>`; the outbox gains `expires_at`;
  leases carry an attempt token so a stale worker cannot acknowledge a newer attempt; a manual re-send refuses when a
  sent row exists for that week unless forced and audited. `/season post preview` is labelled "as of now". Test: the
  week of 2026-12-28 to 2027-01-03 (ISO 2026-W53).
- Render budget: all plot stages come from one set-based query; the base image is cached by a hash of the map payload
  and only the caller's pin is drawn per request; an image holds at most 120 plots, with stable slot-based pages
  beyond; tests assert render time under 150 ms and PNG size under 1 MB for a 200-plot fixture [estimated budgets].
- Deploy rollback: `bot/deploy.sh` records the previous revision, starts the new container and, if it is not healthy
  within 4 minutes, stops it and starts the previous revision again without overlapping sessions. The smoke step
  imports `bot/src/quests/index.ts` and validates the env file without network. `pngjs` stays a dev dependency (the
  renderer uses `node:zlib`), replacing the earlier staging requirement. New outbox kinds are only queued for the
  `island` channel, which is configured after the new bot runs, so an old bot never receives them.
- Launch window: the `quest` and `progress` handlers stay for one release and reply privately "use /island"; the
  next release retires them. A test asserts `--register-commands` exits. Confirm that projectseed's guild is not the
  SHIFT guild, because its registration replaces the whole guild command list (`bot/src/commands.ts:39-40`); if it is
  the same guild, switch it to per-command upserts first.
- Schema check: a `shift_quest_schema_version()` function returns the newest applied island migration version; the bot
  refuses to start the quests module, with a clear log line, when it is older than the bot expects.
- CI and harness: the DB job runs on every pull request (it skips inside the job when no quest file changed);
  `run-local.sh` mirrors Supabase's default table grants as well as function grants; the idempotency pass compares a
  catalog hash instead of re-running assertions.
- Free text: erasure blanks squad names and targets and target-event names written by the erased member;
  `shift_quest_recognitions.reason` is capped at 200 characters and `/season award` warns against personal detail.
- Ledger kinds: coins from a dated unlock use kind `award` under the unlock's reward rule, so existing caps
  apply; category and surprise grants use kind `recognition`. This replaces "kind `recognition` per grant" for unlocks.
- Precedence for implementers: where baseline sections 1 to 8 and the accepted blocks disagree, the later block wins
  (Eng over DX over CEO over baseline).
<!-- /autoplan-accepted:eng -->
## Review record

### Phase 1: CEO review (SELECTIVE EXPANSION)

Baseline corrections (false claims fixed in place):

<!-- autoplan-baseline-edits:ceo {"sourceSha256":"f912113a4c146ad562c3d330d39806ecb93d3ccd3c07e34762428cc3a28eb90c","replacements":[{"oldText":"- Pure-JS renderer (`pngjs`, already a dependency) composing","newText":"- Pure-JS renderer (`pngjs`: in the root `package.json`; `bot/deploy.sh` must also stage it in the bot `package.json`) composing"},{"oldText":"on that project (any order: autonomy). Stage never decreases; nothing wilts.","newText":"on that project (any order: autonomy). Time and inactivity never lower it; nothing wilts."},{"oldText":"- `shift_quest_projects.show_on_island boolean default false`: the project name\n  appears in shared island posts only when every active member opted in.","newText":"- Island-name consent is per member, on the project membership (default not consented): the\n  project name appears in shared island posts only while every active member has consented."},{"oldText":"  `/quest` and `/progress` are removed from the student surface.","newText":"  `/quest` and `/progress` are no longer registered."},{"oldText":"Recorded as a ledger award under a\n  season rule so existing caps and idempotency apply.","newText":"Recorded as a season recognition with a unique source key, so it is idempotent and\n  capped; Passioncoin moves only if awards are on and a season rule gives an amount."},{"oldText":"The bot only records winners as\n  admin awards with a reason.","newText":"The bot only records winners as\n  season recognitions with a reason."},{"oldText":"- **Surprise recognition:** an existing admin award with a reason, capped.","newText":"- **Surprise recognition:** an admin season recognition with a reason, capped per member per season\n  (new: no admin award path exists today; ledger awards come only from approved quests)."}]} -->

Accepted CEO requirements:

<!-- autoplan-accepted:ceo -->
- Deploy: `bot/deploy.sh` stages `pngjs` in the bot `package.json` dependencies, and before the old container
  is stopped it runs the new image once on the host (`docker run --rm <image> node --import tsx -e` importing the
  TypeScript renderer and rendering one PNG); a failure aborts the deploy and leaves the old container running.
- Season recognitions: threshold unlocks, the island-goal unlock, category awards and surprise recognition are
  stored in island tables separate from peer recognition shares (`shift_quest_shares`). Each grant has a
  unique source key: `unlock:<unlock id>:<member id>` for dated unlocks and the island goal,
  `season_award:<recognition id>` for category and surprise grants. Reasons hold no personal detail.
  Passioncoin moves only when awards are switched on and the season or unlock row gives an amount, as exactly
  one ledger row of kind `recognition` per grant. Grants are private (shown in `/island` and `/inbox`); category
  winners are announced in the room, and any channel post goes through the existing preview-and-consent share. Surprise recognition defaults to a cap of 1 per member per season (admin-set). Tests: a
  duplicate grant is a no-op; the cap is enforced; with awards off no ledger row is written.
- Per-milestone coins: in Season 1 no reward rule is attached to the seven milestone templates, so approvals
  grow trees without Passioncoin (founder decision 1 can change this with `/admin template-rule`).
- Island names: consent is per member on the project membership, default not consented, with a toggle in the
  project view reached from `/island` "more". A project's name appears in shared posts only while every active
  member has consented; a newly accepted or rejoining member starts not consented. Tests: one member
  withholding hides the name; a newly accepted teammate hides it until they consent.
- `/island` shows the member's current project. With several projects it offers a project picker; with none it
  replies with an empty plot and a button that starts `/project new`.
- Team milestones: at most one open (not approved, declined or archived) milestone quest per project and
  milestone; a teammate pressing the same milestone joins it as a contributor instead of opening a second one.
  A teammate who joins adds their own one-line part as a contribution on the pending revision; proof and
  reflection stay the submitter's. Dated unlocks and category awards go to every member active on the project
  when the grant is recorded (one row per member). An active project in a season is a non-archived project with
  at least one active member.
- Rest: rest pauses the member's own in-flight quests; a shared milestone quest pauses only when every
  contributor rests, and a submitted quest is never paused (its review goes on). Any later tap, milestone or a
  "back" button resumes them. The plot shows the rest marker only while every active member is resting, never a wilted tree or a
  decline.
- Stage is derived from approved milestones, so time and inactivity never lower it. An admin correction of a
  mistaken approval (`/season correct`, database checks the admin role, audited, reason required) is the only
  thing that can lower a stage. Derived values (stage, qualification, island-goal count, squad progress)
  recompute live; Passioncoin from the corrected approval is reversed with the existing `reversal` entry;
  unlocks and recognitions already earned stay, so no student loses a grant for a mentor mistake.
- Demo-day qualification counts a milestone when its eventually approved revision was submitted before the
  season cutoff, so mentor review time never costs a slot. The season has a review deadline between the cutoff
  and demo day, and `/review` lists pre-cutoff submissions first. Tests: a submission made before the cutoff and
  approved after it qualifies; one submitted after the cutoff does not. When the approved revision followed a
  clarification request, the quest's first submission time counts. A pre-cutoff submission still pending at
  the review deadline counts for the demo-day slot and is reviewed afterwards. The same submission-time rule
  decides dated unlocks and the island goal. Bars, dated unlocks and the island goal count approvals whose
  qualifying submission falls inside the season window, repeat approvals of milestones 3 and 4 included (a new
  real test counts again); the tree stage stays all-time and distinct, so Season 2 starts from the current tree
  but asks for fresh work. The table bar must include milestone 2 and the stage bar must include milestone 3,
  so a slot always has something working and something tested to show.
- Season dates: each season stores starts, ends, cutoff, review deadline and demo day; dated unlocks are child
  rows (date, milestone count, label). The island goal is one of those rows (kind goal: N projects at milestone
  3 by its date); when reached, every member with an active project in the season earns it. An admin sets them to the in-person SHIFT High meetups decided for
  Semester 2 (January to May 2027, company-brain decision log, 2026-10-30), weighted to late March to May per
  founder decision 4. No date is hardcoded.
- Weekly island post: runs only during an active season. The outbox gains an `island` channel key (set with
  `/admin channel`; the channel check is edited in place, allowed because the migration is unapplied) and image
  attachments. The post is queued once per season week (dedupe key per season and Asia/Bangkok ISO week) at an
  admin-set weekday and hour (default Monday 18:00 Bangkok) and rendered at send time from a system map
  function, `shift_quest_island_post_map()` (no actor, granted only to the bot role), that returns only consented
  names; `/island` keeps using `shift_quest_island_map(p_actor)`. The outbox send path for the island post calls
  the post-map function, never the actor map with a null actor. Tests: two enqueue runs in one week queue
  one post; a project whose members have not all consented shows only its plot number.
- External event target (student choice): any active member may set, replace or clear one optional target
  event per project (name up to 80 characters, a date), such as a real competition, from the project view;
  after its date it shows as past until replaced or cleared. `/island` shows its countdown privately; it never appears in
  the island map or any post. Tests: a past date is refused; the field is absent from the map payload.
- Mentor visit wait: the promised turnaround is a setting in hours (default 48, founder decision 2). `/island`
  shows when a milestone was sent and that a mentor visit is pending. The staff channel gets one notice per
  submission still waiting past the turnaround, with the quest title and plot number only. Tests: one notice per
  submission; none after a decision.
- Pilot health: `/admin report` adds island counts for the period: distinct students who tapped, milestones
  sent and approved, median and longest review wait, help requests, and how many students are quiet (no tap,
  note, submission or help request for 14 or more days), as counts with no names. Test: counts on fixture data;
  no member identity in the payload.
- Sprite review gate: the founder approves the sprite contact sheet before the pilot. Renderer tests hash the
  decoded RGBA pixels, not the compressed PNG bytes, so a Node or zlib upgrade cannot break them.
- Renderer failure: if rendering throws (missing sprite, bad map), `/island` still replies with the text view
  (stage, next milestone, buttons) and logs the error class only; the weekly post retries through the outbox.
  Test: a missing sprite yields the text reply, not an error.
- Growth feedback: an approval that grows the tree queues an `/inbox` notice (and the existing content-free DM
  nudge for students who opted in); the student's next `/island` shows the new stage with a "your tree grew"
  line. No image is ever sent by DM.
- Command surface: `/quest` (including `/quest status`) and `/progress` are no longer registered; `/start`,
  `/work` and every other existing command stay registered. A staff-only `/season` command (hidden by default
  permissions; the database checks the admin role) holds `set`, `unlock`, `award` (category or surprise) and
  `status` and `correct` (approval correction); the turnaround and the weekly post time are
  `/admin` settings. `/island` has a "more" button that opens the existing project, help, inbox, settings and data
  views, plus "propose my own quest" (the existing propose flow). Each quest in flight listed by `/island` has
  buttons for the existing answer-clarification, appeal and archive flows, so a student never needs `/quest`.
- Migrations: island tables and functions go in a new unapplied migration
  (`20261111090700_shift_quests_island.sql`) plus in-place edits to the unapplied `2026111109*` files; all ship
  in one `supabase db push` after an explicit go, additive and idempotent. The island migration enables RLS on
  every new table and ends with the same revoke and grant loop as `20261111090600`, so no `shift_quest_*`
  function reaches `PUBLIC`, `anon` or `authenticated`. Tests: the privilege check loops over every
  `shift_quest_*` function and table, and one suite applies the migrations once (not twice) before it runs.
- Data rights: `/data` export and `/admin data` erasure cover plots, island-name consents, squads and squad
  members, recognitions and unlocks, target events and tap check-ins. Tests extend the existing export and
  erasure regression in `supabase/tests/shift_quests/db_rules.ts`.
- Squads: a student starts a squad and invites 2 or 3 students, who accept like project invites (maximum 4).
  Invites expire after 3 days; a squad starts once 3 members (with the starter) have accepted; a student is in
  at most one active squad. The sprint runs for its chosen length from the start with one self-chosen target, then closes as history; a new sprint can start. Progress counts milestones approved in the window on each member's projects,
  once per project. Squad progress shows in `/island` to squad
  members only; a celebration uses the existing preview-and-confirm share flow and names only members who confirm it.
  Squads are built in wave 2 behind a `squads` feature switch, default off, turned on only if founder decision 5
  picks the island (the alumni board already has teams). The squad chooses its sprint length at start (3 to
  28 days, default 14), matching the existing `/squad` option. The bot creates no Discord
  channel or thread for squads; staff are never squad members, and nothing creates a 1:1 space between an
  adult and a student.
- Milestone 6 decoration: the helped project is optional and picked by plot number from projects the helper is
  not a member of; the path is drawn between plot numbers only.
- Island capacity: the layout has a fixed slot count set in code; an archived project keeps its slot; a project
  created beyond capacity still succeeds and sits on an overflow row; `/admin status` warns at 80 percent full.
  Test: the slot after the last layout slot lands on the overflow row.
- Delivery in two waves: wave 1 is the island model, `/island` and its buttons, the milestone flow, the
  renderer and the private image; wave 2 is seasons, recognitions, the weekly post and squads, landing before
  Season 1 opens. Each wave passes `pnpm lint && pnpm test && pnpm build` and `pnpm test:db:quests`.
- Success and stop rule: before the pilot opens, the founder writes a baseline (from the alumni board and
  session attendance, totals only) and a week-4 bar with a decision date; wave 2 and Season 1 software continue
  only if the bar is met. `/admin report` adds the evidence the bar needs: approved milestone 3 and 4 tests
  (repeats included), and mentor review minutes per approval (reviewer-entered, optional).
- Reviewer rota: founder decision 2 also names one reviewer and one backup for each pilot week.
- Pre-pilot checks (no code): count alumni active in the SHIFT Discord in the last 14 days (totals only); show the
  contact sheet and one rendered island to 3 or 4 students; confirm stages 4, 5 and 6 are distinguishable at
  Discord thumbnail size.
- Milestones 1 and 2 are self-declared: submitting them grows the tree at once and puts them in the mentor queue
  for comments only; milestones 3 to 7 still need mentor approval. A mentor can still correct a self-declared
  milestone with `/season correct`.
- Milestone 6 needs the helped student's confirmation through the existing peer recognition request (accept or
  decline) before it reaches review; unconfirmed help grows nothing.
- Public post privacy: in the weekly island post, a plot whose members have not all consented renders as a plain
  plot without stage or decorations; the island-goal total is the only aggregate shown. The private `/island`
  image still shows the student their own real stage.
- Demo day keeps an open work-in-progress corner where any builder below the bars gets feedback; the bars decide
  only gallery tables and stage slots.
- Verification note: a portfolio verification note states only what a mentor saw: the project's approved
  milestones and, for the named student, the proofs and contribution lines that student submitted. Team-wide
  grants never stand in for individual verification.
- Evidence export: `/data` adds a readable Thai text summary of the student's mentor-approved milestones (title,
  date, proof link or line, mentor feedback) next to the JSON, built from the existing export function.
- Founder decision 3 now decides only the demo-day bars (defaults 2 and 3 milestones); per-project counting
  and unlock recipients are set above.
- Founder decision 5 is added: which tool is the single home for weekly goals and check-ins, this island or the
  alumni board (company-brain `alumni.md`, Alumni board), so students never update both. It must be decided
  before the pilot opens to students, because the wave 1 tap check-in overlaps the board's check-ins.
<!-- /autoplan-accepted:ceo -->

#### CEO Step 0

**System audit.** Branch `feat/shift-high-quests` (worktree), base `main`. Nothing on `origin/main` since
2026-11-09 touches the quest bot or island (`git log origin/main --since=2026-11-09 -- bot supabase/migrations`
lists only whiteboard and voice commits). The quest bot, all `2026111109*` migrations and the island work are
uncommitted in the worktree. The island is being implemented while this plan is reviewed:
`20261111090700_shift_quests_island.sql` (tables at lines 61-158, RLS loop 171-184, grant loop 1459-1482),
`bot/src/quests/island/`, `bot/assets/island/` (sprites and `_sheet.png`), `/island` and `/squad` in
`bot/src/quests/commands.ts:37,255`. No TODOS.md in the repo. Taste references: `bot/src/quests/outbox.ts`
(small, durable, explicit) and the DB-owns-rules pattern in `20261111090200_shift_quests_review_functions.sql`;
avoid: the 15-command surface in `commands.ts`, which is what made the bot feel like homework.

**Landscape (WebSearch; Aside not used).** Layer 1: visible progress and informational feedback support
competence; expected tangible task-contingent rewards undermine intrinsic motivation, unexpected ones do not
(Deci, Koestner and Ryan 1999 meta-analysis). Layer 2: Discord garden bots (Grow a Garden, IdleIsland) lean on
streaks and server leaderboards, which this plan rightly avoids. Layer 3 (eureka): the tree is the reward; paying
Passioncoin per milestone would be the overjustification trap, so milestone templates carry no reward rule in
Season 1.

**0A Premise table** (verdicts: pass, finding, unverified)

| Premise | Claim | Receipt | Verdict |
|---|---|---|---|
| P1 | SHIFT High is slow; few students keep building | founder statement; no attendance yet (company-brain `alumni.md`, How we'll know it works) | unverified |
| P2 | Competition projects move faster | founder observation | unverified |
| P3 | Speed comes from date, audience, team, not prize | advisor; partly supported by SDT literature | unverified |
| P4 | Bot is form-heavy (5-field journal) | `supabase/migrations/20261111090100_shift_quests_core_functions.sql:1268-1270` | pass |
| P5 | `pngjs` already a dependency | root `package.json:155`; HEAD `bot/deploy.sh` staged only four packages; worktree `bot/deploy.sh:32` now stages it | finding (fixed in tree) |
| P6 | Surprise recognition is an existing admin award | no admin award function; ledger awards only via `shift_quest__issue_award` (`20261111090200_shift_quests_review_functions.sql:51,149`) | finding |
| P7 | Nothing deployed, migrations unapplied | `docs/features/shift-high-quests.md:10-13` | pass |
| P8 | Weekly post works through the outbox | outbox sends text only and channel keys are fixed (`bot/src/quests/outbox.ts:36-51`, schema channel CHECK) | finding |
| P9 | `/island` is the one student command | 15 commands registered (`bot/src/quests/commands.ts:255`) | finding |
| P10 | Demo day is a date the plan sets | 4 meetups already funded for Semester 2 (company-brain `decisions/log.md:22-29`) | finding (anchor to them) |
| P11 | No other check-in tool exists | alumni board has goals, check-ins, standups, quiet list (company-brain `alumni.md:47-55`) | finding |
| P12 | A project boolean records every member's name consent | one boolean cannot hold per-member consent | finding (tree now has `show_name`, core_functions.sql:552) |

unverified=3. Do-nothing cost: the form-heavy bot ships into the Semester 2 meetups and students ignore it.
Real problem: between sessions nothing pulls an alumnus back (no date, no audience, no visible progress). The
plan attacks it directly, but the voices below say most of the date and audience come from people, not code.

**0B Existing code leverage**

| Sub-problem | Reuse | Rebuild? |
|---|---|---|
| Milestones | `shift_quest_templates` + instances + `shift_quest_review_decide` | no, add `milestone` |
| Tap check-in | `shift_quest_progress_add` (kind tap) | no |
| Stuck | `shift_quest_help_create` | no |
| Rest | `shift_quest_set_state` paused | no |
| Weekly post | `shift_quest_outbox` + `shift_quest__post` | extend: attachments, island key |
| Season grants | ledger + caps pattern | new recognition tables (no admin award path existed) |
| Squads | project invite pattern | new tables; alumni board teams overlap |
| Name consent | share preview/consent pattern | per-member column |
| Data rights | `shift_quest_data_export`, `shift_quest_admin_erase` | extend |
| Image | `pngjs` | new renderer |
| Report | `shift_quest_admin_report` | extend |

**0C Dream state**

```
  CURRENT STATE                    THIS PLAN                          12-MONTH IDEAL
  15-command quest bot, unshipped; --->  /island + 4 buttons; human-     --->  one home for progress; seasons on the
  alumni board for goals; weekly         reviewed milestones grow a           school calendar and real competitions;
  session; 4 meetups funded              tree; Season 1 with bars, goal,      mentor-verified evidence flows into
                                         squads                               TCAS case studies; mentors give feedback,
                                                                              not admin
```

**0D** No new approach decision was needed. **0E** Mode: SELECTIVE EXPANSION; approved decisions: none
(autoplan override; added capability). **0F/0G** HOLD checks: complexity is high (5+ new tables, a renderer, a
weekly job); squads and wave 2 are the deferrable parts (taste T3, User Challenge UC1); invariants kept (no
ranking, no speed rewards, no streaks, safeguarding, additive migrations). Cherry-picks and dispositions: see
the CEO plan `~/.gstack/projects/passionseed-web/ceo-plans/2026-11-11-shift-high-island.md` (C1-C10, E1-E6,
S1-S24 accepted; X1 deferred then partly promoted as the evidence export; X2 deferred). Delight scan: empty plot
with a seed (S1), rest marker (S3), growth line (S23), festival banner (plan), neighbour path (plan).
**0H** CEO plan written; spec review 3 launches, latest 6/10, 12 of 12 last-round fixes verified, spec not
re-verified. Documents auto-approved (A). **0I Temporal interrogation:** hour 1: the DB owns every rule and the
accepted block overrides baseline text; hour 2-3: one pending revision per quest versus team contributors,
submission-time qualification after clarification, per-member consent; hour 4-5: Discord attachments in
ephemeral replies and outbox posts, the island post has no actor, grant loops per migration, staged deploy
dependencies; hour 6+: decoded-pixel hashes, single-pass migration test, Thai copy review, sprite sign-off.
Effort: human about 3 weeks, CC about 2 days [estimated]. No feasibility blocker; founder decisions 1, 2, 4, 5
gate the pilot, not the build.

#### CEO dual voices

Claude CEO subagent (INPUT ceo e8a42671..., completed): 2 Critical (C1 the premise points away from software;
C2 build before deciding the board), 5 High (no success or stop criteria; mentor approval as bottleneck; launch
timing gap; public map ranks in a small room; wave 2 not gated), 5 Medium (Discord activity and scale unproven;
milestones 6-7 gamify helping; evidence stuck in Discord; tree ceiling at 7; no link to paid membership).
Codex (gpt-6-astra, completed, OUTSIDE_STATUS completed): 1 Critical (causal premise not established), 7 High
(pilot cannot tell building from bot usage; two waves are not two learning stages; any-order milestones let 1, 5,
6 qualify without a working thing or a test; all-time counting rewards history; fun not demonstrated; bars gate
the audience that drives progress; team grants are not individual evidence). Recommendation: replace the
committed two-wave rollout with a bounded pilot on existing tools.

```
CEO DUAL VOICES — CONSENSUS TABLE:
  Dimension                           Claude  Codex  Consensus
  1. Premises valid?                   no      no     CONFIRMED (premises assumed)
  2. Right problem to solve?           partly  partly CONFIRMED (software supplies little of date/audience/team)
  3. Scope calibration correct?        no      no     CONFIRMED (over-scoped for pilot)
  4. Alternatives sufficiently explored? no    no     CONFIRMED (manual season, existing board)
  5. Competitive/market risks covered? no      no     CONFIRMED (real competitions beat an invented season)
  6. 6-month trajectory sound?         no      no     CONFIRMED (tree ceiling, history counting, sunk cost)
CONFIRMED = completed subagent + outside; primary cannot replace outside.
```

Dispositions: User Challenges UC1 (manual Season 1 first; wave-2 tables to a later migration) and UC2 (decide
the board-versus-island home before more wave-1 code) go to the gate; the plan keeps the user's direction until
then. Auto-accepted: success and stop rule, reviewer rota, pre-pilot checks, verification-note wording, evidence
export. Taste (provisionally applied): in-season counting with repeat tests, bars that require milestones 2 and 3,
self-declared milestones 1 and 2, milestone 6 confirmation, plain non-consented plots in the public post, the
work-in-progress corner. Deferred: what comes after stage 7; membership link.

#### CEO review sections

**Section 1 Architecture.** Current scope: SELECTIVE EXPANSION; accepted C1-C10, E1-E6, S1-S24, voice items;
UC1 and UC2 pending; X2, post-stage-7 and membership link deferred.

```
 Discord ── /island, /season, buttons ──▶ bot/src/quests (thin UI) ──▶ shift_quest_*() (all rules)
    ▲                                         │  render.ts (pngjs + sprites)          │
    │                                         ▼                                     ▼
    └──── outbox loop ◀── shift_quest_outbox_claim()      plots, seasons, unlocks, recognitions, squads
             │ text + island PNG attachment                (090700, RLS on, no grants)
             └──▶ island channel (consented names, plain plots)
```

Findings: (1) WARNING the weekly post needs an actor-free map function (fixed: `shift_quest_island_post_map()`);
(2) WARNING outbox gains attachments and an island channel (accepted); (3) OK the DB-owns-rules boundary holds;
(4) WARNING the island is a new presentation layer over a review pipeline whose single point of failure is
mentor time (accepted: rota, wait notices, self-declared 1-2). Scaling: tens of students; the renderer runs per
`/island` call and per weekly post; 100x is not a pilot concern. Rollback: unregister `/island`, keep tables.
Security: every new function goes through the per-migration revoke and grant loop. Value test: the pilot report
is consumed by the founder's week-4 stop decision. 4 issues.

**Section 2 Error & Rescue Map.** See the Error & Rescue Registry below: 12 codepaths, 1 gap found (renderer
failure inside `/island` had no fallback) and accepted as a text fallback.

**Section 3 Security & threat model.** (1) High impact, low likelihood after the fix: SECURITY DEFINER functions
trust the passed Discord ID, so any island function reachable by `anon` is a full takeover; mitigated by the
090700 grant loop, and the accepted privilege test loops every function and a single-pass apply. (2) Medium: the
public post could identify minors' stage-0 trees in a small room; mitigated by plain plots for non-consented
projects. (3) Low: target-event and squad-target free text never leaves private replies. (4) Safeguarding: squads
students-only, no bot-created channels, DMs content-free (no image DMs). No new secrets or npm packages beyond
`pngjs` (already pinned in the repo). 4 issues, 1 high-impact.

**Section 4 Data flow and interaction edges.**

```
 milestone button ─▶ pick milestone ─▶ modal(proof, reflection) ─▶ shift_quest_milestone_submit
   │ nil project → empty plot + /project new      │ empty proof → refused (sq:bad_input)
   │ teammate already open → join as contributor  │ double click → one pending revision (unique index)
   ▼                                              ▼
 review queue (pre-cutoff first) ─▶ approve ─▶ stage recomputed ─▶ inbox notice ─▶ next /island shows growth
   │ clarification → first submission time kept for qualification
   │ correction → stage recomputes, coins reversed, grants kept
```

Edge cases: double click on tap (two taps harmless, no reward); stale modal after a teammate submitted (join);
project archived mid-flow (refused, plot kept); several projects (picker); overflow beyond layout (overflow row);
weekly post with no consented names (plain plots only). Unhandled before review: none remaining after accepted
items. 9 edge cases mapped, 0 unhandled.

**Section 5 Code quality.** The tree follows the house patterns (copy in one file, DB rules, outbox). Risk:
`/admin` already has 14 subcommands near Discord's limit; accepted a separate staff `/season`. Over-engineering
risk: overflow rows and squads for a small community (taste T3). 2 issues.

**Section 6 Tests.** Diagram:

```
 NEW THING                    TYPE         HAPPY / FAILURE / EDGE
 stage math                   DB rule      any order / correction lowers / taps do nothing
 qualification                DB rule      pre-cutoff approved later / post-cutoff / clarification kept
 recognitions + unlocks       DB rule      grant / duplicate no-op / cap / awards off → no ledger
 name consent                 DB rule      all consent / one withholds / new teammate
 weekly post                  DB + bot     one per week / two enqueues / plain plots
 privilege                    DB rule      bot can call / anon cannot (every function) / single-pass apply
 renderer                     unit         decoded-pixel hash / missing sprite → text fallback / size limit
 /island buttons              bot flow     each button / no project / several projects
 deploy check                 manual       renders in image / failure keeps old container
```

Gaps found: privilege test covered one function; tests applied migrations twice; renderer hash on compressed
bytes. All accepted. 3 gaps.

**Section 7 Performance.** Renderer cost per call is small (sprite blits, one PNG); cache the static base layer
in memory. Island map query joins plots, instances and members: index on `shift_quest_instances(project_id)`
exists. Weekly job is one post. No N+1 expected if the map is one SQL call. 1 issue (base-layer caching,
non-blocking, left to Eng).

**Section 8 Observability.** Accepted: wait notices past turnaround, pilot report counts, `/admin status`
capacity warning, outbox logs SQLSTATE and Discord codes only. Gap: no alert when the weekly post fails
permanently; accepted under the outbox's existing failed-status reporting in `/admin status`. 2 gaps.

**Section 9 Deployment.** Migrations ship in one `supabase db push` after explicit go; the island migration
must run after 090600 and repeat the grant loop (it does). Deploy check before container swap (accepted).
Rollback: previous image is kept by `bot/deploy.sh`; DB is additive. Post-deploy: `/admin status`, one `/island`,
one rendered post in a test channel. 3 risks flagged.

**Section 10 Long-term trajectory.** Debt: a seven-stage ceiling (deferred: define after stage 7 before Season 2);
two progress tools (UC2). Reversibility 4/5 (tables additive, commands unregisterable). Platform: the island map
function could feed a web island later.

**Section 11 Design.** SKIPPED (no UI scope; autoplan scope detection uiRequired=false).

#### CEO required outputs

**NOT in scope**
- Deferred: X2 weekly "trees grew this week" aggregate (the island-goal total covers it); what comes after stage
  7 (decide before Season 2); link to paid membership (decide with the membership pricing work). Pending
  TODOS.md entries: not persisted, because this review may write only the plan and autoplan artifacts.
- Rejected: none.
- Already excluded by the plan: web island, public pages, animation, trading, cash prizes, leaderboards,
  automated judging, image upload as proof.

**What already exists.** Quest templates, review, help, pause, outbox, ledger, export and erasure (all reused);
the alumni board (outside this repo) for goals, check-ins and team standups; the weekly session and four funded
meetups; the island migration, renderer, sprites and `/island` already in the worktree.

**Dream state delta.** This plan gets a visible, low-friction progress loop and a season frame. It leaves the
evidence-to-portfolio path thin (a text export only) and two progress tools alive until decision 5.

**Error & Rescue Registry**

```
 CODEPATH                         | WHAT CAN GO WRONG              | RESCUE                         | USER SEES
 shift_quest_island(actor)        | not a student / no project     | sq:not_student / empty plot    | onboarding or seed
 milestone submit                 | pending revision exists        | join as contributor            | "joined"
 milestone submit                 | lock timeout / deadlock        | existing "try again" mapping   | try again
 renderer                         | missing sprite / pngjs absent  | text fallback; deploy check    | text island  (was GAP)
 outbox island post               | channel unset                  | parked until configured        | nothing yet
 outbox island post               | Discord 50013 / 40005          | retry, then failed + status    | staff see it
 weekly enqueue                   | runs twice                     | dedupe key                     | one post
 season grant                     | duplicate / cap                | unique key / sq:cap            | staff message
 ledger on grant                  | awards off                     | no row                         | nothing
 approval correction              | coins already spent            | reversal, balance may go < 0   | balance shown
 data export / erase              | new table missed               | regression test                | complete export
 deploy                           | image cannot render            | abort, old container stays     | no outage
```

**Failure Modes Registry**

```
 CODEPATH            | FAILURE MODE            | RESCUED? | TEST? | USER SEES?   | LOGGED?
 renderer            | throws                  | Y (new)  | Y     | text island  | Y
 island post         | permanent Discord error | Y        | Y     | staff status | Y
 qualification       | review late             | Y        | Y     | qualifies    | n/a
 privilege loop      | function left to anon   | Y        | Y     | n/a          | n/a
 consent             | new teammate            | Y        | Y     | name hidden  | n/a
 squads              | under 3 accept          | Y        | Y     | not started  | n/a
```

CRITICAL GAPS open after accepted items: 0 (1 found and accepted: renderer fallback).

**Diagrams:** architecture, milestone data flow, test map, error registry (above). State machine for a milestone
quest reuses the existing instance states (active, submitted, clarification, approved, declined, appealed,
paused, archived); self-declared milestones go active to approved directly. Rollback: unregister commands, keep
tables. Stale diagram audit: `docs/features/shift-high-quests.md` architecture diagram is still accurate for the
quest core but omits the island renderer and island channel; Eng should update it.

#### CEO implementation tasks

- [ ] **T1 (P1, human: ~2h / CC: ~10min)** deploy: run the new image once on the host before the container swap
  (`node --import tsx -e` renders a PNG); abort on failure. Files: `bot/deploy.sh`. Verify: deploy to a test host with a broken sprite path aborts.
- [ ] **T2 (P1, human: ~4h / CC: ~20min)** db: privilege test loops every `shift_quest_*` function and table; add a single-pass apply suite. Files: `supabase/tests/shift_quests/db_rules.ts`, `supabase/tests/shift_quests/run-local.sh`. Verify: `pnpm test:db:quests`.
- [ ] **T3 (P1, human: ~1d / CC: ~45min)** db: qualification and unlock rules (in-season window, first submission time after clarification, pending-at-deadline counts, bars include milestones 2 and 3). Files: `supabase/migrations/20261111090700_shift_quests_island.sql`, `db_rules.ts`. Verify: the four qualification tests.
- [ ] **T4 (P1, human: ~6h / CC: ~30min)** db: season recognitions with `unlock:` and `season_award:` keys, cap, awards-off no ledger, private grants. Files: 090700, `db_rules.ts`. Verify: duplicate, cap, awards-off tests.
- [ ] **T5 (P1, human: ~4h / CC: ~20min)** db+bot: weekly post through `shift_quest_island_post_map()`, attachments, Bangkok ISO-week dedupe, plain non-consented plots. Files: 090700, `bot/src/quests/outbox.ts`. Verify: enqueue-twice and plain-plot tests.
- [ ] **T6 (P1, human: ~3h / CC: ~15min)** bot: renderer text fallback and decoded-pixel hash tests. Files: `bot/src/quests/island/*`, tests. Verify: `pnpm test bot/src`.
- [ ] **T7 (P2, human: ~6h / CC: ~30min)** bot: command surface (`/quest` and `/progress` unregistered, `/season set|unlock|award|status|correct`, `/island` "more" and quest-row buttons). Files: `bot/src/quests/commands.ts`, handlers. Verify: bot flow tests per button.
- [ ] **T8 (P2, human: ~4h / CC: ~20min)** db: team milestones (one open per project and milestone, contributors), rest rules, approval correction recompute. Files: 090700, core functions. Verify: db rules tests.
- [ ] **T9 (P2, human: ~3h / CC: ~15min)** db+bot: per-member consent toggle, target event set/replace/clear, project picker, capacity overflow. Files: 090700, `handlers/project.ts`. Verify: tests named in the accepted block.
- [ ] **T10 (P2, human: ~3h / CC: ~15min)** db+bot: self-declared milestones 1 and 2; milestone 6 needs the helped student's confirmation. Files: 090700, review functions. Verify: db rules tests.
- [ ] **T11 (P2, human: ~3h / CC: ~15min)** db: report counts (taps, sent, approved, waits, quiet, tests incl. repeats, review minutes), wait notices past turnaround. Files: admin functions, 090700. Verify: fixture counts.
- [ ] **T12 (P2, human: ~3h / CC: ~15min)** db: export and erasure cover new tables; Thai evidence text in `/data`. Files: core and admin functions. Verify: export/erase regression.
- [ ] **T13 (P2, human: ~2h / CC: ~10min)** bot: squads behind the `squads` switch, invite expiry, start at 3, one active squad. Files: 090700, squad handlers. Verify: squad tests.
- [ ] **T14 (P3, human: ~1h / CC: n/a)** founder: decisions 1-5, success bar and decision date, reviewer rota, pre-pilot checks, sprite sign-off. Files: none. Verify: written in company-brain.

#### CEO reality rows

REALITY: premise-table finding 12 premises, 3 unverified (P1-P3 founder and advisor claims), 7 findings, 2 pass; unverified=3 supabase/migrations/20261111090200_shift_quests_review_functions.sql:51
REALITY: already-done pass no island or quest commit on origin/main since 2026-11-09; the work is uncommitted in this worktree bot/src/quests/commands.ts:37
REALITY: surface-check finding `/island` and `/squad` exist in the tree; `/season` does not yet; `/quest` and `/progress` still registered bot/src/quests/commands.ts:255
REALITY: binding-decisions pass no branch decisions recorded (gstack-decision-search empty); the plan's Season dates bind to the company-brain meetup decision (company-brain decisions/log.md, 2026-10-30) docs/designs/shift-high-island.md:186
REALITY: numbers finding plan example "23 of 30 trees" is illustrative, not measured; shift[2] had 17 students and 1 recorded a test [measured: company-brain numbers.md rows 46 and 54] docs/designs/shift-high-island.md:85
REALITY: deferred-asks pass no linked issue; the founder's spec lives outside the repo docs/features/shift-high-quests.md:7
REALITY: pr-count finding no .gstack/ship-policy.json, so one PR per wave; the two-wave split costs one extra PR and both waves must keep docs/features/shift-high-quests.md current docs/features/shift-high-quests.md:1
REALITY: transaction-semantics pass no driver, pool or protocol change; island calls reuse the existing per-call pg pool and function-level transactions bot/src/pg.ts:1

#### CEO completion summary

```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SELECTIVE EXPANSION                         |
  | System Audit         | island built in parallel; no TODOS.md;      |
  |                      | alumni board overlaps; 4 meetups funded     |
  | Step 0               | 12 premises (3 unverified), 0D none, 0H 3   |
  |                      | spec launches, latest 6/10                  |
  | Section 1  (Arch)    | 4 issues found                              |
  | Section 2  (Errors)  | 12 error paths mapped, 1 GAPS (accepted)    |
  | Section 3  (Security)| 4 issues found, 1 High severity             |
  | Section 4  (Data/UX) | 9 edge cases mapped, 0 unhandled            |
  | Section 5  (Quality) | 2 issues found                              |
  | Section 6  (Tests)   | Diagram produced, 3 gaps                    |
  | Section 7  (Perf)    | 1 issues found                              |
  | Section 8  (Observ)  | 2 gaps found                                |
  | Section 9  (Deploy)  | 3 risks flagged                             |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 2           |
  | Section 11 (Design)  | SKIPPED (no UI scope)                       |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (3 deferred items)                  |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 12 rows, 0 CRITICAL GAPS open               |
  | Failure modes        | 6 total, 0 CRITICAL GAPS open               |
  | TODOS.md updates     | 3 items proposed (not persisted)            |
  | Scope proposals      | 45 proposed, 43 accepted (EXP + SEL)        |
  | CEO plan             | written                                     |
  | Outside voice        | codex completed                             |
  | Lake Score           | N/A (no coverage-scored questions)          |
  | Diagrams produced    | 4 (architecture, data flow, tests, errors)  |
  | Stale diagrams found | 1 (features doc architecture)               |
  | Unresolved decisions | 2 (UC1, UC2 at the gate)                    |
  | Reality rows         | 8/8 rows (PLAN_REALITY), 3 unverified       |
  +====================================================================+
```

#### CEO User Challenges (pending at the gate; the user's direction stands)

- **UC1 Season 1 software now, or by hand first.** You said: build Season 1 in the bot (seasons, dated
  unlocks, island goal, recognitions, weekly post, squads). Both models recommend: run Season 1 by hand at the
  funded meetups (founder plus a sheet) and move the wave-2 tables out of `20261111090700` into a later
  unapplied migration, built only after wave 1 meets the founder's week-4 bar. Why: date, audience and team come
  from the meetups and people, not code; the community is small; sunk cost will push unused tables into
  production. Blind spots: Big already runs everything, so manual admin may cost more than code; a countdown in
  `/island` may be what makes the date feel real; the founder asked for competitions and prizes to jump-start.
  Cost if wrong: manual season weak, about 2 to 4 weeks lost before software carries it; or the software ships and
  sits unused in the production schema.
- **UC2 Decide the one home before more wave-1 code.** You said: the island in the Discord bot is the student
  surface. Both models recommend: decide founder decision 5 (island or alumni board) first; if the board wins,
  shrink the island to a visual over the board's data or shelve it. Why: the board already has goals, check-ins,
  standups and a quiet list; this would be about the fifth check-in surface. Blind spots: students may live in
  Discord, not the board; the board may be mentor-facing; the board has no visuals. Cost if wrong: two tools that
  each get half the updates, or a stalled build that was close to done.

#### CEO taste decisions (auto-decided, provisional)

- D-T1 Two delivery waves (recommended) vs one PR. P6.
- D-T2 `/island` "more" and quest-row buttons (recommended) vs keep `/quest`. P5.
- D-T3 Squads kept behind a switch pending decision 5 (recommended) vs cut squads now. P1 vs P4.
- D-T4 No reward rule on milestone templates in Season 1 (recommended) vs coins per approval. SDT.
- D-T5 In-season counting with repeat tests, bars must include milestones 2 and 3 (recommended) vs all-time
  any-order counting. Both voices.
- D-T6 Self-declared milestones 1 and 2 (recommended) vs mentor approval for all seven. Claude voice.
- D-T7 Milestone 6 needs the helped student's confirmation (recommended) vs self-claimed help. Claude voice.
- D-T8 Non-consented plots render plain in the public post (recommended) vs show every stage anonymously.
- D-T9 Work-in-progress corner at demo day (recommended) vs bars gate all presenting. Codex voice.
- D-T10 Thai evidence text in `/data` now (recommended) vs defer the evidence export.

### Phase 2: Design review

SKIPPED: no UI scope detected (init scope uiRequired=false; 3 bare UI words, no visual evidence). Not a completed review.

### Phase 2.5: DX review (DX POLISH)

Accepted DX requirements:

<!-- autoplan-accepted:dx -->
- Command retirement: the register step lists the guild's commands, deletes the module's retired names (`quest`,
  `progress`), leaves every other command alone, and prints what it registered and removed. Launch order is
  `supabase db push`, then `bot/deploy.sh`, then the register step. A same-push rule keeps the old bot working
  between push and deploy: no function signature is removed or changed in place once applied.
- `--register-commands` exits after registering instead of logging in, so registering never starts a second
  bot. `bot/README.md` says so.
- Copy test: a Jest test extracts every `/command` named in `bot/src/quests/copy.ts` and fails if it is not in
  `questCommands()`; notices that pointed at `/quest` or `/progress` point at `/island` and its buttons.
- Error contract for operators: the generic error reply carries a short reference (the interaction ID), and the
  matching log line holds `ref`, the function name, the `sq:` code or SQLSTATE and the release revision, never
  student text. A test fails if any `sq:` code raised in a `shift_quest` migration has no entry in the Thai
  error copy. Unknown codes show the code to staff.
- Render errors are typed (`missing_sprite`, `bad_plot`, `too_large`) with the sprite key or slot; the log line
  carries the code and reference; `/admin status` counts render failures; the text fallback adds one line telling
  the student the picture failed, not their work. This replaces "log the error class only".
- Weekly post recovery: on final outbox failure, one staff notice names the reason code. Staff get
  `/season post preview` (renders the exact public post privately, needed because the post is about minors) and
  `/season post now` (one audited re-queue that bypasses the weekly dedupe). A weekly post still unsent at the end
  of its week expires instead of releasing late.
- Season command names: `/season new` and `/season edit` (autocomplete for the season, every option optional on
  edit, defaults shown in the reply) and `/season unlock add|edit|remove` replace `/season set` and `/season
  unlock`. `/season award`, `/season status` and the post commands stay.
- Season validation: each rule has its own refusal code (`season_dates_order`, `bar_out_of_range`,
  `bar_missing_milestone`, `season_active_exists`, `recognition_cap`) and the reply echoes the field and the
  value, for example "cutoff 2027-05-20 is after review deadline 2027-05-18". Setting an unlock amount while
  awards are off replies with a warning that no coins will move.
- Dates: season dates are Asia/Bangkok calendar dates and every deadline includes its whole day (to 23:59:59
  Bangkok); `/season status` echoes the exact times. Tests at 23:59 and 00:00 Bangkok.
- Approval correction ships in wave 1 as `/admin correct` (admin role, one transaction), replacing
  `/season correct`. The reply shows the stage before and after, the milestone removed, coins reversed or "no coins
  attached", any qualification change and grants kept; a repeat returns `already_corrected` with no side effect;
  a missing reason has its own code.
- Milestone modal: creating the milestone quest and submitting it is one database call with no side effect on
  refusal. The modal values are kept for 30 minutes in the existing drafts store; a refusal replies with a "send
  again" button that reopens the modal filled in, and a teammate collision offers "join as contributor" with the
  text carried over. Students get their own wording for a stale revision.
- Milestone 6: the helper picks the helped student with a Discord user select (the plot is derived from that
  student's project); the confirmation request expires after 7 days with a notice to the helper; a decline returns
  the milestone to not started with no penalty. This replaces picking by plot number.
- Escape hatches: a `checkins` feature switch (set by founder decision 5) hides the tap button when off; a setting
  lists which milestones are self-declared (default 1 and 2). Founder decisions 1, 2, 4 and 5 map to named settings,
  and activating a season refuses with `config_incomplete` until they are recorded.
- `/island` before `/start` replies with a Start button instead of a bare refusal. Length refusals state the limit.
- Production migration runbook (in the features doc): run `supabase db push --dry-run` and continue only if it
  lists exactly the eight files `20261111090000` to `20261111090700`; if any is missing, stop and write a forward
  migration instead of editing in place; if a push fails at file N, the files before N are applied, so fix N and
  push again; the human gives the go at the CLI prompt. After the first production push these files are frozen.
- CI: a `shift-quests-db` job in `.github/workflows/ci.yml` installs Postgres and runs `pnpm test:db:quests` (one
  first-apply pass and one idempotency pass); it is a required check.
- Local preflight: `supabase/tests/shift_quests/run-local.sh` and `bot/quests-sandbox.sh` check for `initdb` and
  Postgres 15 or newer first; when missing they print the install command and `PG_BIN` hint to stderr and exit 2.
- Sandbox: it records a hash of the migrations and a successful-init marker; on a mismatch or a failed init it
  prints the rebuild command (`QUEST_SANDBOX_RESET=1 bot/quests-sandbox.sh`) and exits 1. A database-only mode needs
  no Discord credentials. The default seed matches Season 1 defaults (no reward rule on milestones); a rewards
  scenario is an explicit option. The seed is updated in the same wave as any signature it calls.
- Render preview: `pnpm island:render --fixture full|empty|overflow [--thumb] --out island.png` renders without
  Discord or a database, from the same fixtures the renderer hash test and the deploy smoke check use. The hash test
  writes `_actual.png` on mismatch and accepts it with `UPDATE_ISLAND_HASH=1`; the expected hash lives in a fixture
  file.
- Deploy: `bot/deploy.sh` builds with the revision tag only, runs the smoke render with no env file and
  `--network none`, and on failure prints the revision, "old container still running, nothing changed", the last
  stderr lines and the fix, then removes the new image. It tags `latest` only after the new container reports
  healthy. Its staged dependency list lives in one place and the script fails before archiving if a listed package
  is missing from `node_modules`; the renderer adds no runtime dependency beyond that list.
- Docs per wave: each wave updates `bot/README.md` and `docs/features/shift-high-quests.md` (command table,
  island channel, launch order, the migration runbook, a one-screen `/season` card with copy-paste examples and
  expected replies, a troubleshooting and upgrade page, and shipped versus planned labels), and the features
  architecture diagram gains the renderer and the island channel.
- Island function contracts: the features doc lists each new island function with its arguments, defaults,
  timezone rule, refusal codes and retry behaviour; `/season status` explains why a project qualifies, including
  provisional pending submissions.
- If wave 2 lands as a later migration, a populated wave-1 fixture is upgraded to wave 2 in the DB suite.
<!-- /autoplan-accepted:dx -->


Product type: platform-style operator tool with a CLI-like surface (Discord slash commands for staff, shell
scripts, `supabase db push`, `shift_quest_*` SQL functions). Auto-decided from the plan and `bot/README.md` (P6).

```
TARGET DEVELOPER PERSONA
========================
Who:       PassionSeed operator: the founder or a staff engineer, usually driving an AI coding agent
Context:   sets up the bot, tests it locally, deploys it, runs a season (dates, unlocks, awards, posts)
Tolerance: about 10 minutes to see something real before switching to manual work
Expects:   one sandbox command, copy-paste admin examples, errors that say what to do next
Secondary: the AI coding agent implementing and operating it (reads errors literally, cannot ask)
```

**Empathy narrative.** I pull the branch and want to see the island. `bot/README.md` points me at
`bot/quests-sandbox.sh`, which first stops me for three Discord variables, so I go to the developer portal, make
a test bot, invite it, and copy IDs. Then it fails with `realpath: : No such file or directory` because Homebrew's
Postgres is keg-only; nothing tells me about `PG_BIN` (observed by the native voice). Once it runs, the seeded
season is great: neighbours, a demo day, an unlock. Next week I pull new migrations, and the sandbox silently
keeps the old schema. To set a real season I find a twelve-argument SQL function in the sandbox seed. When a
student says "something went wrong", I have no reference to find the log line. Registering commands leaves
`/quest` live and quietly starts a second bot.

**Competitive DX benchmark**

| Tool | Start → result | Time + evidence type | DX choice | Source |
|---|---|---|---|---|
| discord.js guide (`/ping`) | new app → command answers in a test server | about 10 min, estimated | guild-scoped registration for instant updates | https://v15.discordjs.guide/creating-your-bot/slash-commands |
| Bun discord.js guide | install → bot replies | about 5 to 10 min, estimated | one register step, personal test server | https://bun.com/docs/guides/ecosystem/discordjs |
| chookscord | config + one command → live bot | under 5 min after token, reported by the author | dev script, dev server ID | https://www.npmjs.com/package/chookscord |
| This plan today | clone → island in Discord | 30 to 45 min first run; about 5 min DB tests with Postgres on PATH (native voice, estimated) | seeded sandbox, test bot required | `bot/quests-sandbox.sh:1-92` |

**TTHW target (auto-decided, P5):** Champion for the render preview (`pnpm island:render`, under 2 minutes after
`pnpm install`, no Discord, no database); Competitive for the Discord sandbox once a test bot exists (under 5
minutes, warm, including a fresh rebuild). First-time Discord app creation stays outside our control and is
documented, not counted.

**Magical moment (0D, auto-decided A):** one command renders the seeded island with neighbours at different
stages to a PNG the operator can open (`pnpm island:render --fixture full`). B (sandbox `/island` in Discord)
remains the second step; C (keep) rejected because the renderer has no loop today.

**Developer journey map**

```
STAGE           | DEVELOPER DOES                         | FRICTION POINTS                          | STATUS
----------------|----------------------------------------|------------------------------------------|--------
1. Discover     | reads bot/README, features doc         | docs contradict plan in 4 places         | fixed (docs per wave)
2. Install      | pnpm install, Postgres 15+             | keg-only Postgres, cryptic failure       | fixed (preflight)
3. Hello World  | island:render, then sandbox            | no render loop; Discord creds required   | fixed (render preview, DB-only mode)
4. Real Usage   | /season new, unlocks, awards, posts    | positional SQL, create-vs-update naming  | fixed (/season new|edit, codes)
5. Debug        | student reports an error               | no reference; untyped render errors      | fixed (ref, typed codes)
6. Upgrade      | db push, deploy, register              | stale sandbox; retired commands linger;  | fixed (runbook, retire, CI)
                |                                        | register starts a second bot             |
```

**First-time developer report**

```
Persona: operator with an AI agent
T+0:00  reads bot/README "Try it locally"; runs bot/quests-sandbox.sh
T+0:30  stopped: QUEST_SANDBOX_TOKEN not set; leaves for the Discord developer portal
T+12:00 back with token, guild and user IDs; script fails at realpath/initdb (keg-only Postgres)
T+20:00 finds PG_BIN by reading the script; sandbox seeds; /island works in the test server
T+25:00 tries to set a real season; reads a 12-argument SQL call in the seed; gives up and asks the agent
```
Addressed: render preview (T+0), preflight (T+12), `/season new|edit` card (T+25), DB-only sandbox mode.

**DX dual voices**

Claude DX subagent (INPUT dx 41ee61b8..., completed): 0 Critical, 13 High (stale copy commands, retired
commands stay registered, no error reference, untyped render errors, weekly-post recovery, season validation
codes, correction contract, modal refusal loses text, db push runbook, DB suite not in CI, Postgres preflight,
no check-in switch, milestone 6 inputs), 14 Medium. Overall 5/10.
Codex (gpt-6-astra, completed): 7 High (hello world over 5 min, stale sandbox, register lifecycle and retirement,
errors not agent-ready, deploy smoke not a rollback, DB gate and populated upgrade, wave boundary not operable),
2 Medium (docs untrustworthy, SQL and season APIs need inference). Recommendation: narrow to an independently
deployable wave-1 pilot.

```
DX DUAL VOICES — CONSENSUS TABLE:
  Dimension                           Claude  Codex  Consensus
  1. Getting started < 5 min?          no      no     CONFIRMED (gap)
  2. API/CLI naming guessable?         partly  no     CONFIRMED (gap)
  3. Error messages actionable?        no      no     CONFIRMED (gap)
  4. Docs findable & complete?         no      partly CONFIRMED (gap)
  5. Upgrade path safe?                no      no     CONFIRMED (gap)
  6. Dev environment friction-free?    no      no     CONFIRMED (gap)
CONFIRMED = native + outside agree; primary cannot replace outside.
```

No DISAGREE rows. Codex's wave-boundary finding reinforces CEO UC1 and UC2 (no new User Challenge). Codex's typed
`QuestApi` wrapper is deferred (outside DX POLISH); documented function contracts are accepted instead.

**Pass 1 Getting Started: 5 → 7.** No render loop, Discord credentials before anything, keg-only Postgres
failure. Accepted: render preview, preflight, DB-only sandbox mode. A 10 needs a hosted demo server, out of scope.

**Pass 2 API/CLI: 6 → 8.** `/season set` is create-or-update by name (typo makes a second season); unlock labels
upsert; milestone 6 picks a plot but needs a person. Accepted: `/season new|edit`, `unlock add|edit|remove`, user
select for milestone 6, documented function contracts.

**Pass 3 Errors (agent-ready-v1): 5 → 7.**

```
ERROR PATH MATRIX (agent-ready-v1)
Path                  | Class      | what | fix | recovery | code | context | trace | redaction | channel | Cap
/island render fail   | unexpected | part | gap | ok       | gap  | gap     | gap   | pass      | pass    | CAP6:trace
weekly post fail      | dependency | pass | gap | gap      | gap  | part    | part  | pass      | part    | CAP6:recovery
milestone submit      | validation | pass | part| gap      | pass | pass    | N/A   | pass      | pass    | CAP6:recovery
/season new|edit      | usage      | gap  | gap | N/A      | part | N/A     | N/A   | pass      | pass    | CAP6:fix
/admin correct        | usage      | gap  | gap | gap      | gap  | gap     | N/A   | pass      | pass    | CAP6:recovery
unexpected interaction| unexpected | gap  | part| part     | N/A  | gap     | gap   | pass      | pass    | CAP6:trace
test:db:quests/sandbox| setup      | part | gap | N/A      | N/A  | gap     | N/A   | pass      | pass    | CAP6:fix
```

No CAP4 (no secret leak, no failure reported as success, no unsafe fix, no terminal block; `supabase db push`'s
prompt is the intended human go). All CAP6 rows have accepted fixes (reference IDs, typed render codes, post
recovery and preview, per-rule season codes, correction contract, modal draft retry, preflight). Residual: operator
log access is by SSH only.

**Pass 4 Docs: 4 → 7.** README says 15 commands and `zlib`; features doc still lists `/quest` and `/progress`,
`island_map(null)` and approval-date qualification. Accepted: docs per wave with a `/season` card, runbook and
troubleshooting page.

**Pass 5 Upgrade: 4 → 7.** Retired commands linger; in-place edits are unsafe once anything is applied; no
populated upgrade test. Accepted: retirement step, dry-run runbook and freeze rule, signature rule, conditional
populated upgrade fixture.

**Pass 6 Dev environment: 5 → 7.** DB suite not in CI; sandbox drifts; register starts a bot. Accepted: CI job,
sandbox hash and reset, register exits.

**Pass 7 Community: 5 → 5.** Internal operator tool in a private ops context; the staff channel and this repo's
docs are the community. No issues beyond docs; nothing added.

**Pass 8 DX measurement: 4 → 6.** No TTHW measure. Accepted: the render preview and sandbox give a timed path;
run `/devex-review` after wave 1 to measure it (boomerang). No telemetry added.

## DX Review Scorecard

```
+====================================================================+
|              DX PLAN REVIEW — SCORECARD                             |
+====================================================================+
| Dimension            | Score  | Prior  | Trend  |
|----------------------|--------|--------|--------|
| Getting Started      |  7/10  |  5/10  |  ↑2    |
| API/CLI/SDK          |  8/10  |  6/10  |  ↑2    |
| Error Messages       |  7/10  |  5/10  |  ↑2    |
| Documentation        |  7/10  |  4/10  |  ↑3    |
| Upgrade Path         |  7/10  |  4/10  |  ↑3    |
| Dev Environment      |  7/10  |  5/10  |  ↑2    |
| Community            |  5/10  |  5/10  |  =     |
| DX Measurement       |  6/10  |  4/10  |  ↑2    |
+--------------------------------------------------------------------+
| TTHW                 | <2 min preview; <5 min warm sandbox | 30-45 min first Discord run | ↑ |
| Competitive Rank     | Competitive (Champion for the preview)       |
| Magical Moment       | designed via pnpm island:render              |
| Product Type         | operator platform + slash-command CLI        |
| Mode                 | POLISH                                       |
| Overall DX           |  7/10  |  5/10  |  ↑2    |
+====================================================================+
| DX PRINCIPLE COVERAGE                                               |
| Zero Friction      | covered (preview, preflight)                   |
| Learn by Doing     | covered (sandbox, fixtures)                    |
| Fight Uncertainty  | covered (codes, references, runbook)           |
| Opinionated + Escape Hatches | covered (defaults, switches)         |
| Code in Context    | covered (/season card examples)                |
| Magical Moments    | covered (render preview)                       |
| Agents Are Users   | covered (stable codes, exit codes, no prompts) |
+====================================================================+
```
Community stays at 5 (internal tool). No dimension below 5.

```
DX IMPLEMENTATION CHECKLIST
============================
[ ] Render preview under 2 min after pnpm install; warm sandbox under 5 min
[ ] Installation is one command (pnpm install) plus a checked Postgres
[ ] First run produces meaningful output (a PNG island)
[ ] Magical moment delivered via pnpm island:render
[ ] Every error message meets the agent-ready error contract (Pass 3)
[ ] /season and /admin names guessable; create and edit are separate
[ ] Every season option has a default shown in the reply
[ ] /season card has copy-paste examples with expected replies
[ ] Examples cover a real season, an approval and a recovery
[ ] Migration runbook and freeze rule documented
[ ] Retired commands removed by the register step
[ ] TypeScript types for island function payloads
[ ] DB suite runs in CI as a required check
[ ] n/a: free tier (internal tool)
[ ] Docs updated per wave (changelog: the features doc status line)
[ ] n/a: docs search (two files)
[ ] Staff channel is the support channel
```

**NOT in scope (DX).** Deferred: a typed `QuestApi` wrapper per function (outside POLISH; documented contracts
instead); a hosted demo Discord server; TTHW telemetry. Pending TODOS.md entries, not persisted (write boundary).

**What already exists (DX).** `bot/quests-sandbox.sh` seeded sandbox; `pnpm test:db:quests`; stable `sq:` codes
with Thai copy (`bot/src/quests/copy.ts:302-356`); `/admin status` blockers; outbox retries; SQLSTATE-only logs
(`bot/src/quests/api.ts:42-54`); drafts store (`bot/src/quests/drafts.ts`).

#### DX implementation tasks

- [ ] **T1 (P1, human: ~2h / CC: ~10min)** bot: register step retires `quest` and `progress`, prints the diff, and exits without logging in. Files: `bot/src/quests/commands.ts`, `bot/src/index.ts`. Verify: run against a test guild twice; second run shows no changes.
- [ ] **T2 (P1, human: ~3h / CC: ~15min)** bot: error reference in generic replies and logs; test that every raised `sq:` code has copy; copy-command test. Files: `bot/src/quests/ui.ts`, `bot/src/quests/api.ts`, `bot/src/quests/copy.ts`, tests. Verify: `pnpm test bot/src`.
- [ ] **T3 (P1, human: ~2h / CC: ~10min)** ci: `shift-quests-db` job runs `pnpm test:db:quests`; required. Files: `.github/workflows/ci.yml`. Verify: CI run on the branch.
- [ ] **T4 (P1, human: ~2h / CC: ~10min)** scripts: Postgres preflight; sandbox hash, reset and DB-only mode; pilot-default seed. Files: `bot/quests-sandbox.sh`, `supabase/tests/shift_quests/run-local.sh`. Verify: run with Postgres off PATH (exit 2 with hint); edit a migration (exit 1 with rebuild command).
- [ ] **T5 (P1, human: ~3h / CC: ~15min)** deploy: revision-tag build, isolated smoke render, clear failure output, `latest` after healthy, single dependency list. Files: `bot/deploy.sh`. Verify: break a sprite path; deploy aborts and old container keeps running.
- [ ] **T6 (P2, human: ~4h / CC: ~20min)** db+bot: `/season new|edit`, `unlock add|edit|remove`, per-rule codes with echoed values, Bangkok whole-day deadlines, awards-off warning. Files: `supabase/migrations/20261111090700_shift_quests_island.sql`, `bot/src/quests/commands.ts`, handlers. Verify: DB tests at 23:59 and 00:00 Bangkok; one test per refusal code.
- [ ] **T7 (P2, human: ~3h / CC: ~15min)** db+bot: weekly post final-failure notice, `/season post preview` and `post now`, end-of-week expiry. Files: 090700, `bot/src/quests/outbox.ts`. Verify: forced send failure produces one staff notice; preview shows only consented names.
- [ ] **T8 (P2, human: ~3h / CC: ~15min)** db+bot: `/admin correct` contract (wave 1); milestone modal single call, draft retry and join; milestone 6 user select, expiry, decline. Files: 090700, review functions, `bot/src/quests/drafts.ts`, handlers. Verify: bot flow tests per refusal.
- [ ] **T9 (P2, human: ~2h / CC: ~10min)** bot: `pnpm island:render` with shared fixtures; typed render errors; hash update path. Files: `bot/src/quests/island/render.ts`, `package.json`, tests. Verify: `pnpm island:render --fixture full --out /tmp/i.png` under 2 min.
- [ ] **T10 (P2, human: ~2h / CC: ~10min)** bot: `checkins` switch, self-declared milestone setting, decision-to-setting map with `config_incomplete`, Start button before `/start`, limits in length errors. Files: 090700, `bot/src/quests/commands.ts`, `copy.ts`. Verify: tests per switch.
- [ ] **T11 (P2, human: ~3h / CC: ~15min)** docs: README and features doc per wave: command table, launch order, migration runbook, `/season` card, troubleshooting, function contracts, updated diagram. Files: `bot/README.md`, `docs/features/shift-high-quests.md`. Verify: a fresh agent follows the card to set a sandbox season without reading SQL.
- [ ] **T12 (P3, human: ~2h / CC: ~10min)** db: populated wave-1 to wave-2 upgrade test, only if wave 2 becomes a later migration. Files: `supabase/tests/shift_quests/db_rules.ts`. Verify: `pnpm test:db:quests`.

### Phase 3: Eng review (FULL_REVIEW)

Accepted Eng requirements:

<!-- autoplan-accepted:eng -->
- Migration split (structure): wave-1 objects stay in `20261111090700_shift_quests_island.sql`; seasons, dated
  unlocks, earned unlocks, recognitions, squads, the weekly post enqueue and the season admin functions move to a
  later unapplied migration (`20261111090800_shift_quests_seasons.sql`). No wave-1 file references a wave-2 table;
  functions that need both (data export, erasure, the approval hook) are replaced in the later migration with
  `CREATE OR REPLACE`. The later migration ships only when wave 2 is approved, and the DB suite upgrades a
  populated wave-1 fixture to it.
- Team milestones in the schema: `shift_quest_instances.milestone smallint` is filled when a milestone quest is
  created, and a unique index on `(project_id, milestone)` over the open states (including the new awaiting
  confirmation state) enforces one open milestone quest per project. The submit lock is keyed on project and
  milestone; a unique violation maps to `sq:milestone_open`, which drives the "join as contributor" reply. Test:
  two teammates submitting the same milestone at once produce one quest and one join offer.
- Shared quest rights: any active project member may answer a clarification and resubmit; only the quest's owner
  withdraws or archives it; if the owner leaves or is erased, ownership passes to the longest-standing active
  member instead of archiving. Contribution lines are snapshotted per revision and must be confirmed before the
  revision reaches review, never after approval.
- Explicit project: every island action (`/island`, tap, milestone submit, rest, consent, target event) takes the
  project ID, carried in button custom IDs and drafts, and the database checks the caller is an active member.
  Milestone submits carry an operation key that the database records, so a retry after a lost response returns the
  first result instead of creating another revision; the bot distinguishes a known refusal from an unknown outcome.
  Test: pick project B, tap, and the row lands on B.
- Achievement provenance: submissions record `decision_kind` (`self` or `mentor`) and `mentor_seen_at`; the
  self-declaration policy in force is stored on the submission. The tree stage counts self-declared milestones;
  demo-day bars, dated unlocks, the island goal, verification notes and the evidence export count a milestone only
  once a mentor has seen it. Self-declaring writes no reviewer row.
- Season counting: one helper, `shift_quest__season_count(project, season, as_of)`, is used by bars, unlocks, the
  goal, squads, `/admin report` and `/season status`. Its unit is mentor-seen approvals whose qualifying time falls in
  the season window; repeats of milestones 3 and 4 count only when the reviewer set `distinct_confirmed`. The
  qualifying time is the earliest submission in the unbroken chain that ends in approval: clarification revisions
  continue the chain, a withdrawal or decline breaks it. Qualification is count at least the bar and the set
  includes milestone 2 (table) or 3 (stage); admin input refuses only an out-of-range bar.
- Provisional slots: slots are snapshotted at the review deadline; a project counted on a still-pending submission
  is labelled provisional in `/season status`; a later decline moves it to the work-in-progress corner. Provisional
  work never triggers an unlock.
- Grant reconciliation: an idempotent `shift_quest_reconcile_season(season)` runs on each outbox minute tick and after
  approvals, unlock edits and deadlines. It evaluates eligibility with the counting helper and records each grant
  with its qualifying evidence and recipient snapshot. The island goal sets `reached_at` once under the season row
  lock; recipients are members active on a project at `reached_at`; members are locked in id order in batches.
  Recognition and coin delivery are separate rows; switching awards on later does not back-pay earlier grants. Once
  an unlock has grants, only its label can be edited.
- Approval correction: submissions gain `corrected_at`, `corrected_by` and `reason`, and the instance moves to a
  `corrected` state that the shared counting helpers exclude; the milestone can be submitted again. Coins are
  reversed with the existing reversal entry and a balance may go below zero (existing rule). Tests check every
  derived value before and after a correction, including a correction racing an approval.
- Rest per member: `shift_quest_members.resting_since`. A shared quest pauses only when every participant rests; any
  tap or milestone clears `resting_since` in the same transaction; `/admin report` counts resting students separately
  from quiet ones. Test: a tap racing a rest.
- Milestone 6 attestation ships in wave 2 with the helped student's confirmation; wave 1 offers milestones 1 to 5
  and 7. The confirmation is a private attestation tied to the exact submission revision, separate from the peer
  recognition share flow (which needs an approved quest and queues a public post). The database accepts only an
  onboarded student, not staff, with an active project the helper is not on; the helped project is that student's
  current project at request time, frozen. One pending request per helper and at most two requests per target per
  week; the request is delivered through `/inbox` only. If the installed discord.js has no user select in modals,
  it is a two-step flow.
- Island privacy rule: both maps come from one helper, `shift_quest__plot_json(project, viewer)`. A plot that is
  neither the viewer's nor fully consented returns its slot only (no stage, no decorations); `shift_quest_island_map`
  refuses a null actor with `sq:bad_input`; the consent copy says it covers name, stage and decorations; a milestone
  6 path is drawn only when both ends are visible to the viewer. The outbox records which plots each weekly post
  showed; when consent is withdrawn or a member is erased, staff get a notice listing the affected Discord message
  IDs to delete by hand (the bot never deletes posts, per the existing policy).
- Production Postgres: CI runs the DB suite on Postgres 15, the production major (`supabase/config.toml:31`). Before
  merge, the unapplied migration files are renamed to timestamps after the newest migration on main if main has
  moved past them, and the runbook checks `supabase migration list` for the remote newest before `db push`.
- Weekly post delivery: enqueue whenever the current time is past this week's scheduled time and no row exists for
  (season, ISO week), until the week ends, so a bot outage at the scheduled hour does not skip a week. Keys are
  `island:<season>:<iso week>` and `island:<season>:<iso week>:manual:<request id>`; the outbox gains `expires_at`;
  leases carry an attempt token so a stale worker cannot acknowledge a newer attempt; a manual re-send refuses when a
  sent row exists for that week unless forced and audited. `/season post preview` is labelled "as of now". Test: the
  week of 2026-12-28 to 2027-01-03 (ISO 2026-W53).
- Render budget: all plot stages come from one set-based query; the base image is cached by a hash of the map payload
  and only the caller's pin is drawn per request; an image holds at most 120 plots, with stable slot-based pages
  beyond; tests assert render time under 150 ms and PNG size under 1 MB for a 200-plot fixture [estimated budgets].
- Deploy rollback: `bot/deploy.sh` records the previous revision, starts the new container and, if it is not healthy
  within 4 minutes, stops it and starts the previous revision again without overlapping sessions. The smoke step
  imports `bot/src/quests/index.ts` and validates the env file without network. `pngjs` stays a dev dependency (the
  renderer uses `node:zlib`), replacing the earlier staging requirement. New outbox kinds are only queued for the
  `island` channel, which is configured after the new bot runs, so an old bot never receives them.
- Launch window: the `quest` and `progress` handlers stay for one release and reply privately "use /island"; the
  next release retires them. A test asserts `--register-commands` exits. Confirm that projectseed's guild is not the
  SHIFT guild, because its registration replaces the whole guild command list (`bot/src/commands.ts:39-40`); if it is
  the same guild, switch it to per-command upserts first.
- Schema check: a `shift_quest_schema_version()` function returns the newest applied island migration version; the bot
  refuses to start the quests module, with a clear log line, when it is older than the bot expects.
- CI and harness: the DB job runs on every pull request (it skips inside the job when no quest file changed);
  `run-local.sh` mirrors Supabase's default table grants as well as function grants; the idempotency pass compares a
  catalog hash instead of re-running assertions.
- Free text: erasure blanks squad names and targets and target-event names written by the erased member;
  `shift_quest_recognitions.reason` is capped at 200 characters and `/season award` warns against personal detail.
- Ledger kinds: coins from a dated unlock use kind `award` under the unlock's reward rule, so existing caps
  apply; category and surprise grants use kind `recognition`. This replaces "kind `recognition` per grant" for unlocks.
- Precedence for implementers: where baseline sections 1 to 8 and the accepted blocks disagree, the later block wins
  (Eng over DX over CEO over baseline).
<!-- /autoplan-accepted:eng -->


Scope gate: autoplan target, the reviewed plan `docs/designs/shift-high-island.md`.

#### Eng Step 0: Scope Challenge

**What already solves each sub-problem.** DB-owned rules and least-privilege bot role
(`supabase/migrations/20261111090600_shift_quest_bot_role.sql:30-49`); quest choose, submit and review
(`20261111090100_shift_quests_core_functions.sql:788,1047`, `20261111090200_shift_quests_review_functions.sql:288`);
contributions per submission (`20261111090000_shift_quests_schema.sql:230`); outbox with leases and backoff
(`bot/src/quests/outbox.ts`); drafts store (`bot/src/quests/drafts.ts`); the island renderer already in the tree,
pure `node:zlib` (`bot/src/quests/island/render.ts:12-14`); per-plot advisory-locked slot assignment
(`20261111090700_shift_quests_island.sql:210-235`).

**Code versus plan drift (verified by reading the tree).**
1. [CRITICAL] (confidence: 9/10) `20261111090700_shift_quests_island.sql:933-937` — milestone submit looks up only
   `i.member_id = v_member.id` and locks on `'shift_quest_milestone:' || v_member.id`, so two teammates open two quests
   for one project milestone; the plan requires one. Accepted fix in the Eng block.
2. [CRITICAL] (confidence: 9/10) `20261111090700_shift_quests_island.sql:282` — `s.decided_at < p_before` counts by
   approval time; the plan counts by qualifying submission time. Accepted fix (counting helper).
3. [CRITICAL] (confidence: 9/10) `20261111090700_shift_quests_island.sql:490-491` — dated unlocks require
   `now() < bkk_end(u.deadline)` at approval and count all-time distinct milestones; contradicts submission-time and
   in-season counting. Accepted fix (reconciliation).
4. [INFORMATIONAL] (confidence: 8/10) `bot/src/quests/island/render.ts:258-262` — `cols` grows with
   `ceil(sqrt(plotCount) * 9)`, so adding projects past 11 changes the layout and moves every plot; contradicts
   "stable plot position" and the accepted fixed-capacity rule. Accepted (fixed layout, pages beyond 120).
5. [INFORMATIONAL] (confidence: 9/10) `20261111090700_shift_quests_island.sql:1435-1445` — weekly enqueue fires only
   in the Monday 18:00 Bangkok hour, keys `island:<week>` without season, posts to `celebrate`, ignores the active
   season. Accepted fix (catch-up enqueue, season keys, island channel).
6. [INFORMATIONAL] (confidence: 9/10) `bot/src/quests/outbox.ts:43` — the weekly post calls
   `shift_quest_island_map` with `null`, whose null branch skips the member check and returns every plot's stage.
   Accepted fix (post-map helper, null refused).
7. [INFORMATIONAL] (confidence: 9/10) `bot/src/commands.ts:39-40` — projectseed registration PUTs the whole guild
   command list; if it shares the SHIFT guild it deletes the quest commands. Accepted (confirm guild first).

**Minimum changes.** Wave 1 (island model, `/island`, milestone flow, renderer, correction) is the minimum for "a
small pixel island"; wave 2 (seasons, unlocks, recognitions, squads, weekly post) is deferrable without blocking it.
**Complexity check:** about 20 changed files and 3+ new modules (renderer, island handlers, seasons) [estimated], so
gate B trips. **Structure (auto-decided, `plan-eng-review-structure`):** Smaller arrangement: the same feature list
with wave-2 objects in a later migration (`20261111090800`), versus the Original arrangement of one island migration.
Pending remedies not decided here: UC1 (manual Season 1), UC2 (board versus island). Scope record: feature answers:
none cut; structure: B (smaller arrangement, auto-decided, P5); accepted scope: plan as amended by CEO and DX;
pending remedies: UC1, UC2. Result: scope accepted as-is.
**Search check:** no new infrastructure pattern beyond existing Postgres advisory locks and the outbox; built-ins
preferred (Layer 1). **TODOS cross-reference:** no `TODOS.md` in the repo. **Distribution:** the bot image is built
by `bot/deploy.sh`; no new artifact channel.

REALITY: premise-table finding 7 code-vs-plan premises checked, 0 unverified; the plan's "stage never decreases" and "approval-time" assumptions are false against the tree; unverified=0 supabase/migrations/20261111090700_shift_quests_island.sql:282
REALITY: already-done pass nothing on origin/main since 2026-11-09 touches quests or the island bot/src/quests/outbox.ts:43
REALITY: surface-check finding `/season`, `/admin correct`, `pnpm island:render` and `shift_quest_reconcile_season` do not exist yet; `--register-commands` falls through to login bot/src/index.ts:69
REALITY: binding-decisions pass no branch decisions; Eng honours the CEO and DX accepted blocks and the production Postgres major supabase/config.toml:31
REALITY: numbers finding render budgets (150 ms, 1 MB, 120 plots) are [estimated] targets, not measurements bot/src/quests/island/render.ts:312
REALITY: deferred-asks pass no linked issue; founder spec is outside the repo docs/features/shift-high-quests.md:7
REALITY: pr-count finding default one PR per wave (no ship-policy file); the migration split keeps wave 2 as its own PR with its own `db push` docs/designs/shift-high-island.md:1
REALITY: transaction-semantics pass no driver or pool change; new locks follow the documented quest, member, item order with the project lock after the quest supabase/migrations/20261111090700_shift_quests_island.sql:238

#### Eng dual voices

Claude Eng subagent (INPUT eng 263bd186..., completed): 6 High (duplicate teammate quests; picker writes to the wrong
project; self-declared milestones make the table bar mentor-free; approval-time counting; private map leaks hidden
stages; partial production push from Postgres version and timestamp order), 9 Medium (goal-grant deadlock, correction
breaks invariants, rest per member, milestone 6 state and abuse, launch window, no deploy rollback, weekly scheduling,
render blocks the loop, gameable provisional slots), 4 Low (CI path filter, table grants in harness, forward references,
free text in erasure).
Codex (gpt-6-astra, completed): 8 High (milestone 6 cannot reuse peer recognition; self versus mentor provenance;
season counting unit and finalization; grants need reconciliation; shared-quest ownership; retries and project
context; consent scope and historical posts; no wave boundary in the schema), 3 Medium (duplicate delivery and lease
fencing; bounded rendering; deploy rollback and readiness). Recommendation: revise state and privacy contracts,
separate wave 2 into a later migration, validate Season 1 manually.

```
ENG DUAL VOICES — CONSENSUS TABLE:
  Dimension                           Claude  Codex  Consensus
  1. Architecture sound?               core yes, gaps  no  CONFIRMED (state contracts need work)
  2. Test coverage sufficient?         no      no     CONFIRMED (gap)
  3. Perf risks + budget/bench named?  no      no     CONFIRMED (gap)
  4. Security threats covered?         no      no     CONFIRMED (privacy, abuse)
  5. Error paths handled?              no      no     CONFIRMED (gap)
  6. Deployment risk manageable?       no      no     CONFIRMED (gap)
CONFIRMED = native + outside agree; primary cannot replace outside.
```

No DISAGREE rows. Codex's "validate Season 1 manually" reinforces UC1 (no new User Challenge). Milestone 6 moving to
wave 2 came from the Claude voice's scope note (taste D-E3).

#### Section 1: Architecture

```
            Discord (SHIFT guild)
               │ /island, buttons, modals        staff: /review, /admin, /season (wave 2)
               ▼
   bot/src/quests ── handlers/island.ts ──────────────┐
      │   drafts.ts (op key, project id)               │
      │   island/render.ts (node:zlib, cached base)    │ shift_quest_* (SECURITY DEFINER, bot role only)
      │   outbox.ts (lease token, attachments)         ▼
      │                                   wave 1: 090700 plots, milestone col + unique index,
      │                                           provenance, corrections, resting_since,
      │                                           __plot_json, __season_count (window = all)
      │                                   wave 2: 090800 seasons, unlocks, grants (reconcile),
      │                                           recognitions, squads, weekly enqueue
      └── outbox loop ◀── shift_quest_outbox_claim() ──▶ island channel (consented plots only)
```

Design-twice: shape A (the plan) keeps every rule in SQL and the bot draws pixels; shape B would compute stage and
qualification in TypeScript from raw rows. A hides more policy behind a smaller surface (one function per action) and
matches the repo's proven pattern, so A stays. Red flags: (5) split ownership of "current project" between the DB and
the picker, fixed by explicit project IDs; (8) hand-synced list of retired command names and copy commands, fixed by
the copy-command test; (2) information leakage of consent rules into two map functions, fixed by `__plot_json`;
(6) two ways to count milestones (`__milestones` all-time and season), fixed by one counting helper with a window.
Production failure per path: concurrent teammate submit (unique index), Discord 429 on post (outbox backoff), render
throw (text fallback), push fails at file N (runbook), deploy unhealthy (rollback). 7 issues.

#### Section 2: Code quality

(1) [INFORMATIONAL] (confidence: 8/10) `20261111090700_shift_quests_island.sql:943-944` — milestone quests are created
with goal = template purpose and next step `'-'`, which shows as "-" in quest views; name the step from the template.
(2) [INFORMATIONAL] (confidence: 7/10) `20261111090700_shift_quests_island.sql:510-512` — unlock coins use ledger kind
`award` under the unlock's reward rule while the plan said `recognition`; decision: unlocks tied to a reward rule keep
`award` (existing caps apply, P4), category and surprise grants use `recognition`. (3) `/admin` subcommand count near
Discord's 25 limit: the staff `/season` command already accepted. 3 issues, all accepted.

#### Section 3: Test review

Framework: Jest (`pnpm test`, `bot/src/quests/__tests__/island.test.ts`, `quests.test.ts`) and the throwaway-Postgres
suite (`pnpm test:db:quests`: `supabase/tests/shift_quests/db_rules.ts`, `bot_flows.ts`).

```
CODE PATHS                                                   USER FLOWS
[+] 090700 island (wave 1)                                   [+] /island first run
  ├── milestone_submit                                         ├── [GAP] no project → seed + Start/Project button
  │   ├── [GAP] two teammates at once → one quest      [→E2E]  ├── [GAP] several projects → picker → action on B
  │   ├── [GAP] retry with same op key → same result           └── [GAP] /island before /start → Start button
  │   └── [GAP] refusal keeps draft, "send again"           [+] Milestone
  ├── __season_count / qualifying time                          ├── [GAP] self-declared 1-2 grow at once
  │   ├── [GAP] clarification keeps chain time                  ├── [GAP] mentor approve grows tree, inbox notice
  │   ├── [GAP] withdraw breaks chain                           └── [GAP] correction lowers stage, coins reversed
  │   └── [GAP] 23:59 / 00:00 Bangkok boundaries            [+] Rest
  ├── corrections                                               ├── [GAP] shared quest pauses only if all rest
  │   └── [GAP] correction racing approval                      └── [GAP] tap clears resting_since (race)
  ├── __plot_json privacy                                   [+] Ops
  │   ├── [GAP] non-consented plot → slot only                  ├── [GAP] register retires quest/progress, exits
  │   └── [GAP] island_map(null) refused                        ├── [GAP] deploy unhealthy → previous revision
  ├── privilege loop                                            └── [GAP] db push runbook dry-run check (manual)
  │   └── [★ TESTED] one function only — db_rules.ts:85 → extend to all functions and tables
  └── render.ts
      ├── [★★ TESTED] deterministic output — island.test.ts
      ├── [GAP] decoded-pixel hash, fixed layout across plot counts
      ├── [GAP] missing sprite → typed error → text fallback
      └── [GAP] 200-plot budget (time, bytes), pages beyond 120
[+] 090800 seasons (wave 2)
  ├── [GAP] reconcile: late approval of pre-deadline submission grants unlock
  ├── [GAP] goal reached twice concurrently → one reached_at, no deadlock   [→E2E]
  ├── [GAP] provisional slot then decline → WIP corner
  ├── [GAP] weekly post catch-up after outage; ISO 2026-W53; stale lease token refused
  └── [GAP] populated wave-1 fixture upgrades to 090800
COVERAGE: 2/30 paths tested (7%) | QUALITY: ★★:1 ★:1 | GAPS: 28 (2 E2E-style concurrency)
```

Every GAP above is required proof of an accepted requirement (CEO, DX or Eng blocks), so no new test policy needs a
decision. Regression rule: the existing quest invariants table (`docs/features/shift-high-quests.md:86-101`) is at
risk from the milestone column, shared-quest rights and corrections; the existing `db_rules.ts` regression block must
stay green unchanged (CRITICAL). Tests made obsolete: none. Test plan artifact written to
`~/.gstack/projects/passionseed-web/bunyasit-feat-shift-high-quests-eng-review-test-plan-20261111-024333.md`.

#### Section 4: Performance

(1) [INFORMATIONAL] (confidence: 8/10) `20261111090700_shift_quests_island.sql:870-875` — the map runs
`__milestones`, `__name_visible` and `__is_teammate` per plot: three subqueries each; fine at pilot size, set-based
query accepted. (2) [INFORMATIONAL] (confidence: 7/10) `bot/src/quests/island/render.ts:312-371` — synchronous render
and deflate on the bot's event loop shared with voice heartbeats; cached base image and budgets accepted. Scale:
pilot tens of plots; budget test at 200 [estimated]. 2 issues.

#### Eng required outputs

**NOT in scope (Eng).** Typed `QuestApi` wrappers (deferred by DX); a web island; automated deletion of past Discord
posts (policy keeps manual deletion); TTHW telemetry.

**What already exists (Eng).** Reused: quest choose/submit/review, contributions, outbox, drafts, advisory-lock
plot assignment, privilege loop, Bangkok date helpers (`__bkk_today`, `__bkk_end`). Rebuilt: milestone counting
(one helper with a window) and the map (one privacy helper).

**Failure modes registry**

```
 CODEPATH              | FAILURE MODE                         | RESCUED? | TEST? | USER SEES?       | LOGGED?
 milestone_submit      | teammates race                       | Y        | Y     | join offer       | Y
 milestone_submit      | response lost, retry                 | Y (op key)| Y    | same result      | Y
 season reconcile      | deadlock on goal                     | Y        | Y     | nothing          | Y
 weekly post           | bot down at scheduled hour           | Y        | Y     | post later       | Y
 weekly post           | Discord accepted, ack failed         | Y (token)| Y     | no duplicate     | Y
 render                | 500 plots, slow                      | Y (pages)| Y     | paged image      | Y
 deploy                | new container unhealthy              | Y        | manual| brief restart    | Y
 db push               | fails at file N on PG 15             | Y (runbook, CI PG15) | Y | staff only | Y
 consent withdrawn     | old posts still show name            | partial (staff notice) | Y | name in old post until deleted | Y
```

CRITICAL GAPS: 0 open (the historical-post row is partial by policy: manual deletion with a staff notice).

**Worktree parallelization.**

| Step | Modules touched | Depends on |
|------|----------------|------------|
| A. DB wave 1 (milestone column, provenance, corrections, rest, privacy helper) | supabase/migrations, supabase/tests | — |
| B. Renderer budget, fixed layout, preview, typed errors | bot/src/quests/island, bot/assets | — |
| C. Bot island handlers, explicit project, drafts, command surface | bot/src/quests/handlers, commands | A |
| D. Ops: deploy rollback, register exit, CI job, preflight, sandbox | bot/deploy.sh, bot/src/index.ts, .github, scripts | — |
| E. Docs | bot/README.md, docs/features | A, C |
| F. Wave 2 migration 090800 and season handlers | supabase/migrations, handlers | A, founder go |

Lane 1: A → C → E. Lane 2: B. Lane 3: D. Launch 1+2+3 together; merge A before C; F waits for the wave-2 go.
Conflict flag: `bot/src/quests/commands.ts` is touched by C and D (register exit); sequence D's index change after C.

#### Eng implementation tasks

- [ ] **T1 (P1, human: ~1d / CC: ~40min)** db: split wave 2 into `20261111090800_shift_quests_seasons.sql`; no forward references from wave-1 files. Files: `supabase/migrations/20261111090700_shift_quests_island.sql`, new 090800, `20261111090100_shift_quests_core_functions.sql`, `20261111090200_shift_quests_review_functions.sql`, `20261111090400_shift_quests_admin_functions.sql`. Verify: apply 0900xx-090700 alone on PG 15; suite green.
- [ ] **T2 (P1, human: ~6h / CC: ~30min)** db: milestone column, unique open index, project-keyed lock, `sq:milestone_open`, shared-quest rights. Files: 090700, core functions. Verify: concurrent teammate test.
- [ ] **T3 (P1, human: ~6h / CC: ~30min)** db+bot: explicit project ID on every island action; op keys for submit. Files: 090700, `bot/src/quests/handlers/island.ts`, `bot/src/quests/drafts.ts`. Verify: picker-B and retry tests.
- [ ] **T4 (P1, human: ~1d / CC: ~45min)** db: provenance (`decision_kind`, `mentor_seen_at`), `__season_count` with chain rule, corrections state. Files: 090700, review functions. Verify: chain, boundary and correction tests.
- [ ] **T5 (P1, human: ~4h / CC: ~20min)** db+bot: `__plot_json` privacy helper; null actor refused; post map; consent copy scope. Files: 090700, `bot/src/quests/outbox.ts`, `bot/src/quests/island/copy.ts`. Verify: non-consented plot returns slot only.
- [ ] **T6 (P1, human: ~3h / CC: ~15min)** ci+ops: DB suite on Postgres 15 every PR; table grants in harness; catalog-hash idempotency; timestamp check vs main; `shift_quest_schema_version()` startup check. Files: `.github/workflows/ci.yml`, `supabase/tests/shift_quests/run-local.sh`, 090700, `bot/src/quests/index.ts`. Verify: CI run; start bot on old schema refuses.
- [ ] **T7 (P1, human: ~3h / CC: ~15min)** ops: deploy rollback within 4 min, smoke imports quests module, env validation; register exits; confirm projectseed guild. Files: `bot/deploy.sh`, `bot/src/index.ts`, `bot/src/commands.ts`. Verify: forced unhealthy deploy restores previous revision.
- [ ] **T8 (P2, human: ~4h / CC: ~20min)** bot: renderer fixed layout, pages beyond 120, cached base, budgets. Files: `bot/src/quests/island/render.ts`, tests. Verify: 200-plot budget test.
- [ ] **T9 (P2, human: ~3h / CC: ~15min)** db: rest per member (`resting_since`), report resting vs quiet. Files: 090700, admin functions. Verify: tap-races-rest test.
- [ ] **T10 (P2, human: ~2h / CC: ~10min)** bot: keep `quest`/`progress` stub handlers one release. Files: `bot/src/quests/index.ts`, handlers. Verify: stub replies with /island pointer.
- [ ] **T11 (P2, human: ~1d / CC: ~45min)** db (wave 2): `shift_quest_reconcile_season`, `reached_at`, grant snapshots, unlock freeze, provisional snapshot. Files: 090800. Verify: late-approval and concurrent-goal tests.
- [ ] **T12 (P2, human: ~4h / CC: ~20min)** db+bot (wave 2): weekly post catch-up, season keys, `expires_at`, lease token, manual re-send rule, posted-plot record and consent-withdrawal staff notice. Files: 090800, admin functions, `bot/src/quests/outbox.ts`. Verify: outage, W53 and stale-lease tests.
- [ ] **T13 (P2, human: ~4h / CC: ~20min)** db+bot (wave 2): milestone 6 attestation, target validation, rate limits, inbox delivery. Files: 090800, handlers. Verify: abuse-limit tests.
- [ ] **T14 (P3, human: ~1h / CC: ~10min)** db: erasure blanks squad and target-event free text; recognition reason cap. Files: admin functions, 090800. Verify: erasure regression.
- [ ] **T15 (P3, human: ~30min / CC: ~5min)** db: milestone quest next step from the template instead of `'-'`. Files: 090700. Verify: quest view shows the step.

**Eng completion summary**
- Step 0: Scope Challenge — scope accepted as-is (smaller arrangement: wave 2 in a later migration)
- Reality rows: 8/8 applicable rows emitted (PLAN_REALITY below), 0 unverified premises
- Architecture Review: 7 issues found
- Code Quality Review: 3 issues found
- Test Review: diagram produced, 28 gaps identified
- Performance Review: 2 issues found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 5 items proposed (not persisted: write boundary)
- Failure modes: 0 critical gaps flagged
- Unresolved decisions: 0 in this review (UC1, UC2 carried from CEO)
- Outside voice: codex (gpt-6-astra) completed
- Parallelization: 3 lanes, 3 parallel / 1 sequential (wave 2 waits)
- Lake Score: N/A (no coverage-scored questions)

### Phase 4: Final approval gate (prepared, not yet answered)

Gate file: `.gstack/tmp/autoplan/gate.json` (17 items: uc1, uc2, d1 to d14, p1). Full review: `.gstack/tmp/autoplan/review-record.md`.
Aggregated tasks: `.gstack/tmp/autoplan/aggregated-tasks.md` (41). Eng test plan:
`~/.gstack/projects/passionseed-web/bunyasit-feat-shift-high-quests-eng-review-test-plan-20261111-024333.md`.

**Cross-phase themes.** (1) Build less before evidence (CEO both voices, DX Codex, Eng Codex): UC1. (2) Alumni board
overlap (CEO, DX, Eng): UC2. (3) Never tied to speed: CEO's submission-time rule, Eng's verified approval-time code.
(4) Minors' privacy: CEO plain plots, Eng private-map leak and historical posts. (5) Operational safety: DX and Eng
both found the second-bot register step, lingering commands, no deploy rollback and no DB suite in CI.

**User Challenges (the user's direction stands until approved).** UC1: Season 1 by hand first, wave-2 build gated on
the week-4 bar. UC2: decide island versus alumni board before more wave-1 code. Details in the CEO User Challenges
section above.

**Taste decisions (applied provisionally).** d1 two waves; d2 `/island` more menu; d3 squads behind a switch; d4 no
coins per milestone; d5 in-season counting with milestones 2 and 3 in the bars; d6 self-declared milestones 1 and 2;
d7 milestone 6 attestation in wave 2; d8 slot-only non-consented plots; d9 work-in-progress corner; d10 Thai evidence
text; d11 DX targets; d12 `/season new|edit`; d13 `/admin correct` in wave 1; d14 wave 2 in a later migration.

**Deferred (TODOS.md not persisted: write boundary).** Weekly growth aggregate; what comes after stage 7; membership
link; typed `QuestApi` wrappers; hosted demo server; TTHW telemetry.

**Process note.** The island implementation was being written in the worktree during this review. Several findings
are drift between that code and the plan; re-check them against the tree before implementation resumes.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Mode SELECTIVE EXPANSION | Mechanical | override | autoplan rule | other modes |
| 2 | CEO | No 0D approach question | Mechanical | P6 | plan approach is viable | rewrite |
| 3 | CEO | C1 pngjs staged + pre-swap image check | Mechanical | P1 | prod crash risk | none |
| 4 | CEO | C2 season recognitions, distinct keys | Mechanical | P1 | false premise P6 | admin-award claim |
| 5 | CEO | C3 per-member name consent | Mechanical | P1 | boolean cannot hold it | project boolean |
| 6 | CEO | C4 submission-time qualification | Mechanical | P1 | review delay must not cost slots | approval time |
| 7 | CEO | C5 outbox attachments + island key | Mechanical | P2 | outbox was text-only | none |
| 8 | CEO | C6 season dates on funded meetups | Mechanical | P6 | brain decision 2026-10-30 | invented dates |
| 9 | CEO | E1 student-chosen external event | Mechanical | P2 | in blast radius, S | skip |
| 10 | CEO | E2 wait visibility + staff notice | Mechanical | P1 | observability | skip |
| 11 | CEO | E3 pilot report counts | Mechanical | P1 | launch scope | skip |
| 12 | CEO | E4 sprite sign-off gate | Mechanical | P1 | fun depends on art | skip |
| 13 | CEO | E5 `/island` more button | Taste | P5 | one command made true | keep `/quest` |
| 14 | CEO | E6 rest marker + growth line | Mechanical | P2 | delight in radius | skip |
| 15 | CEO | C7-C10 data rights, squads safety, m6 link, capacity | Mechanical | P1 | invariants | none |
| 16 | CEO | T1 two waves | Taste | P6 | core pilots first | one PR |
| 17 | CEO | D5 add decision 5 | Mechanical | P1 | alumni board overlap | silence |
| 18 | CEO | D1n no reward rule on milestones | Taste | P1 (SDT) | overjustification | coins per approval |
| 19 | CEO | S1-S24 spec-review fixes | Mechanical | P1/P5 | completeness, clarity | none |
| 20 | CEO | X2 weekly growth aggregate | Mechanical | P3 | goal total covers it | add |
| 21 | CEO | 0H documents approved (A) | Mechanical | P6 | both match decisions | revise |
| 22 | CEO | Success and stop rule | Mechanical | P1 | both voices | none |
| 23 | CEO | Reviewer rota | Mechanical | P1 | single point of failure | none |
| 24 | CEO | Pre-pilot checks | Mechanical | P1 | unproven assumptions | none |
| 25 | CEO | Self-declared milestones 1-2 | Taste | P1 | day-one win, mentor load | all reviewed |
| 26 | CEO | Milestone 6 confirmation | Taste | P4 | reuse recognition flow | self-claim |
| 27 | CEO | Plain non-consented plots | Taste | P1 | minors, small room | anonymous stages |
| 28 | CEO | Work-in-progress corner | Taste | P1 | audience for everyone | bars gate all |
| 29 | CEO | Verification note wording | Mechanical | P1 | credible evidence | none |
| 30 | CEO | In-season counting, bars need 2 and 3 | Taste | P1 | both voices; replaces all-time | all-time |
| 31 | CEO | Renderer text fallback | Mechanical | P1 | error map gap | none |
| 32 | CEO | Evidence text in `/data` | Taste | P2 | portfolio outcome | defer |
| 33 | CEO | UC1 manual Season 1 | User Challenge | n/a | both models | to gate |
| 34 | CEO | UC2 decide the home first | User Challenge | n/a | both models | to gate |
| 35 | CEO | Post-stage-7 and membership link | Mechanical | P3 | outside radius | add now |
| 36 | DX | Product type: operator platform + slash-command CLI | Mechanical | P6 | README audience | library |
| 37 | DX | Persona: operator with an AI agent | Mechanical | P6 | README "whoever runs the bot" | student |
| 38 | DX | Target: Champion preview, Competitive warm sandbox | Taste | P5 | fewer steps | current 30-45 min |
| 39 | DX | Magical moment: `pnpm island:render` | Mechanical | P5 | lowest effort, existing renderer | Discord-only |
| 40 | DX | Mode DX POLISH | Mechanical | override | autoplan rule | expansion |
| 41 | DX | Retire commands; register exits | Mechanical | P1 | both voices; second-bot risk | upsert only |
| 42 | DX | Error references and code coverage test | Mechanical | P1 | agent-ready contract | generic text |
| 43 | DX | Typed render errors | Mechanical | P1 | replaces class-only logging | class only |
| 44 | DX | Weekly post recovery, preview, re-queue, expiry | Mechanical | P1 | minors; silent loss | retries only |
| 45 | DX | `/season new|edit`, unlock add/edit/remove | Taste | P5 | create vs update confusion | `/season set` |
| 46 | DX | Per-rule season codes, Bangkok whole-day dates | Mechanical | P1 | "try again" never works | bad_input |
| 47 | DX | `/admin correct` in wave 1 | Taste | P1 | wave 1 must be operable alone | `/season correct` |
| 48 | DX | Modal single call, draft retry, join | Mechanical | P1 | refusal lost typed text | none |
| 49 | DX | Milestone 6 by user select, expiry, decline | Mechanical | P1 | confirmation needs a person | plot number |
| 50 | DX | `checkins` switch, self-declared setting, decision settings | Mechanical | P1 | escape hatches | none |
| 51 | DX | Migration runbook and freeze rule | Mechanical | P1 | prod-first apply | in-place forever |
| 52 | DX | CI DB job required | Mechanical | P1 | only Postgres gate before prod | local only |
| 53 | DX | Preflight, sandbox hash/reset/DB-only, pilot seed | Mechanical | P5 | observed failure | none |
| 54 | DX | Deploy hardening | Mechanical | P1 | broken image could become rollback | current |
| 55 | DX | Docs per wave, function contracts | Mechanical | P1 | docs contradict plan | none |
| 56 | DX | Typed QuestApi wrapper | Mechanical | P3 | outside POLISH | build now |
| 57 | DX | Populated upgrade test if wave 2 later | Mechanical | P1 | conditional on UC1 | always |
| 58 | Eng | Structure: wave 2 in a later migration (smaller arrangement) | Taste | P5 | both CEO voices + Codex eng; keeps features | one migration |
| 59 | Eng | One open milestone quest per project via instance column + unique index | Mechanical | P1 | verified race in tree | per-member lookup |
| 60 | Eng | Shared-quest rights matrix; ownership passes on leave | Mechanical | P1 | Codex 5 | archive on owner leave |
| 61 | Eng | Explicit project ID and operation keys | Mechanical | P1 | picker writes wrong project | current_project |
| 62 | Eng | Provenance: self vs mentor; bars count mentor-seen only | Mechanical | P1 | both voices | self counts for bars |
| 63 | Eng | One season counting helper with chain rule | Mechanical | P5 | two counting paths | approval time |
| 64 | Eng | Provisional slots snapshot; never trigger unlocks | Mechanical | P1 | gameable | provisional unlocks |
| 65 | Eng | Grant reconciliation sweep; reached_at; no back-pay | Mechanical | P1 | grants missed without approval | approval hook only |
| 66 | Eng | Corrections as state; reversal may go negative | Mechanical | P1 | invariant broken | silent rewrite |
| 67 | Eng | Rest per member (resting_since) | Mechanical | P1 | owner rest pauses team | derived from quests |
| 68 | Eng | Milestone 6 attestation moves to wave 2; private attestation | Taste | P5 | Claude scope note; Codex 1 | wave 1 via peer recognition |
| 69 | Eng | One privacy helper; slot-only for non-consented; null actor refused | Mechanical | P1 | minors; map leaked stages | founder declares stage public |
| 70 | Eng | CI on Postgres 15; timestamp check vs main | Mechanical | P1 | partial push risk | PG latest |
| 71 | Eng | Weekly post catch-up, season keys, expires_at, lease token | Mechanical | P1 | missed weeks, duplicates | hour window |
| 72 | Eng | Render budget, fixed layout, pages beyond 120, cached base | Mechanical | P1 | layout reshuffles; no budget | grow with count |
| 73 | Eng | Deploy rollback in 4 min; pngjs dev-only | Mechanical | P1 | no rollback; renderer uses zlib | stage pngjs |
| 74 | Eng | quest/progress stubs one release; confirm projectseed guild | Mechanical | P1 | dead-command window; PUT wipes guild | retire at once |
| 75 | Eng | schema_version startup check | Mechanical | P1 | forward references | none |
| 76 | Eng | CI always runs; harness table grants; catalog hash | Mechanical | P1 | required check never reports | path filter |
| 77 | Eng | Free-text erasure, reason cap | Mechanical | P1 | data rights | none |
| 78 | Eng | Unlock coins keep ledger kind award; admin grants kind recognition | Mechanical | P4 | existing caps | all recognition |

## Gate decision (founder, 2026-11-11)

- **UC1, how Season 1 ships:** ship the island core first (migrations up to
  `20261111090700`). Run Season 1 by hand at the four Semester 2 meetups, and
  apply `20261111090800_shift_quests_seasons.sql` only after week 4 shows the
  island is used. The season code stays built and tested on this branch.
- **UC2, one home:** the Discord island is where students check in; the
  alumni board stays mentor-facing.
- **Taste decisions:** approved as built. Deferred for later: d6 (milestones
  1 and 2 self-declared), d7 (milestone 6 needs the helped student to
  confirm), d10 (Thai evidence summary in `/data`), d13 (`/admin correct`).

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` (via /autoplan) | Scope & strategy | 1 (not logged until approval) | ISSUES OPEN | 45 proposals, 43 accepted, 2 deferred |
| Outside Review | codex (gpt-6-astra) via /autoplan, CEO + DX + Eng | Independent 2nd opinion | 3 | completed | 28 findings; 26 resolved in plan; 2 to the gate (UC1, UC2) |
| Eng Review | `/plan-eng-review` (via /autoplan) | Architecture & tests (required) | 1 (not logged until approval) | ISSUES OPEN | 40 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | SKIPPED (no UI scope) | none |
| DX Review | `/plan-devex-review` (via /autoplan) | Developer experience gaps | 1 (not logged until approval) | ISSUES OPEN | score: 5/10 → 7/10, TTHW: 30-45 min → under 2 min preview, under 5 min warm sandbox |

- **OUTSIDE COVERAGE:** codex, CEO phase, completed, 8 findings. codex, DX phase, completed, 9 findings. codex, Eng phase, completed, 11 findings. Design phase skipped (no UI scope), no outside review.
- **CROSS-MODEL:** Claude subagents and Codex (gpt-6-astra) agreed on all 18 consensus dimensions across CEO, DX and Eng; both recommended gating wave 2 and deciding the board-versus-island home first.
- **VERDICT:** No review CLEAR yet: all three are ISSUES OPEN pending the gate; eng review required.

**UNRESOLVED DECISIONS:**
- UC1: run Season 1 by hand first and build wave 2 only after the week-4 bar, or build Season 1 software now
- UC2: decide island versus alumni board before more wave-1 code, or keep building and decide before the pilot
