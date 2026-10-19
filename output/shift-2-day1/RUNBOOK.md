# SHIFT[2] Day 1 runbook (Wed 14 Oct, 19:00 to 21:00)

Files in this folder:
- `shift-2-board.excalidraw`: the cohort board for all 7 days. It has 29 frames: start, Park rules + 9 refund steps, tonight, 7 days, game rules, rooms + drawing space, scoreboard, question cards, 20 student frames and a parking lot. It contains no student data. Students claim a frame themselves.
- `build-board.mjs`: regenerates the board (`node output/shift-2-day1/build-board.mjs`). Copy sources: `SHIFT2_CURRICULUM` and `REFUND_STEPS` on origin/main, plus the icebreaker question seed.

Day 1 follows `SHIFT2_CURRICULUM` day 1 (origin/main), with the 19:15 ice break slot run as the "ภารกิจลับ" game below.

---

## Before 19:00

| By | Do |
|---|---|
| Morning | Merge **PR #196** (SHIFT[2] dates 14 to 20 Oct). After Vercel deploys, check `/shift/2`, `/shift/apply?round=2`, `/` and one join link. |
| Morning | In `/admin/shift/applications`, **3 SHIFT[2] applications are paid but still `new`**. Accept them and send their join links so they get the Discord role before 19:00. There are also 3 unpaid `new` applications and 1 `declined` that has `paid_at` set (refund?). |
| Afternoon | Discord: make sure there are voice rooms **ห้อง 1 to ห้อง 6** (SHIFT[1] had 1 to 4) plus Park, and that #progress and #first-contact are visible to the SHIFT[2] role. |
| 18:30 | Board: open excalidraw.com in Chrome, then ☰ → Open → `shift-2-board.excalidraw` → **Share → Live collaboration → Start session**. Set your name to "พี่ ___", then copy the link. |
| 18:35 | Open the link on your phone or in a second browser. Check that the board loads and you can see the cursor. Send the link to mentors only. |
| 18:40 | wheelofnames.com: enter `01` to `20`. After 19:10, remove the numbers nobody claimed. |
| 18:45 | Post message A below (if you haven't already). |

Once the room is live, **don't open the file again**: it replaces the board for everyone.

---

## Run of show

| Time | Segment | Host notes |
|---|---|---|
| 19:00 | Park | Post message B. Students set their nickname, claim a frame and click your avatar to follow you. Walk through the "Park: กติกา + คืนเงิน" frame: #progress is what counts, the board is for working and drafting. |
| 19:15 | ภารกิจลับ | Read the game script (below), then post message C for round 1. Each round is 8 minutes: 6 talking, 2 guessing. Keep 1 to 2 minutes between rounds to move rooms. |
| 19:45 | Reveal + 3 ไอเดีย | Read the reveal script. The round 3 question (things that are badly designed) is the seed for ไอเดีย 1. Students fill 3 ideas in their own frame. |
| 20:05 | Can they reach them? | Students tick ✓ or ✗ in each idea's box: can they reach these people themselves, without asking an adult? |
| 20:15 | Pick 1 | Spin the wheel and use follow to look at that student's frame. Mentors only ask questions (list below), students make the cut. |
| 20:30 | How to talk to people | Use `SHIFT2_INTERVIEW` from `/shift/curriculum`. Point back to the game: missions 1 to 11 are these exact moves. Practise once with a friend. |
| 20:45 | First contact | DM one real person to book a 10-minute talk tomorrow. Screenshot it to #first-contact, with the name and photo blurred. Write it in the First contact box in their frame. |
| 20:50 | Mission | Post message D. Save a backup. |

**Watching students:** click someone's avatar to follow their screen. Shift+1 shows the whole board, which works as the admin overview. The board can't make everyone follow you, so ask them to click your avatar.

**Questions for "Pick 1"** (ask, don't suggest features):
- คืนนี้ทักคนกลุ่มนี้ได้เองเลยไหม
- ครั้งล่าสุดที่เห็นปัญหานี้คือเมื่อไหร่
- ถ้าทำได้อันเดียว อันไหนที่อยากรู้คำตอบที่สุด

---

## ภารกิจลับ (19:15 to 19:45)

Rooms come from the frame numbers. Over the three rounds, nobody meets the same person twice, and neighbouring frames (friends who signed up together) never share a room.

| | ห้อง 1 | ห้อง 2 | ห้อง 3 | ห้อง 4 | ห้อง 5 | ห้อง 6 | Question |
|---|---|---|---|---|---|---|---|
| Round 1 | 1 7 13 19 | 2 8 14 20 | 3 9 15 | 4 10 16 | 5 11 17 | 6 12 18 | 8 (things that make you oddly happy) |
| Round 2 | 1 8 15 | 2 9 16 19 | 3 10 17 20 | 4 11 18 | 5 12 13 | 6 7 14 | 5 (could talk about for an hour) |
| Round 3 | 1 9 17 | 2 10 18 | 3 11 13 | 4 12 14 19 | 5 7 15 20 | 6 8 16 | 10 (badly designed things) |

If anyone is absent, a room with only 1 person joins the next room. 19 and 20 are spare frames.

**Game script (about 1 minute):**
> เกมชื่อ "ภารกิจลับ" เล่น 3 รอบ รอบละ 8 นาที ห้องละ 3 คน
> หนึ่ง เลือกภารกิจลับ 1 ข้อจาก 12 ข้อบนบอร์ด ห้ามบอกใคร อยากให้สุ่มให้ พิมพ์ roll a d12 ใน Google
> สอง ในห้อง ผลัดกันตอบคำถามของรอบ คนละ 2 นาที คนที่ฟังอยู่ วาดสิ่งที่ได้ยินลงช่องห้องบนบอร์ด
> สาม แอบทำภารกิจระหว่างคุย ทำได้แล้วพิมพ์ ✅ ในแชทห้องเสียง คนแรกได้โบนัส
> สี่ 2 นาทีสุดท้าย ทายกันว่าใครมีภารกิจอะไร ใครเป็นสปาย แล้วเฉลย จดคะแนนในกระดานคะแนน
> ข้อ 12 คือสปาย: แต่งคำตอบ 1 เรื่องให้เนียน

**Reveal script (19:45, about 3 minutes; it's not on the board, so say it):**
> เฉลย: ภารกิจ 1 ถึง 11 คือท่าที่คนเก่ง ๆ ใช้ตอนคุยกับคนที่เจอปัญหาจริง ถามถึงครั้งล่าสุด ถามทำไมต่ออีกชั้น ขอตัวเลข เงียบรอ ทวนคำพูดตรง ๆ ขอคนต่อไป 20:30 คืนนี้กับพรุ่งนี้ เราจะใช้มันจริง
> ส่วนสปาย: คนที่เราไปคุยด้วยก็ "แต่ง" ได้ ส่วนใหญ่ไม่ได้ตั้งใจ แค่อยากให้เราดีใจ โดยเฉพาะถ้าเราถามว่า "ถ้ามีแอปนี้จะใช้ไหม" ถามเรื่องที่เกิดขึ้นแล้ว จับได้ง่ายกว่าเยอะ
> ใครจับสปายได้บ้าง จับได้จากอะไร

(Their answers are usually "too vague, no details". That is the lesson: real stories come with details.)

---

## Discord posts (copy and paste)

**A. Reminder (afternoon, announcements)**
```
คืนนี้ 19:00 เจอกันที่ห้องเสียง Park 🌲
• เข้าจากโน้ตบุ๊กหรือคอมจะดีที่สุด (มือถือใช้บอร์ดได้ แต่จอเล็ก)
• หูฟัง + ไมค์ ใครไม่สะดวกเปิดไมค์ พิมพ์ในแชทได้
• ลิงก์บอร์ดของรุ่น พี่โพสต์ตอน 19:00
```

**B. Board link (19:00, a channel only the SHIFT[2] role can see)**
```
บอร์ดของรุ่น SHIFT[2] 👉 <ลิงก์>
1) ตั้งชื่อเล่นบนเคอร์เซอร์: กด Share มุมขวาบน แล้วแก้ช่อง Your name
2) จองกรอบว่าง 01 ถึง 20 พิมพ์ชื่อเล่นในช่องสีเหลือง (เลขกรอบ = เลขของเราในเกม)
3) กดรูปพี่ที่มุมขวาบน จอจะตามพี่ไปเอง
ลิงก์นี้ใช้ในรุ่นเท่านั้น อย่าส่งต่อ · ใช้ชื่อเล่นอย่างเดียว · ห้ามกด Reset the canvas
```

**C. Each round**
```
รอบ <1/2/3> เริ่ม! ดูเลขห้องในตารางบนบอร์ด (โซน "ห้อง + ช่องวาด") แล้วเข้าห้องเสียงนั้น ⏱️ 8 นาที
```

**D. Mission before Day 2 (20:50, pin it)**
```
Mission ก่อน Day 2 (พฤ. 15 ต.ค. 19:00)
• คุยกับคนที่เจอปัญหาจริงอย่างน้อย 3 คน จดเป็นคำพูดของเขา ไม่สรุปเอง
• โพสต์ใน #progress (แคปได้ แต่เบลอชื่อและรูปก่อน)
คำถามที่ใช้ได้:
- ครั้งล่าสุดที่เจอเรื่องนี้คือเมื่อไหร่ เล่าให้ฟังหน่อย
- ตอนนั้นทำยังไง ใช้อะไรช่วย
- ตรงไหนยากหรือเสียเวลาที่สุด
- เคยลองวิธีอื่นไหม ทำไมไม่ใช้ต่อ
- มีใครอีกที่เจอแบบนี้ แนะนำให้หน่อยได้ไหม
อย่า: เล่าไอเดียเราก่อน · ถามว่า "ถ้ามีแอปแบบนี้จะใช้ไหม"
บอร์ด: อัปเดตช่อง D1 ในกรอบตัวเองได้ แต่ที่นับคือ #progress
```

---

## Backups and safety

- **Save backups at 19:45, 20:30 and 21:00, then every night:** ☰ → Save to... → Save to disk. Store them outside the repo, because they will contain nicknames and project content.
- **If someone wipes the board** (Reset the canvas wipes it for everyone): in the live session, ☰ → Open → the latest backup. It syncs to everyone.
- **If the link leaks:** Stop session, then start a new one and post the new link. The old link still holds the scene up to that point.
- Anyone with the link can edit, which is why it goes in a SHIFT[2]-only channel. Students should use nicknames only, never post photos of the people they interview, and blur names in screenshots. These rules are also on the board.
- No 1:1 DMs between mentors and minors. Answer in the parking lot or in #ถามได้ทุกเรื่อง.

## Days 2 to 7

The same link and board are used all week. Each student frame has slots from D1 to D7, which students fill with images, text or voice links. Voice can't play on the board, so it goes in as a Discord link. **#progress is still what counts toward the refund**. The board is the working space. Each night, save a backup and use Shift+1 to see who hasn't updated.

## Not built yet (decided earlier)

These wait until our own board exists: the AI chat on selected items (needs the DeepSeek image-part fix first), the in-app icebreaker mode, "everyone follow me", and syncing progress to the admin dashboard. PR #192 (SHIFT rounds) also stays unmerged, and its migrations stay unapplied, for this round: its student side lives in the mobile app, which hasn't shipped.
