# SHIFT High Island: one next step

Status: built on `feat/shift-island-one-next-step`, 2026-11-17; decluttered
2026-11-18. Thai copy is DRAFT and needs the three-model review in the root
`AGENTS.md` before it ships. Builds on [shift-island-core-loop.md](shift-island-core-loop.md).

## Why

The founder: "The island journey isn't simple for kids and me to use."

An audit on 2026-11-17 (read only) found:

- **Every visit**, a student met 9 round buttons and pills, 4 tappable plaza
  spots, the plots, a gold card and a board button, leading to 18 different
  sheets (`IslandApp.tsx` `Panel`).
- **The check-in** the founder put before the work (decision of 2026-11-16)
  was hidden inside the name chip and the tree sheet.
- **An untouched quest** said ส่งเควสต์ in its sticky bar; เริ่มเควสต์นี้ was a
  quiet button under about twelve blocks and ended on a toast.
- **A mentor's result** only reached the student through Discord's `/inbox`;
  the web envelope said "read it in Discord".
- In the season's first days almost no main quests had been started and none
  had been sent, so the loop had not closed once.

## Decisions (founder)

| # | Question | Answer |
|---|---|---|
| 1 | What a student sees over the island | **2026-11-18:** the team chip, the next-step card with one verb button, and the ดูเควสต์ทั้งหมด text link: three things to tap, nothing floating over the canvas. The envelope and ≡ are gone from home; results and the menu's lines live in the chip's sheet. ("I don't want the BMW dashboard button menu. So much visual clutter. Make everything intuitive.") *Replaces 2026-11-17: chip, envelope and menu in the top bar.* |
| 2 | Where the check-in lives | **2026-11-18:** the card's tap is the check-in. The day's first tap that leads to work saves it quietly and opens the work; no screen in between. What the student means to do today is an optional, folded box inside the quest they are on. *Replaces 2026-11-16/17: a check-in sheet before the work.* |
| 3 | The quest page | "Take inspiration from the best designed, for the game aspects too." **2026-11-18:** five dots for where the work stands, the mentor's words first, the checklist right under the goal, everything else (details, the lore line, steps, words, pitfalls, examples, helper quests) folded into one closed รายละเอียดและตัวช่วย, and exactly one thing in the sticky bar per state. ติด leaves the bar for a quiet ติดตรงไหน? line under the checklist. **2026-11-26** (after Season 1 went quiet, "the ui might just be bad"): how to do the quest leaves the fold and sits open under the checklist (a skill quest's picture and steps, ตัวอย่างที่ผ่าน, หลุมพราง with เลี่ยงยังไง, ตัวช่วย with the safety line), above the optional extras. The one closed fold, now รายละเอียดเพิ่มเติม, keeps the details, the lore line and the words. *Narrows 2026-11-18's fold.* |
| 7 | The next-step card's line | **2026-11-26:** on a quest to start or carry on, the line under the headline says what the quest asks in the real world (`QUEST_TODO`, e.g. คุยกับคนที่เจอปัญหานี้จริง 1 คน แค่ 10 นาที), and a small line under it says which main quest it is and what passing it does (`NEXT_STEP.payoff`). The button still starts and opens the quest: the card now says what the tap commits to. *Replaces "เควสต์หลัก 1 จาก 7" alone.* |
| 4 | Mentor review on the web | Not now: reviews stay in Discord for Season 1, and students are promised no turnaround time. Part 3, Wave B (B1) of the core-loop design waits. |
| 5 | The chip's sheet | **2026-11-18:** one line of progress (the tree's stage), no stats grid (side quests, community, check-ins; the data stays in the database), and no season panel (Demo Day stands in the plaza). |
| 6 | The whole quest board | **2026-11-18 (later):** off home. The ดูเควสต์ทั้งหมด link under the card is gone: home is the chip and the card. The board opens from a tap on the plaza's notice board (its button is named กระดานเควสต์; no words are printed over it, after the founder's "dont clutter" the same day: the small คุณ over the viewer's own figure is the only label left over the plaza, and the stage's countdown board draws its days in pixels), and from a กระดานเควสต์ line at the head of the chip sheet's short list: the board has one name everywhere, as in the bot. The wide board button stays only when there is no next step. *Narrows decision 1 to two things to tap.* |

## What changed

**The home screen** (375px): the team chip top left, and at the bottom one
gold card, `NextStepCard`, with one verb button. The whole board is a tap on
the plaza's notice board, or the กระดานเควสต์ line in the chip's sheet (decision 6).
Once all seven main quests are passed and nothing is open, the board button
takes the card's place. Before a plot is claimed, the picture
chip opens the menu (the old ≡) and the claim button sits at the bottom.

**The card follows the student** (`nextStep.ts`, first match wins). Each state
has one button (`step.action`: start, open or wake), or none:

