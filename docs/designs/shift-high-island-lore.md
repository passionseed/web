# เกาะ SHIFT: เรื่องเล่าของเกาะ (lore bible)

DRAFT for the founder's multi-model Thai review (AGENTS.md, "Thai copy review").
Thai first, an English gloss under each section. Every line a student can see
in the game is marked `DRAFT` in its source file and lists back to this page.

The game this describes: SHIFT High, a two-week season (Season 1: the island
opens Saturday 14 Nov 2026, Demo Day is Saturday 28 Nov 2026) where
high-school students **who finished SHIFT** keep building a real, long-term
project: the one they finished SHIFT with, or a new one they start or join
on the island. The way in is SHIFT (`SHIFT_ISLAND.entry` in
`lib/content/shift-island.ts`: "จบ 7 วันแล้วได้เข้า SHIFT High"), and the bot
serves the SHIFT High alumni community
([`../features/shift-high-quests.md`](../features/shift-high-quests.md)).

**One story.** The island invite (`lib/content/shift-island-invite.ts` on
`feat/shift-island-invite`, not merged: the prologue, the bottle, the letter,
the wax seal and the ticket "เจอกันบนเกาะ") is chapter one and canon. Everything
on this page, and every line in the game, continues from it: the game opens on
the morning after the ticket. Section 16 lists where the two disagreed and how
they were aligned.

New or changed lines in this revision are marked **DRAFT** inline. Sections 12
to 16 are new.

Plans and mechanics live in
[`shift-high-island-web.md`](shift-high-island-web.md),
[`shift-high-island.md`](shift-high-island.md) and
[`../features/shift-high-quests.md`](../features/shift-high-quests.md). This page
only names things and says why they are the way they are.

---

## 0. กติกาของเรื่องเล่า

เรื่องเล่าของเกาะมีไว้ให้งานจริงดูมีที่ทาง ไม่ได้มีไว้แทนงานจริง
ทุกอย่างบนเกาะต้องชี้กลับไปที่ของที่นักเรียนสร้างและคนจริงที่ได้ลอง

- ไม่มีตัวละครในตำนาน ไม่มีเวทมนตร์ ไม่มีศัตรู คนบนเกาะคือนักเรียน เพื่อน และพี่เลี้ยงตัวจริง
- ไม่มีอะไรบนเกาะโตจากการกด การเข้าระบบ หรือเวลาออนไลน์
- ไม่สอน ไม่เทศน์ ไม่บอกว่า "ควรรู้สึกยังไง" เล่าแค่ว่าเกาะทำงานยังไง
- ไม่มีอันดับ พักได้เสมอ ต้นไม้ไม่เหี่ยว เกมอาจบอกว่าคุณมาที่เกาะแล้วกี่วัน แต่วันที่ไม่ได้มาไม่ทำให้อะไรหายหรือเริ่มนับใหม่ (DRAFT)
- ไม่สัญญาเรื่องการสอบเข้า เงิน หรือตำแหน่ง ต้นไม้คือหลักฐานของงานที่ทำจริงเท่านั้น (DRAFT)
- ทุกอย่างเกิดในที่ที่ทุกคนเห็น ไม่มีห้องลับระหว่างผู้ใหญ่กับนักเรียน
- ไม่พูดตัวเลขรางวัล ราคา หรือเหรียญในเรื่องเล่า ตัวเลขมาจาก company-brain เท่านั้น

> The lore gives real work a place to live; it never replaces the work. No
> mythical characters, magic or enemies: the people on the island are the
> students, their friends and real mentors. Nothing grows from taps, logins or
> time online. No lectures, no ranking; rest is always allowed. The game may
> show how many days you have shown up, but a missed day never resets,
> shrinks or punishes anything (this replaces the old "no streaks" rule: a
> count of days shown up is allowed, a streak that breaks is not). No promises
> about admissions, money or roles: a tree is evidence of real work, nothing
> more.
> Everything happens in group spaces (students are minors). No prize, price or
> coin numbers in the lore: those come from company-brain only.

---

## 1. เกาะ SHIFT: เช้าวันแรกหลังขวด (DRAFT)

7 วันของ SHIFT จบลง คุณมีโปรเจกต์จริงหนึ่งชิ้นอยู่ในมือ แล้วขวดใบหนึ่งก็ลอยมาเกยฝั่ง
คุณกดตราประทับ ได้ตั๋วที่เขียนว่า "เจอกันบนเกาะ" เรื่องในเกมเริ่มตรงนี้ เช้าวันแรกที่คุณขึ้นเกาะ

ซีซัน 1 คือซีซันแรกของเกาะ ตอนเกาะเปิดจึงมีแค่พื้นทราย หญ้า ลานกลางเกาะ และทะเลรอบๆ ยังไม่มีต้นไม้สักต้น
เพราะบนเกาะนี้ ต้นไม้ไม่ได้มีมาก่อน ต้นไม้คือโปรเจกต์ของคนที่มาอยู่ คนรุ่นซีซัน 1 คือคนที่ได้ลงแปลงก่อนใคร
ที่ดินว่างจึงไม่ใช่ความเงียบ มันคือที่ที่รอโปรเจกต์ที่คุณถือมา หรือเรื่องใหม่ที่คุณอยากเริ่ม

ตั้งแต่ซีซัน 2 เป็นต้นไป คนที่มาใหม่จะเห็นต้นไม้ของคนรุ่นก่อนยืนอยู่แล้ว และมีที่ดินว่างแปลงใหม่รอเขา

> Seven days of SHIFT end with a real project in hand, and a bottle washes up.
> You press the seal and get a ticket that says "see you on the island". The
> game starts there: the first morning on the island.
>
> Season 1 is the island's first season, so when it opens there is sand,
> grass, the plaza and the sea, and no trees. Trees here are not scenery: they
> are the projects of the people who live here, and the Season 1 builders are
> the first to plant. An empty plot is not silence; it is room for the project
> you brought, or a new one you want to start. From Season 2 on, newcomers
> arrive to the trees of the builders before them, plus fresh empty plots.

