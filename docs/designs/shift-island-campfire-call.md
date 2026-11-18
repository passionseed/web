# SHIFT High Island: the campfire call and the evening guest (เรียกรวมกองไฟ)

Status: built on `feat/shift-campfire-call`, 2026-11-18, revised the same day
with the founder's answers (staff at the fire are the guest: decision 8). Its migration
(`20261118150000_shift_quest_campfire_call.sql`, schema 21) is **not
applied** and waits for the founder's go, after the bot deploy. Thai copy is
DRAFT and needs the three-model review in the root `AGENTS.md`.

## The moment

**Who:** every SHIFT High student in the SHIFT Discord. **When:** every
evening, except while a SHIFT cohort round is in session. **What they see:**

- **18:50 Bangkok**: one call in #island-news, pinging the student role once:
  the fire lights at 19:00, bring your own work and sit next to each other, no
  mic needed. A Discord countdown to the first round, how many sit at the fire
  now (floored), a teaser that something is coming across the sea, the rule
  (every team with someone at the fire during the 19:25 to 19:30 rest gets one
  roll), and a one-tap button into the campfire voice channel.
- **19:00**: the call edits itself to "the fire is lit". In the voice
  channel's chat the 19:00 focus round says a guest will come at the break.
- **19:25 to 19:30, the first rest**: during a season, an evening guest
  arrives: a trader's boat, a gull, fireflies or a sea turtle, in a fixed
  rotation by season day. Anyone who sits in the campfire voice room at any
  moment of that rest counts (the bot reads the room on every 30-second
  check), and the database keeps only which teams were there. **If the
  founder or a mentor sits at the fire at any moment of that rest, they are
  the guest instead**: "คืนนี้ <name> มาเป็นแขกที่กองไฟ" (up to two names), and
  the drop gives 2 looks only such a night gives.
- **19:30, the first check after the rest**: the night is settled once. Every
  team seen gets **one roll**, however many teammates came. A winning roll
  leaves the team one of that guest's two looks it does not have yet, on its
  tree. The round messages and the call say "the guest left something for N
  teams" (always the number when at least one team won, a friendly line for
  none), never which. A 🎁 button answers each student privately about their
  own team.
