# SHIFT High Island: the core loop (tree + quest)

Status: design, 2026-11-16. Nothing here is built. Thai copy is DRAFT and
needs the three-model review in `AGENTS.md` before it ships.

## Why

The founder's core experience is **a quest done in the real world grows the
team's tree**. On production two days into Season 1 (14 to 28 Nov, demo day
28 Nov): 8 students, 8 solo projects, 1 main quest started, 0 submissions,
0 reviews, 3 check-in taps on one day. The loop has never closed once.

An audit of the code found the quest half careful and the reward half
missing:

1. **Approval is silent.** Nothing on the web notices that the stage rose.
   The Discord `review_approved` notice never mentions the tree
   (`bot/src/quests/copy.ts:839-847`). Web-started students get no DM
   (`app/shift/island/actions.ts:151` passes `false`), and the web inbox
   shows only a count.
2. **Review is slow for mentors.** The staff post has no button; approving
   is about six Discord steps. The web review page cannot decide.
3. **The first step is buried.** On an untouched quest the sticky primary is
   "send work"; "start" is a quiet button at the bottom of about twelve
   blocks. Starting ends on a toast.
4. **Waiting is a dead end.** No promised turnaround, the gold card shows
   "waiting" instead of the next quest, and nothing brings a student back.

This doc designs the fixes in four parts, then a build order and the
decisions the founder must make.

## Principles

- The tree is the reward. Growth is something you *find when you come back*
  (calm, earned, named), never confetti (`shift-high-island-web.md:473-475`).
- Every screen has one next action, and it leads to a quest.
- A mentor's words never travel in a DM (safeguarding: bot DMs only notify;
  the record lives on the web or in `/inbox`,
  `docs/project/PROJECTSEED-SAFEGUARDING.md:273-283`).
- Ship Wave A with no migration. Grants come in Wave B, each one additive
  and applied before the web code that needs it.

---

## Part 1. The growth moment

### Detection (web, no migration)

- localStorage `shift-island-tree-v1:{projectId}` = `{ done: number[] }`, the
  approved milestone set this browser last showed.
- **Rise:** any milestone in `island.project.milestones_done` not in the
  stored set plays the moment. The marker is written when the moment ends or
  is closed, so leaving early replays it next time.
- **Jumps:** step through each stage; for more than 3, start from
  `new - 3`. List up to 3 quest titles.
- **First visit on a browser (no key):** store silently, except milestones
  whose own `latest_review` is `approved` and under 48 hours old; those play
  (covers a Discord-first student opening the web after an approval).
- **Never backwards:** a drop or a missing milestone rebases quietly.
- **Teammates and devices:** each browser sees it once. Accepted.
- **Reset / archive:** a new project id starts fresh. `clearIslandKeys`
  (`AdminReset.tsx:14`) clears these keys by prefix.
- **Storage throws (private mode):** baseline in memory, skip the 48 h rule.
- **When it runs:** an effect on `project.id` + the sorted done list, which
  also fires after `router.refresh()` from `useIslandRefresh` (focus,
  visibility, reconnect). No polling.

Decorations follow milestones, not stage: 3 visitor, 5 key flag, 6 path,
7 lantern (`20261111090700_shift_quests_island.sql:292-295`). Compare the old
and new sets.

### The moment

New `tree/GrowthSheet.tsx` in an `IslandSheet`, drawing the team's styled
close-up (`ownCloseup`, `tree/model.ts:32`). Opens only when nothing else is
open, after the voyage and story, 600 ms after the island draws.

| ms | What happens |
|---|---|
| 0 | Sheet opens (about 450 ms) |
| 450 | The **old** stage, held 700 ms |
| 1150 | Per step: new / old / new frames at 140 ms each, then the existing `.puff` at the ground; 280 ms between steps |
| end | Hold 400 ms; copy, mentor quote and decoration icon fade in (240 ms, opacity + 2 px rise, no bounce) |

A tap skips to the end; buttons work from the start. One step is about
2.2 s. Timing comes from a pure `growthTimeline(final, from)`;
`growFrames(input, from = 0)` gains a start stage. `TreeSheet.tsx:97` stops
passing `grow`, so the close-up no longer replays on every open
(`TreeCanvas.tsx:66-85`).

