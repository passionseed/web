# SHIFT High Island: the campfire call and the evening guest (เรียกรวมกองไฟ)

Status: built on `feat/shift-campfire-call`, 2026-11-18. Its migration
(`20261118150000_shift_quest_campfire_call.sql`, schema 21) is **not
applied** and waits for the founder's go, after the bot deploy. Thai copy is
DRAFT and needs the three-model review in the root `AGENTS.md`.

## The moment

**Who:** every SHIFT High student in the SHIFT Discord. **When:** every
evening. **What they see:**

- **18:50 Bangkok**: one call in #island-news, pinging the student role once:
  the fire lights at 19:00, bring your own work and sit next to each other, no
  mic needed. A Discord countdown to the first round, how many sit at the fire
  now (floored), a teaser that something is coming across the sea, and a
  one-tap button into the campfire voice channel.
- **19:00**: the call edits itself to "the fire is lit". In the voice
  channel's chat the 19:00 focus round says a guest will come at the break.
- **19:25, the first rest**: during a season, an evening guest arrives: a
  trader's boat, a gull, fireflies or a sea turtle, in a fixed rotation by
  season day. The bot reads who sits in the campfire voice room right then,
  and every team with a student there gets **one roll**, however many
  teammates came. A winning roll leaves the team one of that guest's two
  looks it does not have yet, on its tree. The round message and the call say
  "the guest left something for N teams" when 3 or more teams rolled and
  some but not all won; otherwise no number (it would tell who won). Never
  which. A 🎁 button answers each student privately about their own team.
- **21:00**: the guest leaves; the call edits to embers. Yesterday's call is
  deleted when today's is posted, so #island-news holds one call.

## Decisions (founder, 2026-11-18; they override the judge's plan)

| # | Question | Answer |
|---|---|---|
| 1 | Ping | The call pings the student role(s) (`settings.student_role_ids`) once, when it is first sent. Edits never ping. Staff switch: `/admin feature campfire_call_ping`, **on by default**. |
| 2 | Where and when | #island-news (the news channel slot), 18:50 Bangkok. Yesterday's call is deleted when today's is recorded. |
| 3 | Which days | Every day, all year, weekends included; it does not stop after Demo Day. The guest pauses when no season is active; the call itself runs. Off switch for SHIFT cohort weeks: `/admin feature campfire_call`, **on by default**. |
| 4 | The prize | **A random drop for being there**, not "aim and close a round". At the guest's arrival (19:25, the first rest) the bot passes the Discord ids in the campfire voice room (gateway voice cache, bots left out) to one bot-only function. Students are linked through the member table; unknown, not started and erased ids are ignored; staff and mentors never win. Each team with at least one student present gets exactly one roll that night, restart-safe (one row per team and night). A win gives one of tonight's guest's looks the team does not own (2 per guest, 8 colour-only looks). A team that owns both is recorded with no look and gets a friendly no-prize line. |
| 4a | The chance | 1 in 2 per team (generous for a small cohort: about half the teams at the fire get a look each night), in one constant: `shift_quest__guest_drop_chance()`. |
| 4b | What is kept | Per team and night only: `shift_quest_guest_drops (day, project_id, guest, look or null)`. Never a member id, a Discord id, a time or a count of people. Rows of earlier days are deleted the next day: on the bot's reads, on every drop call, and by pg_cron's 5-minute voice purge (no bot needed). For a team of one, the team's row is that student's until then, and the copy says so. A win is a gift row on the team (`source drop:<day>`, `member_id` null) that stays with its date like every gift; an erasure that leaves the team with no member deletes the team's rolls and drop gifts. Live presence stays as it was: who is in the room now, deleted on leave. |
| 4c | The reveal | The round message at 19:25 in the voice chat and the edited call say how many teams got a look ("แขกทิ้งของไว้ให้ N ทีม"), never which teams or people. Who sits at the fire is public, so the number shows only when 3 or more teams rolled and some but not all won (`shift_quest__guest_reveal`); otherwise the line has no number ("แขกแวะมาที่กองไฟแล้ว ทีมคุณได้อะไรไหม"). 🎁 answers privately (ephemeral, never a DM) about the presser's own team; a win also waits on the team's tree on the web and in Discord (the normal gift flow). A picked look shows on a shown team's tree, so the copy says the bot never announces which team, not that nobody can see it. |
| 4d | Limits | No coins, no stage change, no quest pass, nothing lost for skipping a night, no streaks, no "first to arrive", no reward for bringing more people. |
| 5 | Deploy order | Schema 21, migration 20261118150000 (after #329's 20261118140000, schema 20). The bot reads the schema version on every call tick, so it can deploy before the migration with no restart. Merge, deploy the bot, then the migration on the founder's go. |
| 6 | Copy | DRAFT, no em or en dashes, never น้องๆ or เด็กๆ, lively and short for phones. |

### Rules this changes, for the founder to confirm in writing

- The island rule "**No pressure mechanics. No ... random prizes**"
  (`components/shift/island/AGENTS.md`) does not allow decision 4 as written.
  This branch does not edit that file (agents may not change their own
  instructions); the founder amends it, or this stays unmerged. Suggested
  wording: "random prizes, except the campfire guest's drop (one roll per
  team per night, cosmetic looks only, 1 in 2, founder decision 2026-11-18)".