---

## 2. ต้นไม้: โตจากงานจริงเท่านั้น

หนึ่งโปรเจกต์คือต้นไม้หนึ่งต้น ทั้งทีมดูแลต้นเดียวกัน
ต้นไม้โตได้ 7 ขั้น จากที่ดินว่าง เป็นเมล็ด ต้นกล้า ต้นอ่อน ต้นไม้ ต้นใหญ่ ออกผล จนผลิดอก
แต่ละขั้นคือเควสต์หลักหนึ่งข้อที่พี่เลี้ยงดูงานแล้วยืนยัน ทำขั้นไหนก่อนก็ได้

ต้นไม้ไม่ได้โตจากการกด จากเวลาออนไลน์ หรือจากความเร็ว เพราะสิ่งเหล่านั้นไม่ได้ทำให้มีอะไรเกิดขึ้นจริงในโลก
ต้นไม้โตเมื่อมีของจริงเกิดขึ้น: คนที่คุณคุยด้วย ชิ้นงานที่คนลองได้ สิ่งที่คุณเปลี่ยนเพราะเห็นคนใช้
ของพวกนี้คือสิ่งที่คุณเอาไปใส่พอร์ตได้จริง ต้นไม้แค่ทำให้มันมองเห็นได้

พักนานแค่ไหนก็ได้ ต้นไม้ไม่เหี่ยว ไม่หดเล็กลง

> One project, one tree; the whole team tends the same tree. It grows seven
> stages (empty plot, seed, seedling, sapling, tree, big tree, fruiting,
> flowering), one per main quest a mentor confirms, in any order. It never
> grows from taps, time online or speed, because none of those make anything
> happen in the world. It grows when something real happens: a person you
> talked to, a thing someone can try, a change you made because you watched
> someone use it. That is the portfolio evidence; the tree only makes it
> visible. Rest as long as you need: trees never wilt or shrink.

---

## 3. ลานกลางเกาะ

ลานกลางเกาะคือที่ที่ทุกคนเดินผ่าน มีสี่อย่าง

**กระดานเควสต์** ปักโน้ตเควสต์ถัดไปของคุณไว้ไม่เกินสามใบ งานที่ทำอยู่ก่อน แล้วค่อยเป็นเควสต์ที่เปิดให้ทำ
ไม่มีใครสั่งงานผ่านกระดาน มันแค่จำไว้ให้ว่าคุณค้างอะไรอยู่ และเสนอเควสต์ของตัวเองได้เสมอ

**กองไฟ** คนที่อยู่ในห้องเสียง coworking ของ SHIFT ตอนนี้ จะนั่งรอบกองไฟคนละที่
ไม่มีใครต้องพูด ไม่มีใครจับเวลา แค่ทำงานของตัวเองไปพร้อมกัน เป็นเพื่อนกัน
ไม่มีคนนั่ง กองไฟก็ยังไม่ติด ใครเข้าไปก่อนก็จุดไฟได้

**เวทีเทศกาล (เวที Demo Day)** ค่อยๆ สร้างขึ้นตลอดซีซัน จากหมุดกับไม้กองบนพื้น เป็นพื้นเวที ฉากหลังกับธง จนมีหลังคาและไฟในคืนเทศกาล
เวทีโตตามวันที่ผ่านไป ไม่ได้โตตามว่าใครเก่งกว่าใคร

**สายโคม** แขวนเหนือลาน มีโคมแปดดวง แต่ละดวงติดเมื่อทั้งเกาะเข้าใกล้เป้าหมายร่วมของซีซัน
ไม่มีโคมของใครคนเดียว โคมติดเพราะทุกคนช่วยกัน และสว่างให้ทุกคนเท่ากัน

> **The plaza** is where everyone passes. **The quest board** pins up to three
> of your next quests: what you are doing first, then what is open. Nobody
> assigns work through it; it remembers for you, and you can always propose
> your own quest. **The campfire**: everyone in the SHIFT coworking voice
> channel right now sits around it. Nobody has to talk, nobody is timed;
> builders just work alongside each other. With nobody there the fire is out,
> and whoever joins first lights it. **The festival stage** builds up over the
> season (pegs, deck, backdrop and bunting, then roof and lights on festival
> night); it follows the calendar, never who is ahead. **The lantern string**:
> eight lanterns over the plaza light as the whole island nears its shared
> season goal. No lantern belongs to one person; they light because everyone
> helped, and shine on everyone the same.

---

## 4. ชายหาดและเรือ

รอบเกาะมีชายหาด และมีเรือแล่นผ่านอยู่เรื่อยๆ
เรือคือคนข้างนอก: คนที่จะมาลองของที่คุณทำ เพื่อนต่างห้อง ลูกค้าคนแรก ผู้เล่นที่ไม่รู้จักคุณ
ต้นไม้ที่มีคนแวะมาลองแล้ว (ผ่านเควสต์ 3) จะมีคนยืนอยู่ข้างต้น เพราะงานที่คนจริงได้ลองคืองานที่ออกจากหัวเรามาแล้ว

> The island has a shore and a boat that keeps passing. The boat is the
> outside world: the people who will try what you made, a classmate from
> another room, a first customer, a player who does not know you. A tree that
> real people have tried (main quest 3) gets a visitor standing beside it,
> because work that someone else has tried has left your head.

**ขวด (DRAFT)** ชายหาดคือที่ที่ขวดของจดหมายเชิญมาเกยฝั่ง ขวดมาถึงตอนพลบค่ำ เพราะคนที่ส่งคือคนที่มาก่อน
และคุณขึ้นเกาะตอนรุ่งเช้า เพราะคุณกำลังเริ่ม (ดูหัวข้อ 12) ในตัวเกมยังไม่มีขวด ขวดอยู่ในหน้าเชิญเท่านั้น