**Copy (DRAFT):**

- Title: `ต้นไม้ของทีมโตขึ้น` / `ต้นไม้ของทีมโตขึ้น {n} ขั้น`
- Own work: `{title} ผ่านแล้ว ต้นไม้ของทีมเลยโตเป็น{stage}`
- Teammate's work: `{title} ของทีมผ่านแล้ว ตอนนี้เป็น{stage}`
- Stage 7: `ครบ 7 ขั้น ต้นไม้ของทีมผลิดอกแล้ว`
- Quote: `พี่เลี้ยงบอกว่า` + feedback, from
  `board.main[m].mine.latest_review` where `outcome === "approved"`
  (`types.ts:165-169`). `mine` is the caller's own work only, so teammates
  see no quote. No reviewer name.
- Decorations: 3 `มีคนแวะมาดูต้นไม้ที่แปลงของทีม`, 5 `ธงกุญแจปักที่แปลงของทีมแล้ว`,
  6 `มีทางเดินจากแปลงไปหาเพื่อนบ้านแล้ว`, 7 `โคมไฟที่แปลงของทีมจุดแล้ว`

**Ending:** primary `ไปเควสต์ต่อไป` opens the gold-card quest (Part 4);
quiet `ดูต้นไม้ใกล้ๆ` opens the tree sheet. On close the camera pans back to
the plot (a new `focusKey` on `IslandViewport`, re-running the centring at
`:349-360`) and the puff plays there.

**Reduced motion:** no frames, puff, fade or smooth scroll. The new stage is
drawn at once with `จาก{old} เป็น{new}` and a static icon.

### Discord approval notice

`bot/src/quests/copy.ts` `renderInbox("review_approved")`, when
`p.milestone` and `p.stage` are set (already in params, migration
`20261111090200`):

```
🌳 **{title}** ผ่านแล้ว ต้นไม้ของทีมโตอีกขั้น ตอนนี้เป็น{stageName} ({stage}/7){ · ได้ **N** Passioncoin}
-# {decoration line}
> ความเห็น: {feedback}
-# ดูต้นไม้ที่โตแล้วบนเว็บเกาะ หรือแชร์ด้วย /celebrate ก็ได้ ไม่บังคับ
```

Side quests keep `✅` and today's text. `STAGE_NAMES` moves to
`lib/shift-island/tree-copy.ts` (both sides import it; `island/copy.ts`
already imports `../copy`, so a direct import would be circular). Also fix
`bot/src/quests/island/copy.ts:172`, which still says community quests grow
the tree.

---

## Part 2. Results reach the student

### Notification policy

- Do **not** default DMs on (`schema.sql:66` and the feature doc promise
  joining never opts anyone in). Change both start calls (web
  `actions.ts:151`, bot `handlers/student.ts:529`) from `false` to `null`, so
  a later start never wipes an opt-in (`COALESCE`, `core_functions.sql:371-377`).
- Ask when it is worth something: on the sent screen. Wave A shows a line
  (`เปิดการแจ้งเตือนได้ที่ /settings ใน Discord`); Wave B makes it a toggle.
- **May be DM'd:** the existing content-free nudge, opt-in reminders.
  **Never:** feedback, results with titles, names, pictures, any adult-written
  text.
- Nudge copy: `มีอัปเดตใหม่ ดูได้บนเว็บเกาะ หรือ /inbox ในเซิร์ฟเวอร์`.
- Reminders (if the founder turns them on): only the days and hour the student
  picked, at most one a day (existing dedupe). Copy points at the quest:
  `เควสต์ถัดไปรออยู่บนเกาะ`. Never missed days, streaks, "ยังไม่ได้" or other
  students.
- Risk: students are taught to turn off server DMs, so DMs are best effort.
  The web is the channel that must work.

### Web results (Wave A, no migration)

The board already carries `mine.latest_review {outcome, feedback, created_at}`
per quest. The inbox sheet (`HudSheets.tsx:185-203`) lists reviews newer than
a localStorage seen mark:

- `✅ {title} ผ่านแล้ว` · `💬 {title} พี่เลี้ยงขอข้อมูลเพิ่ม` · `↩️ {title} ยังไม่ผ่าน`
- Feedback as a quote; a tap opens the quest (an approval that raised the
  stage opens the growth moment instead).
- The envelope shows a dot for new results, not only for `unread > 0`.

### Full web inbox (Wave B, grant migration)

Grant `shift_quest_inbox_list(text, boolean)` and
`shift_quest_update_prefs(...)` to `shift_quest_web`. A `readInbox()` action
maps notices to a whitelisted DTO `{id, kind, lines, quote, target}` (raw
params carry internal ids such as `actor_id`; never send them to the
browser). Headline wording moves into a pure `bot/src/quests/notices.ts`
(no `discord.js`) that both the bot and the web use; each keeps its own hints.
A web DM toggle lands in the menu and on the sent screen.

### Waiting state

- Sent screen (`canvas/copy.ts:65-66`): `พี่เลี้ยงจะตอบภายใน {N} ผลจะขึ้นที่ซองจดหมายบนเกาะนี้`
  (N is a founder decision; the island spec suggested 48 hours).
- Then one action: `ระหว่างรอ เริ่มที่: {next quest}` (Part 4, row 5).
- Tile and quest page: `ส่งเมื่อ {วัน เวลา} · พี่เลี้ยงตอบภายใน {N}`. Past N:
  `เลยเวลาที่บอกไว้แล้ว ถามทีมได้ที่ปุ่ม ติด` (group help, not a private
  channel).

---

## Part 3. One-tap review for mentors

### Discord (Wave A, no migration, bot redeploy)

- The `review_needed` post already has `submission_id` in its params
  (`core_functions.sql:1185-1189, 1337-1341`). `outbox.ts` adds one row:
  `📝 ดูงาน` (`sq|rv_open|<uuid>`, persistent, routed by `index.ts:89-99`) and
  the existing `reviewLinkButton` (`weblink.ts:124`) to the web page.
- New `rv_open` handler: `requireStaff(REVIEWERS)`, `shift_quest_review_get`
  (re-checks role and conflict of interest, writes audit), `reviewExtras`, then
  a **private** card (`show` without `replace`; `replace` would edit the public
  staff post). Approve becomes ดูงาน → อนุมัติ → ส่ง.
- `reviewCard` shows decide buttons only when the database would accept a
  decision: `is_latest && ((instance_state='submitted' && status='pending')
  || (instance_state='appealed' && status='declined'))`; otherwise
  `ตัดสินแล้ว: อนุมัติ` or `นักเรียนถอนงานนี้แล้ว`. Fixes the same gap on `rv_sub`.
- Two reviewers at once: the row lock in `review_decide` lets one decision
  land; the other gets `already` or `stale_revision`. Enough at this scale.
- Privacy: the post stays title + revision. No milestone or slot (slot +
  title in a shared channel points to one team).
- Queue age: `รอ 20 ชม.` / `รอ 2 วัน` in the select description and
  `เก่าสุดรอ X ชม.` in the body, from `review_queue.submissions[].created_at`.

### Web decisions (Wave B, grant migration)

Reverses the documented choice "decisions stay in Discord"
(`review/[submissionId]/page.tsx:18`); founder decision.

- Grant `shift_quest_review_decide(text, uuid, text, text, boolean)` to
  `shift_quest_web` (a guarded, idempotent `DO` block). The web actor is the
  same Discord id the bot sends, so role, conflict, latest-revision, appeal
  and feedback-required checks all run unchanged. The submission id is the
  version; a stale page gets `stale_revision`.
- `app/shift/island/review-actions.ts` `decideReview`, copying
  `hidePeerCheck` (`peer-actions.ts:96-112`); zod `decideReviewSchema`
  (feedback required unless approving, max 2000).
- `ReviewDecide.tsx` shows only for `isLatest && status === 'pending'`.
  Appeals and repeat approvals stay in Discord for v1 (`review_view` lacks
  `instance_state`, `repeatable`, `conflicted`).
- Tests move `review_decide` from the denied list (`web_board.ts:375`) to the
  allowlist, and mirror the grant in `run-local.sh` `web_allow`.
- Risk: a leaked web credential could decide reviews for a staff actor; the
  same trust model `peer_hide` and `admin_island` already accept.

