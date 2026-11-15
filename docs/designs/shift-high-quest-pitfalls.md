# SHIFT High Island: the pitfall quest map

Status: decided 2026-11-15 by the founder, for Season 1 (14 to 28 Nov 2026).
Replaces the seven starter main quests from
`20261111090500_shift_quests_starter_templates.sql`.

## Why

Most student projects fail before they meet a real person: the target is
"everyone", students are scared to talk to strangers, friends answer with
compliments, and they build alone for weeks. Season 1 restructures the island
around those pitfalls. Each main quest names one pitfall, the warning sign a
student can check on their own, and how to avoid it.

Stakeholder first. A team that has a real partner (a teacher, a shop, a club,
a local organisation) gets access, real data and a reason to keep going: the
project feels like working with a bigger organisation even though they are
students. Building comes after.

## Decisions

- **3 / 3 / 1.** The tree still has seven stages. Act 1 (find your
  stakeholder) is milestones 1 to 3, Act 2 (build what matters) is 4 to 6,
  Act 3 (scale) is 7.
- **Soft order.** Any main quest can be started at any time (no database
  gate). The board groups quests by act, and Act 2 and 3 tiles say
  "แนะนำหลังได้พันธมิตร" until the project has milestone 3 approved.
- **Pitfalls are web copy**, keyed by slug in `components/shift/island/copy.ts`
  (`QUEST_PITFALLS`), shown on the quest page as a "หลุมพราง" block. No schema
  change for them.