> **The bottle (DRAFT).** The shore is where the invite's bottle washed up. It
> arrives at dusk because it was sent by the people who came before; you land
> at dawn because you are starting (section 12). The bottle lives on the
> invite page only, not in the game.

---

## 5. เทศกาลเปิดเกาะ และคืนเทศกาล Demo Day

(DRAFT) ทั้งซีซันคือเทศกาลเปิดเกาะ ตามที่จดหมายเชิญบอกไว้: เริ่มวันเปิดเกาะ และจบที่คืนเทศกาล
ทุกซีซันจบด้วยคืนเทศกาล คือ Demo Day วันที่ทั้งเกาะเอางานจริงมาโชว์ให้คนข้างนอกได้ลอง
ทุกคนมีที่ยืน: มุมงานที่ยังทำอยู่เปิดให้ทุกคน โต๊ะโชว์งานสำหรับต้นที่ถึงเกณฑ์ และเวทีสำหรับต้นที่ไปถึงขั้นที่คนจริงได้ลองแล้ว
เทศกาลไม่ได้มีไว้ตัดสินว่าใครชนะ มันมีไว้ให้งานที่ทำมาสองสัปดาห์ได้เจอคนที่ควรเห็นมัน
มีรางวัลในคืนนั้น (รายละเอียดและจำนวนดูจาก company-brain)

> (DRAFT) The whole season is the island's opening festival, as the invite
> says: it starts on opening day and ends on festival night.
> Every season ends with festival night: Demo Day, when the whole island
> brings real work out for outside people to try. Everyone has a place: the
> work-in-progress corner is open to all, gallery tables for trees past the
> bar, and the stage for trees that real people have already tried. The
> festival is not there to crown a winner; it is where two weeks of work meets
> the people who should see it. There are prizes that night (details and
> amounts from company-brain, never from this page).

---

## 6. คนที่มาก่อน

(DRAFT) พี่เลี้ยงบนเกาะคือคนที่เคยเดินทางนี้มาก่อน ในซีซัน 1 คือพี่เลี้ยงของ PassionSeed และคนที่จบ SHIFT หรือ TechSeed รุ่นก่อน
ตั้งแต่ซีซัน 2 จะมีคนที่เคยปลูกต้นไม้ของตัวเองบนเกาะนี้กลับมาด้วย
เขาไม่ได้มาทำงานแทน เขามาดูงานที่คุณส่ง ยืนยันขั้นที่ทำได้จริง และช่วยตอนติดในห้องที่ทุกคนเห็น
เมื่อซีซันของคุณจบ คุณกลับมาเป็นคนที่มาก่อนให้รุ่นถัดไปได้ นี่คือเหตุผลที่เควสต์ 7 คือการทำให้ชุมชนดีขึ้น
(การกลับมาสอนมีรางวัลใหญ่ ตัวเลขดูจาก company-brain และยังไม่ใส่ในตัวเกม จนกว่าระบบจะเปิดจริง)

> (DRAFT) The mentors on the island are people who walked this path before
> you. In Season 1 that means PassionSeed's mentors and alumni of earlier
> SHIFT and TechSeed rounds, because nobody has grown a tree here yet; from
> Season 2 on, people who grew their own tree here come back too. They never
> do the work for you: they look at what you send, confirm the
> stages that are real, and help when you are stuck, in rooms everyone can
> see. When your season ends you can come back as one of the people who came
> before, for the next round: that is why main quest 7 is about making the
> community better. (Alumni who return to teach earn a large award; the amount
> lives in company-brain and stays out of the game until it is live.)

---

## 7. ซีซัน

(DRAFT) หนึ่งซีซันของเกาะ คือสองสัปดาห์หลังรอบ SHIFT เริ่มเมื่อเกาะเปิด จบที่คืนเทศกาล
ต้นไม้ไม่หายเมื่อซีซันจบ โปรเจกต์จริงไม่ได้หยุดตามปฏิทิน
ซีซันใหม่มาพร้อมคนใหม่ ที่ดินว่างแปลงใหม่ เป้าหมายร่วมใหม่ และสายโคมที่เริ่มนับใหม่

Passioncoin ได้จากความคืบหน้าจริงและสิ่งที่ทำให้ชุมชน ไม่ได้ได้จากจำนวนชั่วโมง
(ในตัวเกมพูดถึงเหรียญเมื่อระบบเปิดเท่านั้น ดู /coins ในบอท)

> (DRAFT) One island season is two weeks after a SHIFT round: it opens with
> the island and ends on festival night. Trees stay when a season ends, because real projects do not stop on a
> calendar. A new season brings new people, new empty plots, a new shared goal
> and a lantern string that starts counting again. Passioncoins come from real
> progress and community value, never from hours (the game mentions coins only
> while the coin system is live; see /coins in the bot).

---

## 8. ชื่อสถานที่

| Thai | English | Where it shows |
|---|---|---|
| เกาะ SHIFT | the island | page title, gate, bot card |
| ที่ดิน / แปลง | plot | "จับจองที่ดิน", "แปลง #3" |
| ลานกลางเกาะ | the plaza | festival sheet heading ("ที่ลานกลางเกาะ") |
| กระดานเควสต์ | the quest board | the notice board and the board sheet |
| กองไฟ | the campfire | the campfire spot and its sheet |
| เวที Demo Day | the festival stage | the stage spot and the festival sheet |
| สายโคม / โคม | the lanterns | the festival sheet's goal line |
| ชายหาด | the shore | the invite's shore scene; lore only in the game |
| คืนเทศกาล | festival night (Demo Day) | story panel 4, bot started card |
| เทศกาลเปิดเกาะ | the opening festival (the whole season) | invite letter and festival line |
| ขวด / ตราประทับ / ตั๋ว | the bottle, the wax seal, the ticket | invite page only |
| ป้าย | a project's sign | "🪧 โชว์ชื่อบนเกาะ" (opt-in, whole team) |