- The island's first role ping: every earlier broadcast (the news card, the
  live post, the round messages) pings nobody. Recorded in
  [shift-island-core-loop.md](shift-island-core-loop.md).
- A chance-based prize for minors: the looks have no cash value and cannot be
  traded, which keeps it a game cosmetic rather than a lucky draw (ชิงโชค).
  Worth a line from whoever checks the program's legal side before it grows
  to anything with value.

## Why it is shaped like this

- **One moment, one roll per team.** "Being there when the guest arrives" is
  a single check at 19:25 (the bot's first check in that rest), not time at
  the fire: nobody's minutes are counted, so `ไม่มีใครนับเวลาของคุณ` stays
  true. The check decides the night even when nobody's team is there, so
  sitting down first later in the rest wins nothing (decision 4d). A team of
  one and a team of four roll the same once, so there is no pressure to bring
  people.
- **The database decides.** The clock (`shift_quest__call_at`), the call's
  days (`shift_quest__call_on`), the rotation (`shift_quest__guest_of`), the
  window (19:25 to 19:30), the roll, the one row per team and night, the
  purge and the private answer are all SQL. The bot renders and asks.
- **Nothing that names anyone.** The ids the bot passes are matched and
  dropped; the drop row has no member column. Logs carry counts only.
- **Restart-safe and never twice.** The call has its own ledger
  (`shift_quest_call_posts`): claim, send, compare-and-set mark. A stale claim
  is recovered by finding the bot's own call (its issue line) in the channel;
  if the bot cannot read the channel it sends nothing that night, so a call
  never pings twice. The drop takes a lock per night and records the night,
  so a restart or a second process never rolls again.
- **Never an invitation to a fire that cannot run.** Before sending, the bot
  checks that students can see and join the campfire voice channel and that
  it can post in its chat; otherwise it logs once and sends nothing.
- **Guest looks stay the guests'.** Round and quest gifts never offer them
  (`shift_quest__gift_create`'s `i.guest IS NULL`).

## Anti-goals

- No count of nights attended, no "you missed", no last chance: guests rotate
  and come back every 4 nights during a season.
- No public line about which team won.
- No DM, no user mention, no names in the call.
- No coins, no stage, nothing with value.

## The copy (DRAFT)

All in `bot/src/quests/callCopy.ts` (the call, the guests, the private
answers) and the web's campfire and guide lines. Before shipping: Antigravity
drafts, Cursor proofreads, Codex checks the logic.

## Known limits

- A new SHIFT cohort round runs live sessions 19:00 to 21:00 and shift-voice
  records voice time in every voice channel for that round's students, the
  campfire included: switch `campfire_call` off for those weeks.
- `tree_gifts` are not yet in `/data` export; a follow-up adds them.
- If the bot is offline from 18:50 to 19:30 there is no call that night, and
  no late one. If it is offline during 19:25 to 19:30 there is no drop that
  night: from 19:30 the call and the rounds say the guest only stopped by,
  and 🎁 answers the same for everyone.
- Switched off, the latest call is edited once into a paused note; tonight's
  drop, if made, still answers 🎁.
- The call's mute line points at "Suppress All Role @mentions", which stops
  every role ping in the server, not only this one. A self-assigned call
  role (remove it to opt out) would be finer; that needs a Discord role and a
  founder decision.