### Overdue nudge (Wave B, optional, new function)

The outbox cannot do this cheaply (a delayed post would not re-check that the
work is still pending). New `shift_quest_enqueue_review_nudges(p_hours int)`,
modelled on `enqueue_reminders` (`admin_functions.sql:862-890`), called from
the outbox's once-a-minute block, dedupe `review_wait:<submission>`, title
only, same buttons, granted to `shift_quest_bot`; the bot ignores 42883 on an
older database.

---

## Part 4. A clear first action

PR #304 opened รายละเอียดทั้งหมด on purpose (read the goal, criteria and
question first). Keep it. Fix the two things it pushed down: the start button
moves into the sticky bar, and a new **state slot** under `QuestHeader` holds
the state notice and the mentor's feedback above the details.

### Quest page states

| State | Sticky bar (primary / secondary) | State slot |
|---|---|---|
| Untouched | **เริ่มเควสต์นี้** / ติด | Gift line. Quiet link at the bottom: `ทำไปแล้ว ส่งงานได้เลย` |
| Started (mine) | **เขียนหรือแนบงาน** / ติด | Plan card or `จดแผนสั้นๆ (ไม่บังคับ)`; gift line |
| Held by a teammate | ติด | `DETAIL.held` |
| Waiting | ส่งฉบับใหม่ (quiet) / ติด | Waiting line + `ระหว่างรอ เริ่มที่: Y` |
| Clarification | **ตอบพี่เลี้ยง** / ติด | `พี่เลี้ยงบอกว่า: …` |
| Declined (main) | **เริ่มรอบใหม่** / ติด | Quote + `รอบนี้ยังไม่ผ่าน ลองใหม่จากที่พี่เลี้ยงบอกได้เลย` |
| Done (repeatable) | **ไปเควสต์ถัดไป** / ส่งซ้ำ (quiet) | `DETAIL.done` |

- Starting no longer ends on a toast: the sheet keeps `justStarted` keyed by
  `refKey` (the body remounts on status change, `bodyKey`, `:160`) and opens
  the started slot with the plan form focused.
- **Plan (optional):** `จะคุยกับใคร` (hint: `บอกแค่บทบาท เช่น แม่ค้าหน้าโรงเรียน
  ไม่ต้องใส่ชื่อจริง`; outside Act 1: `จะเริ่มจากอะไร`), `เมื่อไหร่` with chips
  `วันนี้` / `พรุ่งนี้` / `เสาร์อาทิตย์นี้`, 60 characters each. Act 1 shows
  `HELPERS.safety` under it. Stored in localStorage
  `shift-island-plan-v1:<instanceId>` (no migration), shown back on the
  started slot, the gold card and above the proof in `SubmitForm`, cleared on
  send.
- **Gift line** under the purpose and atop `SubmitForm`:
  `ส่งครั้งแรก ทีมได้ของขวัญให้ต้นไม้หนึ่งชิ้น`, only when nothing was sent
  yet (the server gives one gift per project and source, `tree_style.sql:368`).
- A declined main quest can be restarted (`__milestone_open` only reuses
  open states, `board_fixes.sql:257-273`).

### Gold card

A pure `goldQuest(board) -> { ref, why } | null` in
`lib/supabase/shift-quests/board.ts`; `KeynoteCard` maps `why` to the
headline. First match wins:

| # | Situation | Points to | Headline |
|---|---|---|---|
| 1 | Clarification | that quest | `ทำต่อ: X` + chip ขอข้อมูลเพิ่ม |
| 2 | Active | that quest | `ทำต่อ: X` + plan line |
| 3 | Paused | that quest | as today |
| 4 | Own declined main | lowest declined | `ลองอีกครั้ง: X` (matches `notice.ts:26`) |
| 5 | Only waiting, a startable main Y exists | Y | `ระหว่างรอ เริ่มที่: Y` |
| 6 | Only waiting, nothing startable | X | `รอพี่เลี้ยงดู: X` |
| 7 | Nothing open, Y exists | Y | `เริ่มที่: Y` |
| 8 | All 7 done | hidden, wide board button | as today |