Names are short words students already use. Never invent a proper noun for a
place, and never rename a word the bot and the web already share (กระดานเควสต์,
จับจองที่ดิน, พี่เลี้ยง) without changing both.

---

## 9. เรื่องเล่าตอนเปิดเกาะครั้งแรก (story panels)

(DRAFT, all four lines.) The panels pick up where the invite's ticket leaves
off. Four panels at 3.6 s each, about 15 seconds; the scenes are unchanged.

| # | Scene | Line | Continues from the invite |
|---|---|---|---|
| 1 | empty island at dawn | เจอกันบนเกาะแล้ว ที่ดินยังว่าง รอโปรเจกต์ที่คุณถือมา | answers the ticket "เจอกันบนเกาะ" and prologue 1 "โปรเจกต์จริงหนึ่งชิ้นอยู่ในมือเรา" |
| 2 | a seedling, its builder beside it | ลงแปลงแล้ว โปรเจกต์ได้โตต่อ หลังวันที่ 7 ของ SHIFT | prologue 3 "ต้นไม้ยังโตต่อหลังวันที่ 7"; letter "ลงแปลง" |
| 3 | a grown tree, a visitor trying the work | ต้นไม้โตทีละขั้น เมื่อพี่เลี้ยงเห็นงานที่ทำจริง | prologue 4 "ต้นไม้โตเมื่อพี่เลี้ยงเห็นงานที่ทำจริง" |
| 4 | festival night, lanterns lit | {28 พ.ย.} เทศกาล Demo Day ทั้งเกาะโชว์งาน และต้นไม้ทุกต้นยังอยู่ต่อ | the festival; "ต้นไม้ทุกต้นยังอยู่" is the invite's after-season line |

Panel 4 without a known date: "คืนเทศกาล Demo Day ทั้งเกาะโชว์งาน และต้นไม้ทุกต้นยังอยู่ต่อ".
The date always comes from the season, never from copy. Panel 2 says "ลงแปลง",
not "ปลูก": the house test rejects ลูก inside ปลูก, and ลงแปลง is the invite's word.

> 1 "See you on the island, then: the land is still empty, waiting for the
> project you brought." 2 "Into the plot, and the project keeps growing after
> day 7 of SHIFT." 3 "The tree grows a stage at a time, when a mentor sees
> real work." 4 "28 Nov, the Demo Day festival: the whole island shows its
> work, and every tree stays."

---

## 10. หนึ่งบรรทัดต่อเควสต์ (quest flavor)

One quiet line above the quest's purpose on the quest page. It says why the
quest matters on the island, in the student's world, never how to do it (the
purpose and "เสร็จเมื่อ" already do that).

### เควสต์หลัก

| # | Quest | Flavor | Gloss |
|---|---|---|---|
| 1 | หาเรื่องที่คุ้มค่าจะแก้ | ทุกต้นเริ่มจากเรื่องที่มีคนเจอจริง | Every tree starts from something real people run into. |
| 2 | ทำให้มันมีอยู่จริง | จากไอเดียในหัว เป็นของที่คนอื่นจับต้องได้ | From an idea in your head to something others can hold. |
| 3 | ให้ความจริงทำให้คุณแปลกใจ | คนจริงไม่เคยใช้งานตรงตามที่เราคิดไว้ | Real people never use it quite the way we planned. |
| 4 | ทำให้เขาอยากกลับมา | ครั้งแรกคนลองเพราะอยากรู้ ครั้งที่สองเพราะมันมีค่า | The first try is curiosity; the second is because it was worth it. |
| 5 | ถือกุญแจเอง | กุญแจอยู่ในมือคุณ งานจึงเดินต่อได้หลัง SHIFT จบ | The keys are in your hands, so the work keeps going after SHIFT. |
| 6 | ช่วยเพื่อนให้ไปต่อ | บนเกาะนี้ ไม่มีใครต้องติดอยู่คนเดียว | On this island, nobody has to be stuck alone. |
| 7 | ทำให้ชุมชนดีขึ้น | ทิ้งของดีๆ ไว้ให้คนที่มาทีหลัง | Leave something good for whoever comes next. |

### เควสต์เสริม

| Branches from | Quest | Flavor | Gloss |
|---|---|---|---|
| 1 | ฟังเสียงจริงอีก 5 คน | ห้าเสียงจริง ชัดกว่าการเดาคนเดียว | Five real voices beat guessing alone. |
| 2 (software) | ให้คนอื่นเปิดได้จากมือถือ | งานที่เปิดได้จากลิงก์เดียว ไปถึงคนได้ไกลกว่า | Work that opens from one link reaches further. |
| 2 (software) | เขียนคู่มือให้เพื่อนรันเองได้ | คู่มือที่ดี ทำให้งานเดินต่อได้แม้คุณไม่อยู่ | A good guide keeps the work moving when you are not there. |
| 2 (creative) | ตัวอย่าง 30 วินาที | ถ้าคนเข้าใจใน 30 วินาที เขาจะอยากดูต่อ | If people get it in 30 seconds, they want more. |
| 2 (service) | บอกให้ชัดว่าช่วยอะไร | คนจะเริ่มใช้ เมื่อเข้าใจว่าคุณช่วยอะไรเขา | People start once they see what you help them with. |
| 3 | ให้คนนอกวงเพื่อนลอง | คนนอกวงจะบอกสิ่งที่เพื่อนเกรงใจไม่พูด | Outsiders say what friends are too polite to. |
| 3 | แก้หนึ่งอย่างจากสิ่งที่เห็น | แก้ทีละอย่าง แล้วให้ความจริงตัดสินอีกรอบ | Fix one thing, then let reality judge again. |
| 3 | เตรียมเดโม 3 นาที | คืนเทศกาล มีคนอยากฟังเรื่องงานของคุณ | On festival night, people want to hear about your work. |
| 5 | คู่มือส่งต่อหนึ่งหน้า | งานที่ส่งต่อได้ คืองานที่อยู่ได้นาน | Work that can be handed on is work that lasts. |
| 6 | ช่วยดูงานเพื่อนหนึ่งชิ้น | คำติชมที่ดี ช่วยให้ต้นของเพื่อนโตต่อได้ | Good feedback helps a friend's tree keep growing. |
| 7 | แบ่งสิ่งที่เรียนรู้ให้ทั้งเกาะ | สิ่งที่คุณเพิ่งเรียนรู้ อาจเป็นทางลัดของคนถัดไป | What you just learned may be the next builder's shortcut. |