- **21:00**: the guest leaves; the call edits to embers ("the fire is lit
  every evening at 19:00", true after midnight too). Yesterday's call is
  deleted when today's is posted, so #island-news holds one call.

## Decisions (founder, 2026-11-18; they override the judge's plan)

| # | Question | Answer |
|---|---|---|
| 1 | Ping | The call pings the student role(s) (`settings.student_role_ids`) once, when it is first sent. Edits never ping. Staff switch: `/admin feature campfire_call_ping`, **on by default**. |
| 2 | Where and when | #island-news (the news channel slot), 18:50 Bangkok. Yesterday's call is deleted when today's is recorded. |
| 3 | Which days | Every day, all year, weekends included; it does not stop after Demo Day. The guest pauses when no season is active; the call itself runs. **Off by itself in SHIFT cohort weeks** (see "Cohort weeks"). Staff off switch: `/admin feature campfire_call`, **on by default**. |
| 4 | The prize | **A random drop for being there**, not "aim and close a round". The founder approved it as the one exception to the island's no-random-prizes rule (`components/shift/island/AGENTS.md`, amended 2026-11-18). |
| 4a | Who counts | Anyone who sits at the fire at any moment of the guest's rest (19:25 to 19:30). On every check in that window the bot passes the Discord ids in the campfire voice room (gateway voice cache, bots left out) to `shift_quest_campfire_seen`. Students are linked through the member table; unknown, not started and erased ids are ignored; staff and mentors never win. |
| 4b | The roll | Settled once, at the bot's first check at or after 19:30 (`shift_quest_campfire_drop`): one roll per team seen, restart-safe (a lock per night, `settled_at`, one row per team and night, one gift per team and source). A win gives one of tonight's guest's looks the team does not own (2 per guest: 8 colour-only looks for the rotation, 2 more for staff nights). A team that owns both is recorded with no look and gets a friendly no-prize line. |
| 4c | The chance | 1 in 2 per team, in one constant: `shift_quest__guest_drop_chance()`. |
| 4d | What is kept | Per team and night only: `shift_quest_guest_drops (day, project_id, guest, look or null)`: which teams were at the fire, and each roll. Never a member id, a Discord id, a time or a count of people. Per night: `shift_quest_guest_nights (day, guest, watched, settled_at, staff_names)`; `staff_names` holds up to two staff display names on a staff night (decision 8), never a student's, cleared the next day and on that staff member's erasure. Rows of earlier days are deleted the next day: on the bot's reads, on every presence check and drop call, and by pg_cron's 5-minute voice purge (no bot needed). For a team of one, the team's row is that student's until then, and the copy says so. A win is a gift row on the team (`source drop:<day>`, `member_id` null) that stays with its date like every gift; an erasure that leaves the team with no member deletes the team's rows and drop gifts. `/data` exports the team's tree gifts (the guest's included) and its guest rows. Live presence stays as it was: who is in the room now, deleted on leave. |
| 4e | The reveal | **Always the number** once at least one team won: "แขกทิ้งของไว้ให้ N ทีม" (`shift_quest__guest_reveal`), a friendly line for 0. Never which team. 🎁 answers privately (ephemeral, never a DM) about the presser's own team; a win also waits on the team's tree on the web and in Discord (the normal gift flow). Who sits at the fire is public, so with one team there the number says that team won; the founder chose to show it anyway. |
| 4f | Limits | No coins, no stage change, no quest pass, nothing lost for skipping a night, no streaks, no "first to arrive", no reward for bringing more people. |
| 5 | Deploy order | Schema 21, migration 20261118150000 (after #329's 20261118140000, schema 20, applied 2026-11-18). The bot reads the schema version on every call tick, so it can deploy before the migration with no restart. Merge, deploy the bot, then the migration on the founder's go. |
| 6 | Copy | DRAFT, no em or en dashes, never น้องๆ or เด็กๆ, lively and short for phones, never "พรุ่งนี้" (a promise a later night may break). |
| 7 | The opt-out line | Names the server setting as Thai-language Discord shows it, English in parentheses: ตั้งค่าการแจ้งเตือน (Notification Settings), ระงับทุกตำแหน่ง @mentions (Suppress All Role @mentions); source in `callCopy.ts`. No claim about any channel setting. `/settings` shows it only while the call pings (`shift_quest_call_pings`, schema 21). |
| 8 | Staff at the fire are the guest (founder, later on 2026-11-18) | If the founder or a mentor (a non-erased admin or reviewer member; the staff the drop already never lets win) is among the ids of any check of the 19:25 to 19:30 rest, that night's guest is them (`mentor`) instead of the rotation's, from that check on and never back (`shift_quest__guest_seen`). The call's title and the round messages name them, `คืนนี้ <display name> มาเป็นแขกที่กองไฟ`, two at most (`<A> และ <B>`, the first seen first); staff are adults, so their display names may be shown. A staff member with no display name is `พี่จากทีม SHIFT`. The drop that night gives 2 looks only staff nights give (`leaf:ember`, `bloom:starlit`), with the same rules: one roll per team seen during the rest, settled at 19:30, 1 in 2, a look the team does not own, staff never win. The night's row (`shift_quest_guest_nights.guest`, `staff_names`) keeps the guest and the names, so every edit and a restarted bot show the same guest; the names are cleared the next day and on that staff member's erasure. No season, no guest, staff or not. Nights with no staff at the fire keep the rotation. |

## Cohort weeks

While a SHIFT cohort round is in session (`roundsInSession()` in
`lib/shift/voiceWindow.ts`, the calendar shift-voice uses), shift-voice
records voice time in every voice channel for that round's students, the
campfire included. On those days the bot sends no call, reads nobody for the
guest and makes no drop, the rounds show no guest, and the latest call is
edited once into the paused note (with no fine print, since "ไม่มีใครนับเวลา
ของคุณ" would not hold that week). The call comes back by itself the day after
the round ends. No staff switch is needed.

## Why it is shaped like this

- **The whole rest counts, one roll per team.** Anyone at the fire at any
  check from 19:25 to 19:30 counts, so being first is never rewarded and
  arriving a few minutes late still counts. Nobody's minutes are counted:
  only which teams were there, with no time, so `ไม่มีใครนับเวลาของคุณ` stays
  true. A team of one and a team of four roll the same once, so there is no
  pressure to bring people.
- **The database decides.** The clock (`shift_quest__call_at`), the call's
  days (`shift_quest__call_on`), the rotation (`shift_quest__guest_of`), the
  window (19:25 to 19:30), the roll, the one row per team and night, the
  settling, the purge and the private answer are all SQL. The bot renders,
  passes who is in the room, and asks. The cohort pause is the bot's, from
  the same calendar shift-voice uses.
- **Nothing that names a student.** The ids the bot passes are matched and
  dropped; the team row has no member column and no time. The only names
  kept are staff display names on a staff night, until the next day. Logs
  carry counts only.
- **A staff guest is luck, not approval.** The copy says every team at the
  fire rolls the same, as every night; the staff choose nothing, and a look
  never grows a tree. Their lines never promise they stay ("came tonight",
  never "is still here"; no "until 21:00").
- **Restart-safe and never twice.** The call has its own ledger
  (`shift_quest_call_posts`): claim, send, compare-and-set mark. A stale claim
  is recovered by finding the bot's own call (its issue line) in the channel;
  if the bot cannot read the channel it sends nothing that night, so a call
  never pings twice. The team rows survive a restart, and the settling takes
  a lock per night and records `settled_at`, so a restart or a second process
  never rolls again.
- **Never an invitation to a fire that cannot run.** Before sending, the bot
  checks that students can see and join the campfire voice channel and that
  it can post in its chat; otherwise it logs once and sends nothing.
- **Guest looks stay the guests'.** Round and quest gifts never offer them
  (`shift_quest__gift_create`'s `i.guest IS NULL`).

## Anti-goals

- No count of nights attended, no "you missed", no last chance: guests rotate
  and come back every 4 nights during a season.
- No public line about which team won.
- No DM, no user mention, no student's name in the call (only the staff
  who are the night's guest, by display name).
- No coins, no stage, nothing with value.

## The copy (DRAFT)

All in `bot/src/quests/callCopy.ts` (the call, the guests, the private
answers) and the web's campfire and guide lines. Before shipping: Antigravity
drafts, Cursor proofreads, Codex checks the logic.

## Known limits

- The bot checks the room every 30 seconds, so someone who sits for less than
  that during the rest may be missed. The copy says "sit at the fire during
  the rest", never "a moment is enough".
- If the bot is offline for the whole rest, nobody is counted that night: the
  first check after 19:30 settles it with no team, and 🎁 says the guest only
  stopped by (`quiet`), never "your team was not there". If it is offline
  from 19:30 until midnight, that night is never settled and its team rows
  go the next day with no roll. If it is offline from 18:50 to 19:30 there is
  no call that night, and no late one.
- Switched off, the latest call is edited once into a paused note; a night
  already settled still answers 🎁.
- The opt-out line names a setting that stops every role ping in the server,
  not only this one, and the Thai label comes from the Discord app's string
  files: check it on a Thai-language phone. A self-assigned call role (remove
  it to opt out) would be finer; that needs a Discord role and a founder
  decision.
- The /settings line does not know about cohort weeks: it shows while the
  call's switches are on, even on a day the bot pauses the call.
- Staff who sit down at 19:25 are seen at the call loop's first check of the
  rest (within 30 seconds); until then the round message may show the
  rotation's guest, then it is edited to name them. Staff who sit down later
  in the rest replace the rotation's guest the same way, mid-rest.
- The name shown is the staff member's display name as the bot last saw it
  (updated on each of their interactions with the bot), not a live read from
  Discord.