Board copy `ทำขั้นไหนก่อนก็ได้` (`copy.ts:315`) becomes
`7 ขั้นของต้นไม้ ไล่จากขั้น 1 ดีที่สุด`.

### Seed at claim

The claim form's ambition question (`NoProject.tsx:170-181`) repeats
`TREE.seed.ask`. New claim form: name, route, the problem line (required),
the four seeds (`SeedChoice`, pulled out of `SeedPicker`). Button
`จับจองที่ดินและปลูกเมล็ด`. `createProject` calls `shift_quest_project_create`
then `shift_quest_seed_plant` (already granted); a failed plant still claims
and falls back to the tree pill. Own unplanted plots read `รอปลูกเมล็ด`
instead of `ที่ดินว่าง`. Note: all 8 current students already claimed, so this
helps new students only.

---

## Build order

**Wave A: no migration (about 5 dev days; target before 21 Nov)**

| # | Work | Size | Ships via |
|---|---|---|---|
| A1 | Growth moment + `TreeCanvas` replay fix | 1.5 d | Vercel |
| A2 | Discord approval notice with the tree, stale copy fix | 2 h | bot deploy |
| A3 | Quest page start-first, state slot, plan, gift line, gold card | 1.5 d | Vercel |
| A4 | `rv_open` button, decided-state fix, queue age | 0.5 d | bot deploy |
| A5 | Sent screen turnaround, web results list, start passes `null`, nudge copy | 1 d | Vercel + bot |
| A6 | Seed at claim | 1 d | Vercel (lowest: helps new students only) |

**Wave B: grant migrations (about 3 dev days)**

| # | Work | Size |
|---|---|---|
| B1 | Web review decisions (`review_decide` grant) | 1 d |
| B2 | Full web inbox and DM toggle (`inbox_list`, `update_prefs` grants) | 1 to 1.5 d |
| B3 | Overdue review nudge (new function) | 0.5 d |

Each migration is timestamped after `20261115144409` and applied with
`supabase db push` before its web code deploys.

## Decisions for the founder

| # | Question | Recommendation |
|---|---|---|
| 1 | Growth moment opens by itself on return, or waits for a tap on the tree? | By itself, once |
| 2 | Review turnaround promised to students, and who owns it | 48 hours (`ภายใน 2 วัน`), named mentor on duty |
| 3 | Allow decisions on the web (reverses "decisions stay in Discord")? | Yes, pending work only; appeals stay in Discord |
| 4 | Overdue nudge to staff after N hours? | Yes, N = 24 |
| 5 | Untouched quest: start is primary, send becomes a quiet link? Keep #304 details open? | Yes and yes |
| 6 | Plan stored on the device only, or on the server so mentors see it? | Device only for Season 1 |
| 7 | Require the problem line and seed at claim? | Yes, new claims only |
| 8 | Switch on reminders (opt-in) and sharing (weekly island post) for Season 1? | Reminders yes; sharing after the Thai review |
| 9 | Board icons clash with island decorations (board: visitor = 1, path = 5; island: visitor = 3, path = 6) | Pick one mapping before A1 ships |
| 10 | Teammates also get the approval notice (needs a migration)? | Later: every team is solo today |
| 11 | At stage 7, does "next" lead to the Demo Day festival? | Yes |

## Tests (summary)

- `tree/growth.test.ts`: first visit with and without the 48 h rule, +1, +2,
  cap at 3, each decoration, rebase, storage throws, quote only from own work.
- `GrowthSheet.test.tsx`, `IslandApp.test.tsx`: plays once, waits for voyage
  and story, plays again after a refresh with a new milestone, reduced motion.
- `board.test.ts`: one case per gold-card row. `QuestDetailSheet.test.tsx`:
  bar per state, state slot above the open details (keep the #304 assertion),
  gift line. `QuestPlan.test.tsx`, `KeynoteCard.test.tsx`.
- Bot: `review_approved` headline (main vs side), `outbox` rows for
  `review_needed`, `rv_open` replies privately, decided card has no buttons,
  queue age label.
- Wave B: `web_board.ts` allowlist moves, `run-local.sh` `web_allow`, a DTO
  test that no internal id reaches the browser, one web decision with a
  conflict refusal in `evidence.ts`.