A proposed quest (the student's own) has no flavor line: its goal is the
student's own words and stands alone.

---

## 11. Where the lore is wired

| Place | File | What changed |
|---|---|---|
| Story panels 1 to 4 | `components/shift/island/story/copy.ts` | the four lines above, continuing from the invite |
| กติกาของเกาะ card | `components/shift/island/copy.ts` (`START.rules`), folded under `STORY.rules` on the start card | the six-line card in section 15 |
| Bot "how the island works" | `bot/src/quests/island/copy.ts` (`I.how`) | the rest rule: a missed day never resets anything |
| Place names | `components/shift/island/copy.ts` (`PLACES`) | one source for the island, plaza, board, campfire and stage names; the campfire sheet is titled กองไฟ; the lantern line names the lanterns |
| Quest flavor | `components/shift/island/copy.ts` (`QUEST_FLAVOR`), shown by `QuestDetailSheet.tsx` | one muted line above the purpose |
| Discord /start | `bot/src/quests/copy.ts` (`T.introBody`, `T.started`) | the intro now continues from the invite (the island is where a SHIFT project keeps growing); the started card keeps the festival line and adds "where this goes" |

Not wired: the bot's island card and quest pages (no room without making them
longer; only the rest rule in "how the island works" changed), the gate, the
rhythm features that are not built yet (section 13), and any prize, coin or
price number.

---

## 12. ทางที่เดินต่อ (DRAFT)

เกาะคือที่ที่ทางของคนสร้างเดินต่อหลัง SHIFT

| ช่วง | เวลาบนเกาะ | เกิดอะไรขึ้น |
|---|---|---|
| ขวด | พลบค่ำ | จบ SHIFT พร้อมโปรเจกต์จริงหนึ่งชิ้น แล้วจดหมายเชิญก็ลอยมาถึง |
| ขึ้นเกาะ | รุ่งเช้า | จับจองที่ดิน ลงแปลง ให้โปรเจกต์ได้โตต่อ |
| ลงมือ | กลางวัน | ให้คนจริงลอง แก้จากสิ่งที่เห็น ช่วยเพื่อนที่ติด |
| คืนเทศกาล | กลางคืน | เอางานออกมาให้คนข้างนอกได้เห็นและได้ลอง |
| ส่งไฟต่อ | พลบค่ำ | ซีซันต่อๆ ไป ถ้าอยากกลับมา คุณช่วยคนที่เพิ่งขึ้นเกาะ และวันหนึ่งเป็นพี่เลี้ยงให้รุ่นถัดไป |

ทุกซีซัน เกาะเก็บต้นไม้ของทุกคนที่เคยสร้างไว้ ปีแล้วปีเล่า เกาะจึงค่อยๆ กลายเป็นบันทึกที่ยังมีชีวิต ของงานจริงที่วัยรุ่นไทยลงมือทำ
คนที่ลงแปลงก่อนยังแวะกลับมา ช่วยส่องทางให้คนที่ตามมา

รุ่งเช้าเป็นของคนที่เพิ่งเริ่ม พลบค่ำเป็นของคนที่กลับมาช่วย
ขวดจึงมาถึงตอนพลบค่ำ เพราะคนที่มาก่อนเป็นคนส่ง ส่วนคุณขึ้นเกาะตอนรุ่งเช้า เพราะคุณกำลังเริ่ม

เกาะไม่สัญญาเรื่องการสอบเข้า เงิน หรือตำแหน่ง ต้นไม้คือหลักฐานของงานที่ทำจริง ไม่มากไม่น้อยกว่านั้น
การกลับมาเป็นทางเลือกเสมอ ไม่ใช่หน้าที่ และบันทึกของเกาะเห็นเป็นต้นไม้ ชื่อขึ้นก็ต่อเมื่อทั้งทีมยินยอม

> **Where this goes.** The island is where a builder's path continues after
> SHIFT. The bottle (dusk): you finish SHIFT with a real project and the
> invite arrives. Landing (dawn): you claim a plot and plant it so it keeps
> living. The work (day): real people try it, you change it, you help a friend
> who is stuck. Festival night: the work meets outside people. Passing the
> torch (dusk): in a later season, if you want to, you come back to help the
> people who just landed, and one day you mentor the next round.
>
> Each season the island keeps the trees of everyone who built there, so
> year by year it becomes a living record of real work by Thai teenagers, and
> the people who planted first keep dropping by to light the way. Dawn belongs
> to those starting, dusk to those who come back to guide: the bottle arrives
> at dusk because the people who came before sent it, and you land at dawn
> because you are starting. This is the Dawn (students) and Dusk (alumni
> mentors) split from `PRODUCT.md`, told as time of day.
>
> The island promises nothing about admissions, money or roles; a tree is
> evidence of real work and that is enough. Coming back is always a choice,
> never a duty. The record shows trees; a name shows only when the whole team
> opts in.

**In the game:** the started card of Discord /start ends with "🌅 ซีซันจบ
ต้นไม้ยังอยู่ วันหนึ่งคุณกลับมาช่วยคนที่เพิ่งขึ้นเกาะได้", story panel 4 ends on
"ต้นไม้ทุกต้นยังอยู่ต่อ", and quest 7's flavor ("ทิ้งของดีๆ ไว้ให้คนที่มาทีหลัง")
already points the same way. There is no fifth "dusk" panel: four panels keep
the story at about 15 seconds.

