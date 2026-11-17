# SHIFT High Island: one next step

Status: built on `feat/shift-island-one-next-step`, 2026-11-17. Thai copy is
DRAFT and needs the three-model review in the root `AGENTS.md` before it
ships. Builds on [shift-island-core-loop.md](shift-island-core-loop.md).

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

## Decisions (founder, 2026-11-17)

| # | Question | Answer |
|---|---|---|
| 1 | What a student sees over the island | The next-step card, the team chip, the results envelope and the menu. Everything else moves off the top bar. After the first play ("so much menu"), the menu keeps only what has no place on the island; the rest is where it stands (below). Only the manual refresh button is gone. |
| 2 | Where the check-in lives | Inside the gold card: the day's first tap opens it, then the quest. It leaves the chip and the tree sheet. |
| 3 | The quest page | "Take inspiration from the best designed, for the game aspects too." Its redesign is the next branch (below). This branch only makes starting the bar's main button. |
| 4 | Mentor review on the web | Not now: reviews stay in Discord for Season 1, and students are promised no turnaround time. Part 3, Wave B (B1) of the core-loop design waits. |

## What changed

**The home screen.** The top bar is the chip (opens the team sheet), the
envelope and the menu. At the bottom sits one gold card, `NextStepCard`, and
under it one quiet link, ดูเควสต์ทั้งหมด. Once all seven main quests are passed
and nothing is open, the board button takes the card's place.

**The card follows the student** (`nextStep.ts`, first match wins):

| State | Headline | Line under it | A tap |
|---|---|---|---|
| Resting | กำลังพัก | ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย แตะเพื่อกลับมาทำต่อ | Wakes them |
| A mentor asked for more | ตอบพี่เลี้ยง: X | พี่เลี้ยงบอกว่า: … | Opens X |
| A quest in progress | ทำต่อ: X | Today's intention, else เควสต์หลัก n จาก 7 | Opens X |
| Waiting, a main quest free | ระหว่างรอ เริ่มที่: Y | ส่ง X แล้ว รอพี่เลี้ยงดู | Opens Y |
| Waiting, nothing free | รอพี่เลี้ยงดู: X | ส่งแล้ว ผลจะขึ้นที่ซองจดหมาย | Opens X |
| A main quest declined | ลองอีกครั้ง: X | พี่เลี้ยงบอกว่า: … | Opens X |
| Nothing open | เริ่มที่: X | เควสต์หลัก n จาก 7 | Opens X |

While the day's check-in is open, a lamp dot sits on the card's icon and a
tap that leads to work opens `CheckInSheet` first: วันนี้จะลงมือทำอะไร
(optional, private, kept on the browser for that student), then
เช็กอิน แล้วลุยเลย, which saves the tap and opens the quest. Looking at work
that waits on a mentor never asks for a check-in. A check-in never grows the
tree's stage.

**The menu** is a short list, like a game's pause menu, with only what has
no place on the island: คู่มือ, เรื่องเล่า, ข่าวเกาะ (while the digest is on),
เสียงกองไฟ (with its state at the end of the line) and ขอพัก, plus the admin
overview on top for admins. Under it, ดูทั้งเกาะ and the suggestions link are
quiet words, the admin's reset is folded under เครื่องมือแอดมิน, and the
footer says who is signed in. The consent step keeps its full row above the
list while it waits.

Everything else lives where it stands on the island (founder's first play,
2026-11-17: "so much menu bro ... like bmw console now"; a first build had all
fourteen places as a grid of tiles):

| Place | Where it is |
|---|---|
| The team, coins | The chip: its sheet holds the coin row |
| The tree | The team's plot, and a line in the chip's sheet. A gift or the seed waiting puts a lamp dot on the chip and on that line |
| The show-name switch | The chip's sheet, under the project |
| Prizes, the campfire, Demo Day | Their spots in the plaza |
| The canvas | The quest page, where the work is |
| Refresh | Gone as a button: the island reads itself again on return (`IslandAutoRefresh`) and after every action |

Before a plot is claimed nothing on the island can be tapped yet, so that
menu also lists the coins and the prizes. The story still opens on a first
visit, and the sound keeps playing while the menu is closed
(`useCampfireSound`).

**Results on the web.** The envelope (`ResultsSheet`) lists what mentors said
about the student's own work, newest first, read from each quest's
`mine.latest_review` on the board, so no migration is needed. Each row opens
its quest. New results (newer than the last time the envelope was opened on
this browser, or from the last week without a mark) show a count on the
envelope and ใหม่ on the row. The bot's other notices stay in Discord, with a
link. A teammate's feedback is never listed.

**The quest page.** On an untouched main or side quest, the sticky bar's main
button is เริ่มเควสต์นี้; work already done can still go to a mentor through a
quiet ทำไปแล้ว? ส่งงานได้เลย link at the bottom of the page.

**The roots line** (how the work went) moved from the check-in card to the
tree sheet, under the roots it grows (`RootsLine`).

Browser keys: `shift-island-results-seen-v1` (`{ who, at }`, the member uuid,
never the Discord id) joins `clearIslandKeys`.

## Next

1. **The quest page, from the best-designed games** (decision 3): objective
   first and the quest log's lore folded, one tracked quest, a short stepper
   of where the work stands (เริ่ม, ทำ, ส่ง, พี่เลี้ยงดู, ผ่าน), and the growth
   moment from the core-loop design (Part 1) when a mentor approves. Its own
   branch.
2. **Thai review** of every DRAFT string in `NEXT_STEP`, `CHECK_IN`,
   `RESULTS`, `MENU` and `DETAIL.sendDone`.
3. **Mentors, still in Discord:** the core-loop design's Wave A4 (a ดูงาน button
   on the staff post, decided cards without buttons, queue age) speeds review
   up without moving it to the web. It needs a bot deploy and a founder go.