| State | Headline | Line under it | Button | The tap |
|---|---|---|---|---|
| Resting | กำลังพัก | ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย | กลับมาทำต่อ | Wakes them |
| A fresh approval (new) | ผ่านแล้ว: X | พี่เลี้ยงให้ผ่าน ต้นไม้ของทีมโตขึ้น 1 ขั้น (main) | ดูผล | Marks results seen, opens X |
| A mentor asked for more | ตอบพี่เลี้ยง: X | พี่เลี้ยงบอกว่า: … | ดูสิ่งที่พี่เลี้ยงบอก | Opens X |
| A quest in progress | ทำต่อ: X | Today's intention, else เควสต์หลัก n จาก 7 | ทำต่อ | Opens X |
| Waiting, a main quest free | ระหว่างรอ เริ่มที่: Y | ส่ง X แล้ว รอพี่เลี้ยงดู | เริ่มเลย | Starts Y, opens it |
| Waiting, nothing free | รอพี่เลี้ยงดู: X | ส่งแล้ว ผลจะขึ้นตรงนี้ | none | Nothing: plain words |
| A main quest declined | ลองอีกครั้ง: X | พี่เลี้ยงบอกว่า: … | ลองอีกครั้ง | Opens X |
| Nothing open | เริ่มที่: X | เควสต์หลัก n จาก 7 | เริ่มเลย | Starts X (`useStartQuest`), opens it |

A fresh approval is the newest approved result of the student's own work that
is newer than the last time they looked on this browser
(`useFreshApproval`); a side quest's line says พี่เลี้ยงให้ผ่านแล้ว, never that
the tree grows. While the day is open, the first tap that leads to work is the
check-in (`checkIn`, quiet, no screen); a failed check-in never blocks the
work, and the next tap tries again. Looking at a result or at work waiting on
a mentor is never a check-in. A check-in never grows the tree's stage.

**The chip's sheet** is the island's one door to everything that is not the
next step, top to bottom: the consent banner while consent waits, the student
and the tree's stage as one line, ผลจากพี่เลี้ยง (`ResultsList`, only when there
is something), the tree line, coins, the team (invites, invite friends, the
show-name switch), then the menu's short list (`MenuFoot`: คู่มือ, เรื่องเล่า,
ข่าวเกาะ while the digest is on, เสียงกองไฟ, ขอพัก, the AI news line while it
waits, the admin overview for admins), ดูทั้งเกาะ and the suggestions link as
quiet words, the admin reset folded, and who is signed in. The chip carries a
lamp dot while consent waits, a mentor's result is new, or a gift or the seed
waits at the tree. Opening the sheet marks results seen; new ones stay marked
ใหม่ while it is open.

Everything else lives where it stands on the island (founder's first play,
2026-11-17: "so much menu bro ... like bmw console now"):

| Place | Where it is |
|---|---|
| The tree | The team's plot, and a line in the chip's sheet |
| Prizes, the campfire, Demo Day | Their spots in the plaza |
| The canvas | The quest page, where the work is |
| Refresh | Gone as a button: the island reads itself again on return (`IslandAutoRefresh`) and after every action |

**The quest page** (`QuestDetailSheet`): the header with five dots
(เริ่ม, ทำ, ส่ง, พี่เลี้ยงดู, ผ่าน; `questStage`) in place of the status chip,
the mentor's words, one line of goal, the เสร็จเมื่อ checklist, a quiet
how to do it, open (a skill quest's steps, ตัวอย่างที่ผ่าน, หลุมพราง, ตัวช่วย
and the safety line; decision 3, 2026-11-26), a quiet
ติดตรงไหน? ขอความช่วยเหลือ line, the folded intention box on work in progress,
photos and peer checks once sent, the team's problem on first-act quests, the
canvas (refresh now inside its notes box), the quest's state in words, and
one closed รายละเอียดเพิ่มเติม fold for the rest (what to send, the
question, the lore line, the words). The sticky bar
(`questBar`) holds exactly one thing:

| State | Bar |
|---|---|
| Untouched | เริ่มเควสต์นี้ (stays on the page, no toast; the page refreshes into the started quest) |
| Started | เขียนหรือแนบงาน |
| A mentor asked for more | ส่งฉบับใหม่ |
| Sent, or in appeal | Words: ส่งแล้ว รอพี่เลี้ยงดู (a new version is a quiet link in the page) |
| Paused | ทำต่อเควสต์นี้ |
| Passed, or a closed proposal | ไปเควสต์ถัดไป (the card's quest), else กลับไปที่เกาะ |
| Locked, or a teammate holds it | ไปเควสต์ที่เปิดอยู่, else กลับไปที่เกาะ |

**The roots line** (how the work went) is in the tree sheet, under the roots
it grows (`RootsLine`).

Browser keys: `shift-island-results-seen-v1` (`{ who, at }`, the member uuid,
never the Discord id) joins `clearIslandKeys`.

## Next

1. **The growth moment** from the core-loop design (Part 1) when a mentor
   approves: today the card says ผ่านแล้ว and opens the quest; the tree
   growing on screen is still to come.
2. **Thai review** of every DRAFT string in `NEXT_STEP` (with `action`),
   `RESULTS`, `MENU`, and `DETAIL` (`stepper`, `helpers`, `next`, `toOpen`,
   `home`, `waiting`, `stuckLine`, `intention*`, `sendDone`).
3. **Mentors, still in Discord:** the core-loop design's Wave A4 (a ดูงาน button
   on the staff post, decided cards without buttons, queue age) speeds review
   up without moving it to the web. It needs a bot deploy and a founder go.