---

## 13. จังหวะของเกาะ (DRAFT)

### ทุกวัน

| ชื่อบนเกาะ | คืออะไร |
|---|---|
| เปิดเกาะ | เปิด /island ใน Discord หรือหน้าเกาะบนเว็บ |
| วันนี้ทำต่อ | แตะครั้งเดียว บอกว่าวันนี้ลงมือแล้ว ไม่ต้องเขียนอะไร อยากจดก็เพิ่มโน้ตสั้นๆ ที่เห็นแค่คุณ |
| นั่งที่กองไฟ | เข้าห้องเสียง coworking ทำงานของตัวเองข้างๆ คนอื่น ไม่มีใครต้องพูด |
| ภาพเกาะ | โพสต์เกาะของบอทในห้องเกาะ ขยับไปตามวัน: ต้นที่โต โคมที่ติด เวทีที่ขึ้น |
| ข่าวเกาะ | วันละครั้ง สรุปสั้นๆ ว่าทีมที่เลือกเปิดให้เล่าทำอะไรไปบ้าง ทีมที่ไม่เปิดจะไม่อยู่ในข่าว |

### ทุกสัปดาห์

| ชื่อบนเกาะ | คืออะไร |
|---|---|
| สรุปเกาะประจำสัปดาห์ | โพสต์เดียวต่อสัปดาห์ ว่าเกาะเปลี่ยนไปยังไง |
| พี่เลี้ยงดูงาน | พี่เลี้ยงดูงานที่ส่งมา ยืนยันขั้นที่ทำได้จริง หรือบอกว่าทำอะไรต่อดี |
| เล่ารอบกองไฟ | สั้นๆ ไม่กี่ทีมเล่าว่าสัปดาห์นี้อะไรเปลี่ยนไป ทีมงานเป็นคนจัด ทีมเลือกเองว่าจะเล่าไหม |

### ทั้งซีซัน (Season 1: 14 ถึง 28 พ.ย. 2026)

| ช่วง | บนเกาะ |
|---|---|
| วันเปิดเกาะ | เทศกาลเปิดเกาะเริ่ม ดูเรื่องเล่าของเกาะ จับจองที่ดิน ชวนเพื่อนเข้าทีม |
| สัปดาห์แรก | ส่วนใหญ่ทำเควสต์ 1 ถึง 3 (ทำตามลำดับไหนก็ได้) |
| กลางซีซัน | เวทีขึ้นได้ครึ่งทาง ถ้าทั้งเกาะไปได้ตามเป้า โคมจะติดราวครึ่งสาย |
| สัปดาห์ที่สอง | เควสต์ที่เหลือ และเตรียมของที่จะโชว์ |
| คืนเทศกาล (Demo Day) | มุมงานที่ยังทำอยู่ โต๊ะโชว์งาน และเวที รางวัลตัดสินตามเกณฑ์ที่เขียนประกาศไว้ก่อน |
| หลังซีซัน | ต้นไม้อยู่ต่อ โปรเจกต์ทำต่อได้ คนที่อยากกลับมาช่วยรุ่นถัดไปก็กลับมาได้ |

> **Rhythm.** *Daily:* open the island; one tap "วันนี้ทำต่อ" (today I kept
> going), with an optional private note; sit at the campfire (the coworking
> voice channel) and work alongside others; the bot's island post moves
> through the day; once a day, a short island news digest of the teams that
> opted in (teams that did not are never in it). *Weekly:* one island recap
> post; mentors review submitted quests; a short Show and Tell at the
> campfire where a few teams show what changed (staff run it, teams choose to
> take part). *Season* (Season 1, 14 to 28 Nov 2026): opening day starts the
> opening festival (the story, claim a plot, form teams); week 1 is usually
> quests 1 to 3, in any order; mid-season the stage is half built and, if the
> island is on track, the lanterns are about half lit; week 2 the rest and
> what to show; festival night (Demo Day: the work-in-progress corner,
> gallery tables, the stage, prizes judged on criteria written down
> beforehand, details from company-brain); after: trees stay, projects go on,
> and anyone who wants to can come back for the next round.

**Status in code (2026-11-11), for whoever wires this:**

| Beat | In this repo? |
|---|---|
| วันนี้ทำต่อ, campfire, mentor review, quest board, lanterns, stage | built (`shift-high-quests.md`, `shift-high-island-web.md`) |
| สรุปเกาะประจำสัปดาห์ | the weekly island post (`shift_quest_enqueue_island_post`) |
| ภาพเกาะ that updates through the day | not built: the post is weekly today |
| ข่าวเกาะ (AI digest) | not built. Open questions: per-team opt-in, and who checks a draft before it posts, since students are minors and the bot's rule is preview-then-confirm |
| เล่ารอบกองไฟ (Show and Tell) | staff-run, no code |
| Suggestions forum | not in this repo (a Discord forum channel) |

The stage follows the calendar; the lanterns follow the shared goal. So
"half lit at mid-season" describes an island on track, never a deadline.

---

## 14. ธรรมเนียมบนเกาะ (DRAFT)