- **Old main quests.** `take-the-keys`, `help-another-builder-move` and
  `improve-our-community` come back as side quests with the same copy and no
  milestone, under new slugs: `side-take-the-keys`, `side-help-a-builder`,
  `side-improve-community` (20261111090700 sets milestones by slug, and the
  quest test harness applies every migration twice). All seven version-1 main
  quests are retired. Prod had 0 quest instances when this was decided, so
  nothing in flight is lost. ถือกุญแจเอง keeps the ownership checklist on the
  web: the quest page shows it and the side submit attaches it (the slug comes
  from the caller's board on the server).
- **Icons.** Main quests by milestone: visitor, compass, door, hammer, path,
  book, lantern. No side quest wears one.
- **Community quests.** The ทั้งเกาะ lane holds `side-review-a-friend`,
  `side-help-a-builder` and `side-improve-community`; the last two carry the
  community heart.
- **Safeguarding.** Students are minors and Act 1 sends them to adults they do
  not know. Every Act 1 quest's support line says: tell a parent or teacher
  who you are meeting, meet at school, in a public place, or online with
  someone else present, and never put a real name, phone number or address in
  evidence. Staff introductions happen in the group help channel only, never
  in a DM.

## Main quests

Thai copy is a draft for review (house rules: no em dashes, no น้องๆ, no
ed-tech jargon). "พันธมิตร" is the student-facing word for stakeholder.

### Act 1 · หาคนที่ใช่ (find your stakeholder)

#### 1. `meet-one-real-person` · เจอคนจริงคนแรก

- purpose: เลือกคนหนึ่งคนที่เจอปัญหานี้จริง แล้วไปคุยกับเขา ก่อนเริ่มสร้างอะไร
- flavor: ทุกต้นเริ่มจากคนหนึ่งคนที่เจอปัญหาจริง
- pitfall A, **เป้าหมายคือทุกคน**
  - sign: คุณเรียกผู้ใช้ว่า "นักเรียน" หรือ "คนทั่วไป" และบอกไม่ได้ว่าจะเจอเขาที่ไหนในสัปดาห์นี้
  - avoid: บอกให้ได้ว่าเขาเป็นใคร อยู่ที่ไหน เจอได้เมื่อไหร่ เช่น "แม่ค้าข้าวมันไก่หน้าโรงเรียนที่ขายถึงสองทุ่ม"
- pitfall B, **กลัวเจอคนจริง**
  - sign: ส่งแบบฟอร์มไปแล้วแต่ยังไม่ได้คุยกับใคร หรือคิดว่า "ทำเสร็จก่อนค่อยไปให้ดู"
  - avoid: เริ่มจากคนที่อยู่ห่างคุณแค่ก้าวเดียว เช่น ครู ร้านของญาติ รุ่นพี่ ชวนเพื่อนไปด้วย เตรียม 3 คำถาม แล้วคุยแค่ 10 นาที
- examples:
  - ไม่ใช่ "นักเรียน" แต่เป็น "นักเรียน ม.6 ที่อ่านหนังสือสอบคนเดียวตอนดึก"
  - คุยกับบรรณารักษ์โรงเรียน 15 นาที เรื่องที่นักเรียนหาหนังสือไม่เจอ
- evidence_criteria: สรุปแบบไม่ระบุตัวตนว่าเขาเป็นใคร (บอกแค่บทบาท เช่น "แม่ค้าหน้าโรงเรียน") คุยกันที่ไหน นานแค่ไหน และเขาเล่าอะไรที่คุณไม่เคยรู้ ห้ามใส่ชื่อจริง เบอร์โทร หรือที่อยู่
- reflection_prompt: ก่อนคุย คุณกลัวอะไร แล้วมันเกิดขึ้นจริงไหม
- support_options: ให้พี่เลี้ยงช่วยดูคำถามก่อนไปคุย หรือขอให้พี่ช่วยแนะนำคนที่น่าคุยด้วยในห้อง help ก่อนไปเจอใคร บอกพ่อแม่หรือครูว่าจะไปคุยกับใคร และนัดที่โรงเรียน ที่สาธารณะ หรือคุยออนไลน์โดยมีคนอื่นอยู่ด้วย
- canvas: zones `target`, `interview`, `problem`. Checklist:
  - ชี้ตัวได้ว่าเป็นใคร เจอที่ไหน (hint: `target` written)
  - คุยกับเขาจริงอย่างน้อย 10 นาที (hint: `interview` ≥ 1)
  - จดสิ่งที่เขาเล่าที่คุณไม่เคยรู้ (no hint)

#### 2. `real-stories-not-compliments` · ฟังเรื่องจริง ไม่ใช่คำชม

- purpose: คุยกับคนที่เจอปัญหานี้อีกอย่างน้อย 3 คน แล้วฟังเรื่องที่เกิดขึ้นจริง ไม่ใช่ความเห็นต่อไอเดียของคุณ
- flavor: คำชมฟังแล้วชื่นใจ แต่เรื่องจริงพาไปถูกทาง
- pitfall, **กับดักคำชม**
  - sign: ได้ยินแค่ "ดีนะ" "น่าสนใจ" "ใช้แน่นอน" คุณพูดมากกว่าเขา หรือยังไม่มีใครเล่าว่าครั้งล่าสุดที่เจอปัญหานี้เกิดอะไรขึ้น
  - avoid: ถามถึงครั้งล่าสุดที่มันเกิดขึ้นจริง เขาทำยังไง เสียอะไรไปบ้าง เก็บไอเดียของคุณไว้เล่าตอนท้าย
- examples:
  - แทนที่จะถาม "ถ้ามีแอปนี้จะใช้ไหม" ให้ถาม "ครั้งล่าสุดที่ลืมส่งงาน เกิดอะไรขึ้น"
  - คุยกับเจ้าของร้าน 3 ร้าน แล้วพบว่าปัญหาจริงไม่ใช่ลูกค้าน้อย แต่คือเตรียมของไม่ทัน
- evidence_criteria: สรุปแบบไม่ระบุตัวตนว่าคุยกับใครบ้าง (บอกแค่บทบาท) เรื่องจริงหนึ่งเรื่องที่เขาเล่า และสิ่งที่คุณเคยเชื่อแต่ตอนนี้ไม่แน่ใจแล้ว
- reflection_prompt: เรื่องไหนที่ทำให้คุณเปลี่ยนความคิด
- support_options: ซ้อมคุยกับเพื่อนบนเกาะก่อนได้ที่กองไฟ หรือให้พี่เลี้ยงช่วยดูว่าคำถามของคุณชวนให้เขาชม หรือชวนให้เขาเล่าเรื่องจริง ก่อนไปเจอใคร บอกพ่อแม่หรือครู และนัดในที่ที่มีคนอื่นอยู่ด้วย
- canvas: zones `interview`, `problem`, `pivot`. Checklist:
  - คุยครบอย่างน้อย 3 คน (hint: `interview` ≥ 3)
  - มีเรื่องจริงหนึ่งเรื่อง: ครั้งล่าสุดที่มันเกิดขึ้น (no hint)
  - บอกสิ่งที่เคยเชื่อแต่ตอนนี้ไม่แน่ใจ (hint: `problem` v2 or `pivot` ≥ 1)

#### 3. `first-partner` · ได้พันธมิตรคนแรก

- purpose: ชวนคนที่เกี่ยวกับปัญหานี้มาเป็นพันธมิตร ให้เขาตกลงทำขั้นต่อไปกับคุณ โดยมีวันที่ชัดเจน
- flavor: มีพันธมิตรหนึ่งคน งานของคุณก็มีที่ยืนในโลกจริง
- pitfall, **เยสแบบสุภาพ**
  - sign: เขาบอกว่า "ดีนะ ส่งมาดูได้" แต่ไม่มีวันนัดถัดไป หรือคุณยังไม่ได้ทักเขาอีกเลยหลังคุยครั้งแรก
  - avoid: ขอสิ่งเล็กแต่ชัด เช่น นัดลองชิ้นแรกสัปดาห์หน้า ขอดูข้อมูลหรือตัวอย่างจริง ขอให้แนะนำคนอีก 2 คน หรือขอลองในร้าน ชมรม หรือห้องเรียนของเขา แล้วทักกลับภายใน 2 วัน
- examples:
  - ครูแนะแนวตกลงให้ลองเครื่องมือกับนักเรียน ม.6 หนึ่งห้อง วันศุกร์หน้า
  - ร้านข้าวหน้าโรงเรียนให้ลองระบบสั่งล่วงหน้าหนึ่งสัปดาห์
- evidence_criteria: พันธมิตรเป็นใคร (บอกแค่บทบาท เช่น "ครูที่ปรึกษาชมรมดนตรี" หรือ "ร้านกาแฟแถวโรงเรียน") เขาตกลงทำอะไร วันไหน และเขาได้อะไรจากการช่วยคุณ ห้ามใส่ชื่อจริงหรือช่องทางติดต่อ
- reflection_prompt: ทำไมเขาถึงยอมช่วย
- support_options: ยังหาพันธมิตรไม่เจอ ขอให้พี่ช่วยแนะนำคนในเครือข่าย SHIFT ได้ในห้อง help (พี่แนะนำในห้องรวมเท่านั้น) ก่อนเจอผู้ใหญ่ที่ไม่รู้จัก บอกพ่อแม่หรือครู และนัดในที่ที่มีคนอื่นอยู่ด้วย
- canvas: zones `target`, `interview`. Checklist (no hints):
  - พันธมิตรตกลงทำขั้นต่อไปกับคุณ
  - มีวันที่ชัดเจน
  - บอกได้ว่าเขาได้อะไรจากการช่วยคุณ

### Act 2 · สร้างสิ่งที่สำคัญ (build what matters)

#### 4. `in-their-hands` · ส่งชิ้นแรกถึงมือเขา

- purpose: สร้างชิ้นเล็กที่สุดที่แก้เรื่องหนึ่งเรื่องที่พันธมิตรหรือผู้ใช้เล่าให้ฟัง แล้วให้เขาลองภายใน 7 วัน
- flavor: จากเรื่องที่เขาเล่า เป็นของที่เขาจับได้
- pitfall, **สร้างในถ้ำ**
  - sign: ผ่านไปเกิน 7 วันแล้วยังไม่มีใครได้ลอง หรือรายการฟีเจอร์ยาวขึ้นเรื่อยๆ ทั้งที่ยังไม่มีใครขอ
  - avoid: ตัดให้เหลือเรื่องเดียวที่เขาเล่า ให้เขาลองเองต่อหน้าคุณ แล้วดูโดยไม่ช่วยอธิบาย
- examples:
  - ซอฟต์แวร์: หน้าเว็บที่ทำได้อย่างเดียว แต่ทำเรื่องที่เขาเล่าได้จริง
  - งานสร้างสรรค์: ฉากเดียว หรือเพลงท่อนเดียว ให้คนที่เขาพูดถึงลองดู
  - บริการ: ลองให้บริการจริงหนึ่งครั้งกับพันธมิตร
- evidence_criteria: ลิงก์หรือคำอธิบายชิ้นงาน ใครลอง (บอกแค่บทบาท) และคุณเห็นอะไรตอนเขาลอง
- reflection_prompt: อะไรที่คุณตัดทิ้ง และทำไม
- support_options: นั่งทำด้วยกันที่กองไฟ หรือให้เพื่อนในห้อง help ช่วยดูว่าตัดได้อีกไหม
- canvas: zones `idea`, `ship`, `test`. Checklist:
  - ชิ้นงานแก้เรื่องที่เขาเล่า (hint: `idea` written)
  - มีของที่ลองได้จริง (hint: `ship` written)
  - เขาลองแล้ว และคุณดูอยู่ (hint: `test` ≥ 1)

#### 5. `run-the-loop` · วนรอบ: ฟัง แก้ ลองใหม่

- purpose: เลือกปัญหาที่เห็นบ่อยที่สุดตอนเขาลอง แก้มัน แล้วให้คนเดิมลองอีกครั้ง ทำอย่างน้อย 2 รอบ
- flavor: แก้ทีละอย่าง แล้วให้ความจริงตัดสินอีกรอบ
- pitfall, **ปกป้องงาน หรือแก้ทุกอย่าง**
  - sign: คุณเถียงกับคำติ หรืองานรอบใหม่เปลี่ยนไปสิบอย่าง แต่ไม่มีข้อไหนที่เขาเจอจริง
  - avoid: แก้ทีละเรื่อง เริ่มจากเรื่องที่เห็นซ้ำที่สุด แล้วดูก่อนกับหลัง ผลที่ไม่ดีขึ้นก็นับ
- examples:
  - รอบแรกคนหาปุ่มสั่งไม่เจอ ย้ายปุ่ม รอบสองทุกคนกดได้ใน 10 วินาที
  - ท่อนแรกของเพลงยาวไป คนข้าม ตัดเหลือครึ่ง แล้วเปิดให้คนเดิมฟังอีกครั้ง
- evidence_criteria: อย่างน้อย 2 รอบ: ก่อนแก้เป็นยังไง แก้อะไร หลังแก้เป็นยังไง เช่น ใช้เวลาน้อยลงไหม หรือติดน้อยลงไหม
- reflection_prompt: คำติข้อไหนที่ตอนแรกไม่อยากเชื่อ แต่กลับเป็นเรื่องจริง
- support_options: ถ้าเลือกไม่ได้ว่าจะแก้อะไรก่อน ถามพี่เลี้ยงในห้อง help
- canvas: zones `test`, `pivot`, `ship`. Checklist:
  - ลองกับคนจริงอย่างน้อย 2 รอบ (hint: `test` ≥ 2)
  - บอกว่าแก้อะไรในแต่ละรอบ (hint: `pivot` ≥ 1 or `ship` v2)
  - ผลก่อนและหลังแก้ (no hint)

#### 6. `what-we-learned` · สรุปสิ่งที่ได้เรียนรู้

- purpose: เขียนสรุปสั้นๆ ว่าคุณเคยเชื่ออะไร เจออะไรจริง และจะทำอะไรต่อ แล้วเล่าให้พันธมิตรหรือเพื่อนบนเกาะฟัง
- flavor: รากที่ลึก มาจากการหยุดคิดว่าได้เรียนรู้อะไร
- pitfall, **ทำไปเรื่อยๆ โดยไม่หยุดคิด**
  - sign: ตอบไม่ได้ว่าสัปดาห์นี้รู้อะไรเพิ่ม หรือแผนยังเหมือนวันแรกทุกอย่าง
  - avoid: หยุด 20 นาที เขียน 3 บรรทัด: เคยเชื่อ เจอจริง จะทำต่อ แล้วเล่าให้คนหนึ่งคนฟัง
- examples:
  - เคยเชื่อว่านักเรียนไม่มีเวลา เจอว่าจริงๆ ไม่รู้ว่าจะเริ่มตรงไหน ต่อไปจะทำแค่หน้าแรกให้ชัด
  - เล่าให้พันธมิตรฟัง แล้วเขาแนะนำคนที่ควรคุยต่อ
- evidence_criteria: สามบรรทัด: เคยเชื่อว่า... เจอว่าจริงๆ แล้ว... ต่อไปจะ... และบอกว่าเล่าให้ใครฟังแล้ว (บอกแค่บทบาท)
- reflection_prompt: ถ้าเริ่มใหม่วันนี้ คุณจะทำอะไรต่างไป
- support_options: เล่าในห้องรวมของเกาะ หรือแบ่งให้ทั้งเกาะด้วยเควสต์ "แบ่งสิ่งที่เรียนรู้ให้ทั้งเกาะ"
- canvas: zones `pivot`, `problem`. Checklist (no hints): เคยเชื่ออะไร / เจออะไรจริง / จะทำอะไรต่อ

### Act 3 · ขยาย (scale)

#### 7. `beyond-the-first` · ไปไกลกว่าคนแรก

- purpose: ให้คนที่ไม่รู้จักคุณใช้งานของคุณได้เอง โดยที่คุณไม่ต้องยืนอธิบาย
- flavor: ต้นไม้ที่โตแล้ว ให้ร่มกับคนที่ไม่เคยรู้จักคุณ
- pitfall, **ใช้ได้แค่ตอนคุณอยู่**
  - sign: ทุกคนที่ใช้รู้จักคุณ หรือต้องให้คุณอธิบายก่อนทุกครั้ง
  - avoid: ส่งลิงก์หรือของให้คนกลุ่มใหม่ที่ไม่เคยคุยกับคุณ แล้วดูว่าเขาเริ่มเองได้ไหม และมีใครกลับมาเองไหม
- examples:
  - ส่งลิงก์ให้ชมรมอื่นในโรงเรียน แล้วดูว่ามีใครใช้จบโดยไม่ถามคุณ
  - พันธมิตรแนะนำร้านที่สอง และร้านนั้นเริ่มใช้เองได้
- evidence_criteria: กี่คนที่ใช้เองโดยคุณไม่ได้อธิบาย (บอกแค่บทบาท) เขาติดตรงไหน และมีใครกลับมาใช้อีกไหม
- reflection_prompt: อะไรที่ยังต้องมีคุณอยู่ งานถึงจะเดินได้
- support_options: ขอให้พี่ช่วยแนะนำกลุ่มใหม่ในเครือข่าย SHIFT ได้ในห้อง help หรือเช็กว่าคุณถือกุญแจโปรเจกต์เองได้ ด้วยเควสต์ "ถือกุญแจเอง"
- canvas: zones `test`, `ship`. Checklist (no hints): มีคนนอกวงใช้เองได้ / จดว่าเขาติดตรงไหน / ดูว่ามีใครกลับมาเองไหม

## Side quests

New, published, open any time (`requires_milestones` empty), all routes:

| slug | title | purpose | evidence |
|---|---|---|---|
| `side-stakeholder-map` | แผนที่คนรอบปัญหา | เขียนว่าใครใช้ ใครจ่าย ใครตัดสินใจ และใครอาจขวาง แล้ววงคนที่ควรคุยก่อน | แผนที่ (บอกแค่บทบาท) และเหตุผลที่เลือกคนแรก |
| `side-practice-talk` | ซ้อมคุยกับเพื่อนบนเกาะ | ซ้อมคุย 10 นาทีกับเพื่อนบนเกาะ ให้เขาเล่นเป็นคนที่คุณจะไปคุยด้วย แล้วสลับกัน | ซ้อมกับใคร (บอกแค่บทบาท) คำถามไหนได้เรื่องจริง คำถามไหนได้แต่คำชม |
| `side-question-check` | ให้พี่ช่วยดูคำถาม | เขียน 3 คำถามที่จะใช้คุย แล้วให้พี่เลี้ยงช่วยดูในห้อง help ก่อนไปคุยจริง | 3 คำถามก่อนและหลังแก้ |
| `side-warm-intro` | ขอให้พี่ช่วยแนะนำ | บอกพี่เลี้ยงในห้อง help ว่าอยากคุยกับคนแบบไหน และทำไม พี่จะช่วยหาคนในเครือข่าย SHIFT แล้วแนะนำในห้องรวม | ขอคนแบบไหน ได้คุยกับใคร (บอกแค่บทบาท) และได้อะไร |

Old main quests, now side quests (new slugs, version 1, no milestone,
published, open any time), same copy as before:

| slug | was | branch_of | icon |
|---|---|---|---|
| `side-take-the-keys` | `take-the-keys` (main 5) | 7 | key |
| `side-help-a-builder` | `help-another-builder-move` (main 6) | null | heart |
| `side-improve-community` | `improve-our-community` (main 7) | null | link |

The four new side quests hang off: stakeholder map and question check 1,
practice talk 2, warm intro 3.

Drafts from `20261111090900` keep their status; their `requires_milestones`
and `branch_of` point at the new milestones (absolute values, so the
migration can run twice):

| slug | requires_milestones | branch_of |
|---|---|---|
| side-five-voices | {1} | 1 |
| side-open-on-phone, side-readme, side-thirty-second-cut, side-clear-offer | {4} | 4 |
| side-outside-circle | {4} | 4 |
| side-demo-three-minutes | {4} | 4 |
| side-share-a-lesson | {6} | 6 |
| side-handoff-page | {} | 7 |
| side-review-a-friend | {} | null |

`side-fix-one-thing` is retired: quest 5 does the same thing.
(`side-outside-circle` branches off 4, not 7: a side quest that needs a main
quest hangs off one of the quests it needs, a rule the board tests check.)

## The quest page (2026-11-15, founder feedback)

After the founder used the live page: "10x the quest page", icons for
หลุมพราง, a picture beside every hint, buttons in the island's colours, and
the canvas not leading the first quest.

- **Write or show first.** The sticky bar's main action is เขียนหรือแนบงาน on
  every quest and opens the written form (a line, a link, evidence text). The
  canvas quest card is one tap away inside it (ใช้โน้ตจากแคนวาส) when the
  team's notes are ready; the page never waits for the canvas.
- **The canvas is a reference, never a gate.** Every quest shows the team's
  relevant notes when a canvas is linked, an open-canvas link, or one quiet
  row (แคนวาสของทีม, ไม่บังคับ) to link one.
- **Order on the page:** the quest's picture with its chips and a seven-cell
  stage meter grouped by act; the purpose and lore line; mentor feedback;
  ปัญหาที่ทีมเลือก (first act); หลุมพราง; เสร็จเมื่อ with who checks; examples
  (open); ตัวช่วย; the canvas; the remaining details (collapsed).
- **Pictures.** Each pitfall has its own pixel icon (`icon` in
  `QUEST_PITFALLS`); the sign row has an eye and the avoid row a signpost.
  Checklist items, examples (by route) and helper rows carry icons from
  `components/shift/island/questArt.ts`. Fourteen new 16x16 icons in
  `sprites.ts` use only the island palette.
- **The team's problem.** Planting now asks ทีมอยากแก้ปัญหาอะไร ให้ใคร
  (web seed sheet, Discord modal, NoProject's optional line), still saved as
  the project's ambition. The first act's main quests show it as
  ปัญหาที่ทีมเลือก, or a way to the team's tree when nothing is planted.
- **ตัวช่วย.** The side quests that branch off a main quest, each opening in
  the same sheet, and on the first act the safety line (tell a parent or
  teacher, meet where other people are).
- **Who checks.** One line under เสร็จเมื่อ (`WhoChecks`, `data-slot="who-checks"`)
  says พี่เลี้ยงตรวจ. How a peer check and a mentor check work is still being
  decided and comes as its own change; it replaces that line's words.
- **No blue.** Interactive colour is leaf (`--action` #3b6a48, `--action-soft`
  #9fd19a); the primary button is a leaf pixel slab on top of
  `ei-button-dawn`'s motion; in-progress stamps and chips are a warm apricot.
  Gold stays the keynote's alone.

## Show work and peer check (2026-11-15, founder decision)

The founder decided how students show work and who checks it:

- **Show work** by writing it (the written form), a photo or screenshot, or a
  canvas notes card. Links stay as they are.
- **Peer check is feedback only.** Another island student (never the
  submitter, never someone on the submitter's project) ticks the done-when
  items they think are met and leaves one line. A mentor still approves, and
  only a mentor's approval grows the tree. Built in its own change
  (20261115140000, schema 15).

### Photos (20261115130000, schema 14)

- Up to 3 photos per submission revision, added by the student who submitted
  it while it waits for a mentor (pending, latest revision). They can take one
  back, or add more, until a mentor decides; that is also how a photo that
  failed during the send gets another try (รูปที่แนบ on the quest page).
- **Privacy (students are minors).** The browser shrinks every pick to
  1600 px and re-encodes JPEG; the server decodes and re-encodes again to WebP
  with sharp and keeps no metadata (no EXIF, no GPS). The original bytes are
  never stored. The rules sit above the picker: no faces, no real names, no
  phone numbers or addresses; crop screenshots.
- **Storage.** A private bucket, `shift-quest-evidence`, made by
  `20261115130100_shift_island_evidence_bucket.sql` (a restrictive guard keeps
  anon and authenticated out even if a broad policy is added later). The
  website reads and writes it with the service role only, after the quest
  database says yes, and shows photos through 10-minute signed links. Paths
  are `<submission>/<photo>.webp`, chosen by the database.
- **Who sees them:** the submitter, teammates when the submission is
  team-visible (the website's own submits are reviewers-only), reviewers and
  admins, and from schema 15 the peers allowed to check that submission.
- **Mentors** see a photo count on the Discord review card and a link button
  to `/shift/island/review/<submission>`, a reviewers-only web page with the
  submission and its photos. Decisions stay in Discord.
- **Deletion.** Every photo row that goes (taken back, an admin erase, a
  deleted submission, the admin self-reset of PR #298 deleting submissions)
  queues its object in `shift_quest_storage_trash` by trigger; the daily job
  `/api/cron/shift-island-trash` deletes the objects and clears the queue.
  The data export lists the member's photos (size and when, never the image).
- **The team's problem, changed later.** `shift_quest_project_set_ambition`
  lets any active teammate rewrite ปัญหาที่ทีมเลือก. The quest page and the
  team's tree show เปลี่ยน, with the line "changing it is normal".

### Peer check (20261115140000, schema 15)

- **Feedback only.** A peer ticks the done-when items they think are met
  (the quest page's own checklist for main quests, else the quest's criteria
  lines) and leaves one line of up to 280 characters. The sheet says a
  mentor makes the final call; only a mentor's approval grows the tree.
- **Who is a peer:** an onboarded student who is not staff, not the
  submitter, and not conflicted with the quest the way a reviewer would be
  (its project in any status, a contribution, or any project shared with its
  owner). One check per peer per revision, ten a Bangkok day.
- **What a peer sees:** the quest, the work and its photos. Never the
  submitter's name or team.
- **Opt-in by the submitter.** The written form has a tick, on by default:
  ให้เพื่อนบนเกาะช่วยเช็กงานนี้. Only opened, pending, latest revisions are
  checkable, and only when the submitter's consent allows it
  (`shift_quest__consent_ok`): with consent required, a student without
  consent on file is never in anyone's queue.
- **Who reads the checks:** the submitter and the quest project's active
  teammates (เพื่อนเช็กแล้ว on the quest page), and reviewers and admins (the
  web review page, where they can hide a check; hidden checks disappear for
  the team). A peer's name shows only with that peer's consent on file;
  otherwise เพื่อนบนเกาะ. Group-visible only: nothing is posted publicly and
  no private channel opens between anyone.
- **Where:** ช่วยเพื่อนเช็ก at the top of the quest board opens the queue
  (oldest first, 20 at most); the Discord review card counts peer checks and
  links to the web review page. The who-checks line reads เพื่อนช่วยเช็ก
  พี่เลี้ยงตัดสิน.
- Export lists the checks a member wrote; erasure deletes them.

## Open items

- **Economy (DRAFT, coins off).** The community gate and counts now key on
  the two community side quests' slugs (`shift_quest__community_done`,
  `shift_quest_character`, `shift_quest_wallet`, replaced in the same
  migration; `COMMUNITY_RULE_SLUGS` in `lib/content/shift-island-economy.ts`).
  An approved main quest 6 or 7 no longer opens the gate. The draft main-quest
  rule now covers all seven main quests (cap still 5); the amounts and cap are
  the founder's to confirm before coins switch on.
- **Changing the team's problem later.** Done in 20261115130000 (schema
  14): เปลี่ยน on the quest page and the team's tree.
- **Photos and the canvas card.** Photos go with the written form only; the
  canvas quest card sends notes, not photos. A student who wants both sends
  the card, then adds photos from รูปที่แนบ while it waits.
- **Peer checks and ช่วยเพื่อนให้ไปต่อ.** Checking peers does not count
  toward the side quest `side-help-a-builder` yet: that quest is reviewed by
  a mentor from the student's own account of the help, and counting checks
  would need a rule for what "helped" means (a mentor's say, a minimum
  number, the peer's line). Founder's call.
- **Peer check notifications.** The submitter sees checks on the quest page
  only; no Discord notice is sent yet (it would need a new inbox kind and its
  bot copy).
- **Thai review.** The copy here is a draft: run the three-reviewer pass in
  AGENTS.md before Season 2.

## Today's island goal (no code)

The season goal already fits "set a goal together, put it on the island":

```
/admin season name:"Season 1" goal_milestone:3 goal_target:<N> goal_deadline:2026-11-21 goal_unlock:"<what the island unlocks>"
```

N is the number of teams the room agrees on. The unlock is a founder decision.