| ชื่อ | เมื่อไหร่ | เกิดอะไรขึ้น |
|---|---|---|
| ขวดกับตราประทับ | ก่อนซีซัน | ขวดลอยมาเกยฝั่ง เปิดจดหมาย กดตราประทับเพื่อตอบรับ แล้วได้ตั๋ว "เจอกันบนเกาะ" |
| จับจองที่ดิน | วันแรกที่ขึ้นเกาะ | สร้างโปรเจกต์ ได้แปลงของทีม ต้นไม้เริ่มจากที่ดินว่าง |
| จุดกองไฟ | ทุกวัน | คนแรกที่เข้าห้องเสียงคือคนจุดไฟ ไฟติดอยู่ตราบที่ยังมีคนนั่ง |
| ปักเควสต์ | เมื่อเลือกงานถัดไป | ปักโน้ตเควสต์ถัดไปไว้บนกระดาน ไม่เกินสามใบ |
| ขึ้นป้าย | เมื่อทั้งทีมพร้อม | ติดชื่อโปรเจกต์ไว้หน้าแปลง ทั้งทีมต้องยินยอม |
| โคมดวงใหม่ | เมื่อเป้าหมายร่วมของเกาะขยับ | โคมดวงใหม่ติดบนสายโคม เป็นของทุกคนเท่ากัน |
| คืนเทศกาล | วันสุดท้ายของซีซัน | เวทีมีหลังคาและไฟ ทั้งเกาะโชว์งาน |
| ส่งไฟต่อ | ซีซันถัดไป | คนที่เคยลงแปลงกลับมาช่วยสอน ดูงาน และเขียนจดหมายเชิญให้รุ่นถัดไป |

> **Rituals.** The bottle and the seal (the invitation: the bottle washes up,
> you open the letter, press the seal to say yes, and get the ticket). Claiming
> a plot (จับจองที่ดิน: make a project, get the team's plot; the tree starts
> from empty ground). Lighting the campfire (whoever joins the voice channel
> first lights it; it burns while anyone is sitting). Pinning your next quest
> on the board (up to three). Putting up your project's sign (ขึ้นป้าย:
> opt-in, the whole team agrees). A new lantern when the island's shared goal
> moves (it belongs to everyone the same). Festival night (the stage gets its
> roof and lights; the whole island shows its work). Passing the torch
> (ส่งไฟต่อ: people who planted before come back to teach, review, and write
> the next season's invite letter; the last part is a proposal, not a
> decision).

---

## 15. กติกาของเกาะ (DRAFT)

กติกาฉบับเต็ม

1. งานจริงเท่านั้นที่ทำให้ต้นไม้โต พี่เลี้ยงดูงานแล้วยืนยัน ไม่ได้นับจากการกด ชั่วโมง หรือความเร็ว
2. ทำตามลำดับไหนก็ได้ พักได้ทุกเมื่อ ไม่มีอะไรเหี่ยว
3. เกมอาจบอกว่าคุณมาที่เกาะแล้วกี่วัน แต่วันที่ไม่ได้มาไม่ทำให้อะไรหาย ไม่เริ่มนับใหม่ และไม่มีโทษ
4. ไม่มีอันดับ ไม่มีกระดานคะแนน รางวัลคืนเทศกาลตัดสินตามเกณฑ์ที่เขียนไว้ ไม่ได้ดูจากอันดับบนเกาะ
5. ช่วยกันในที่ที่ทุกคนเห็น คุยกันในห้องกลุ่มเท่านั้น ไม่มีแชตส่วนตัวระหว่างผู้ใหญ่กับนักเรียน
6. คุณเลือกเองว่าอะไรเปิดให้คนเห็น ชื่อขึ้นเมื่อทั้งทีมยินยอม และนักเรียนที่อายุยังไม่ถึง 18 ต้องมีผู้ปกครองยินยอมด้วย
7. Passioncoin มาจากความคืบหน้าและสิ่งที่ทำให้ชุมชน ไม่ได้มาจากชั่วโมง
8. มีไอเดียหรือเจอบั๊ก บอกได้ที่ฟอรัมข้อเสนอแนะ

> 1 Only real work grows a tree: a mentor looks at it and confirms; never
> taps, hours or speed. 2 Any order; pause any time; nothing withers. 3 The
> game may show how many days you have shown up, but a missed day never takes
> anything away, never resets a count and is never punished. 4 No ranking, no
> leaderboard; festival-night prizes are judged on written criteria, not on
> anything the island counts. 5 Help happens in the open: group rooms only,
> never a private chat between an adult and a student. 6 You decide what is
> public: names show only with the whole team's opt-in, plus a parent's
> consent for anyone under 18. 7 Passioncoins come from progress and
> community value, never hours (the game names coins only while the coin
> system is live). 8 Ideas and bugs go to the suggestions forum.

### การ์ด "กติกาของเกาะ" (six lines, wired as `START.rules`)

1. 1 โปรเจกต์ = ต้นไม้ 1 ต้น โตได้ 7 ขั้น ทำขั้นไหนก่อนก็ได้
2. ถึงขั้นไหนแล้ว ส่งหลักฐานสั้นๆ พี่เลี้ยงดูงานจริงแล้วยืนยัน ไม่ได้นับจากการกดหรือชั่วโมง
3. พักได้ ต้นไม้ไม่เหี่ยว วันที่ไม่ได้มาไม่ทำให้อะไรหายหรือเริ่มนับใหม่
4. ไม่มีอันดับ ไม่มีกระดานคะแนน
5. ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ
6. ชื่อโปรเจกต์ขึ้นป้ายเมื่อทั้งทีมยินยอมเท่านั้น

Lines 3 and 5 reuse the invite letter's "กติกาบนเกาะ" chapter word for word
("พักได้ ต้นไม้ไม่เหี่ยว", "ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ"), so
the rule a student agreed to in the letter is the rule they find on the
island. Coins (only while live), the parent-consent detail and the
suggestions forum stay out of the card to keep it at six lines.

The card's line 3 leaves out "the game may show how many days" because the
game shows no day count today (`TodayCard.tsx`: "No day counts, streaks or
heatmaps, ever"; the island copy test bans "ติดต่อกัน N วัน"). If a
days-shown-up count ships, change that comment and the house rule in
`components/shift/island/copy.ts` first, then this line. The bot's
"how the island works" rest line (`I.how`) now says the same thing as line 3.

---

## 16. คำเชิญกับเกม: เรื่องเดียวกัน

Where the invite (chapter one, canon) and the game disagreed, and how they
now line up. Invite lines are untouched; suggested invite edits are listed
after the table.

| # | Invite says | Game said | Aligned |
|---|---|---|---|
| 1 | Trees keep growing after day 7; every plot is someone's project | "เกาะนี้ยังว่าง รอคนที่อยากสร้างของจริง" (panel 1) and "เกาะ SHIFT ยังว่าง รอของที่คุณจะสร้าง" (/start): empty because nobody has built | Season 1 is the island's first season, so it is empty at opening and this cohort plants first (section 1). Panel 1 answers the ticket: "เจอกันบนเกาะแล้ว ที่ดินยังว่าง รอโปรเจกต์ที่คุณถือมา". /start now leads with "ที่ที่โปรเจกต์ได้โตต่อหลังวันที่ 7" |
| 2 | "เทศกาลเปิดเกาะ" runs the whole season (festivalLine: "เปิดอยู่ตอนนี้ ถึง 28 พ.ย.") | "คืนเทศกาล Demo Day" is one night at the end | One festival: it opens on opening day and closes on festival night (sections 5 and 13) |
| 3 | You arrive with a real project from SHIFT | The tree starts at the empty plot and quest 1 is "find something worth solving"; NO_PROJECT invites any project you care about | The tree counts what a mentor confirms on the island, so it starts at the empty plot even for a project that is already real. /start says "ปลูกโปรเจกต์ที่ทำมาจาก SHIFT หรือเริ่มเรื่องใหม่". Open question for the founder: can SHIFT evidence count toward quest 1 or 2 when a mentor agrees? |
| 4 | (silent on mentors' origin) | Mentors "once grew their own tree here" | Impossible in Season 1. Season 1 mentors are PassionSeed mentors and earlier SHIFT and TechSeed alumni; island-grown guides start in Season 2 (section 6) |
| 5 | "ถึงคนที่เคยผ่าน SHIFT": the island is for SHIFT alumni | Lore header: "high-school students build real, long-term projects" | Stated once, consistently: SHIFT High is for high-school students who finished SHIFT, continuing that project or starting or joining another (header) |
| 6 | Shore at dusk, bottle | Story opens at dawn | Kept, and given a meaning: the bottle comes at dusk from those who came before; you land at dawn because you are starting (sections 4 and 12) |
| 7 | Chapter "กติกาบนเกาะ" | Fold "กติกาของเกาะ" with four rules incl. "ไม่มีการนับวันต่อเนื่อง" | The card now reuses the letter's two rules word for word; the streak line became the gentle rule (section 15). The titles still differ: see suggestion A |
| 8 | Speaks as "เรา" (a letter from the community) | Speaks to "คุณ" | Left as is: a letter says "we", the game addresses "you". Panel 1's "เจอกันบนเกาะแล้ว" bridges the two |
| 9 | Never says "Demo Day" | "คืนเทศกาล Demo Day"; the home page reserves "demo day" for SHIFT day 7 (`shift-island.ts` header) | Not resolved here: the game keeps "Demo Day" because the bot, web and prizes use it. Founder call: rename the island's night "คืนเทศกาล" only, or accept two Demo Days (SHIFT day 7 and the island's festival night) |
| 10 | "สองสัปดาห์แรกของเกาะ" | Season = "one SHIFT round" | Section 7 now says an island season is two weeks after a SHIFT round |

**Suggested invite edits (not made; `feat/shift-island-invite` is read-only
for this task):**

- A. `LETTER_CHAPTERS` rules title "กติกาบนเกาะ" → "กติกาของเกาะ", the name the
  game's fold uses.
- B. Rules body: add "ไม่มีอันดับ": "พักได้ ต้นไม้ไม่เหี่ยว ไม่มีอันดับ
  ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ".
- C. Festival chapter body: name the ending so the two festivals read as one:
  "สองสัปดาห์แรกของเกาะ ทุกคนลงแปลงพร้อมกัน ช่วยกัน แล้วปิดท้ายด้วยคืนเทศกาล".
- D. Optional, for the vision: a last letter line or ticket subline such as
  "วันหนึ่ง ขวดใบต่อไปอาจมาจากคุณ" (one day the next bottle may come from you),
  matching "ส่งไฟต่อ". Only if the founder adopts that ritual.

---

## 17. Review notes for the Thai pass

- Check "ทำงานเป็นเพื่อนกัน" (campfire) reads as keeping each other company,
  not as making friends.
- Check "คนนอกวงจะบอกสิ่งที่เพื่อนเกรงใจไม่พูด" does not read as criticism of
  the student's friends.
- Codex-style logic check: panel 3 shows a visitor trying the work, but its
  line says the tree grows on a mentor's confirmation; the picture is one
  example of real work, not the only one.

### Lines most likely to read wrong (this revision)

1. Panel 1 "เจอกันบนเกาะแล้ว ที่ดินยังว่าง รอโปรเจกต์ที่คุณถือมา": does "เจอกันบนเกาะแล้ว" read as "so, here we are" (answering the ticket) or as an odd greeting to someone who never saw the invite? Also "ถือมา" for a project.
2. Panel 2 "ลงแปลงแล้ว โปรเจกต์ได้โตต่อ หลังวันที่ 7 ของ SHIFT": is the subject of ลงแปลง clear, and does "ได้โตต่อ" read as a fact, not a promise?
3. Panel 4 "ทั้งเกาะโชว์งาน และต้นไม้ทุกต้นยังอยู่ต่อ": two ideas in one line after a date; check it does not read as if the trees might have been removed.
4. /start "🌅 ซีซันจบ ต้นไม้ยังอยู่ วันหนึ่งคุณกลับมาช่วยคนที่เพิ่งขึ้นเกาะได้": must read as an open door, not an obligation or a recruitment line; check "ได้" at the end carries "you can".
5. Card line 3 "วันที่ไม่ได้มาไม่ทำให้อะไรหายหรือเริ่มนับใหม่": "เริ่มนับใหม่" may make readers wonder what is being counted; Codex-style logic check against "the game may show days shown up".
