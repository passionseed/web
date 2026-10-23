# SHIFT[3] posting plan, 24 Oct to 15 Nov 2026

Facts (from `SHIFT_COHORT_3` in `lib/content/shift-cohort.ts`, do not retype elsewhere):
฿690 per student, ฿590 each for a pair, 30 seats, Mon 9 to Sun 15 Nov 2026,
live on Discord every evening 19:00–21:00, applications close Sat 7 Nov,
apply link passionseed.org/shift/3.

All times Bangkok (+07:00). All file paths are relative to the worktree root
and sit under `output/marketing/2026-10-23/`.

## Who posts what

| Channel | How | Source |
|---|---|---|
| X (@PassionSeed_th) | **Auto-scheduled** with the `social-publish` skill (X's own scheduler) | `PUBLISH_PLAN` in `lib/marketing/sets/publishPlan.ts`, text in `lib/marketing/sets/shift3-x.ts` |
| LinkedIn (founder profile) | **Auto-scheduled** with the `social-publish` skill (LinkedIn's own scheduler) | `PUBLISH_PLAN`, text in `lib/marketing/sets/shift3-linkedin.ts` |
| IG feed carousels | **By hand** in Instagram (schedule in Meta Business Suite) | PNG folders below, caption in each folder's `caption.txt` |
| IG Stories | **By hand**, stickers placed in the app on the empty glass slot | `shift3-stories/`, sticker notes on `/shift/poster/3/stories` |
| LINE OA | **By hand** in LINE OA Manager | `shift3-banner/shift3-banner-square.png` |
| X header, LinkedIn cover | **By hand** in each profile's settings | `shift3-banner/` |

To schedule the auto channels: run the `social-publish` skill against
`PUBLISH_PLAN`; it only schedules slots from 24 Oct onward that are not live yet.

## Before anything goes out

No content blockers. The date poster now derives 9 to 15 Nov from
`SHIFT_COHORT_3`, and every Price slide follows `lib/content/shift-refund.ts`.
Upload the X and LinkedIn banners once to confirm the avatar safe areas.

## Calendar

Legend: [AUTO] scheduled by social-publish. [HAND] posted by a person.

### Week 1: launch

**Sat 24 Oct (launch day)**
- 09:00 [HAND] Swap banners to SHIFT[3]:
  - X header: `shift3-banner/shift3-banner-x.png` (1500x500)
  - LinkedIn cover: `shift3-banner/shift3-banner-li.png` (1584x396)
  - LINE OA rich message / cover: `shift3-banner/shift3-banner-square.png` (1040x1040), linked to passionseed.org/shift/3
- 10:00 [HAND] IG feed carousel, launch: slide 1 `shift3-launch-poster/shift3-launch-feed.png`, then `shift3-launch/02.png` to `07.png`. Caption: Launch (below).
- 10:05 [HAND] IG Story: `shift3-launch-poster/shift3-launch-story.png`. Link sticker over the apply card at the bottom: passionseed.org/shift/3?utm_source=ig-story, sticker text "สมัคร SHIFT[3]".
- 12:15 [AUTO] X `x-shift3-launch` (images from shift3-launch slides 2, 3, 6, 7)
- 18:00 [HAND] LINE OA broadcast: `shift3-banner/shift3-banner-square.png` + text: "SHIFT[3] เปิดรับสมัครแล้ว 7 เย็น ลงมือสร้างของจริง แล้วชวนคนนอกมาลองใช้ พร้อมพอร์ต 1 หน้า จ. 9 ถึง อา. 15 พ.ย. ฿690 รับ 30 คน ปิดรับ ส. 7 พ.ย. สมัครที่ passionseed.org/shift/3"

**Sun 25 Oct**
- 19:30 [HAND] IG Story `shift3-stories/shift3-story-open.png`. Link sticker: https://passionseed.org/shift/3?utm_source=ig-story, text "สมัคร SHIFT[3]".
- 20:00 [AUTO] X `x-shift3-proof`

**Mon 26 Oct**
- 08:30 [AUTO] LinkedIn `li-post-three-rounds` (attaches the `li-three-rounds` PDF: `li-three-rounds/li-three-rounds.pdf`, preview `li-three-rounds/01.png` to `07.png`)
- 18:00 [HAND] IG feed carousel `guide-pick-a-problem/01.png` to `07.png`. Caption: Guide, pick a problem.
- 20:00 [AUTO] X `x-shift3-pick-a-problem`

**Tue 27 Oct**
- 12:15 [AUTO] X `x-shift3-pair`
- 18:00 [HAND] IG feed carousel `shift3-proof/01.png` to `08.png`. Caption: Proof.
- 20:30 [HAND] IG Stories, back to back:
  1. `shift3-stories/shift3-story-poll.png`. Poll sticker, question left blank (the sheet asks it), options in this order: ไม่มีไอเดีย / ไม่กล้าคุยกับคนแปลกหน้า / เขียนโค้ดไม่เป็น
  2. `shift3-stories/shift3-story-answer.png` right after. Link sticker: apply link (utm ig-story), text "สมัคร SHIFT[3]".

**Wed 28 Oct**
- 20:00 [AUTO] X `x-shift3-no-code`
- [HAND] IG feed single image `shift3-date/shift3-poster-1.png` (save-the-date).

**Thu 29 Oct**
- 08:30 [AUTO] LinkedIn `li-post-interview-fear` (Thai, for teachers and parents)
- 18:00 [HAND] IG feed carousel `shift3-parents/01.png` to `08.png`. Caption: Parents.
- 20:00 [AUTO] X `x-shift3-ai-in-thai`

**Fri 30 Oct**
- 20:00 [AUTO] X `x-shift3-parents`
- [HAND] LINE OA: forward the parents carousel (`shift3-parents/01.png`, `02.png`, `06.png`) to the parents list with "คำตอบสั้นๆ สำหรับผู้ปกครอง SHIFT[3] อ่านต่อที่ passionseed.org/shift/3"

**Sat 31 Oct**
- 11:00 [HAND] IG feed carousel `shift3-objections/01.png` to `08.png`. Caption: Objections.

### Week 2: guides, pair push, close

**Sun 1 Nov**
- 18:00 [HAND] IG feed carousel `guide-interview-story/01.png` to `07.png`. Caption: Guide, interview story.
- 20:00 [AUTO] X `x-shift3-interview-story`

**Mon 2 Nov**
- 12:15 [AUTO] X `x-shift3-busy`
- 19:30 [HAND] IG Story `shift3-stories/shift3-story-pair.png`. Link sticker: apply link (utm ig-story), text "สมัครกับเพื่อน".

**Tue 3 Nov**
- 08:30 [AUTO] LinkedIn `li-post-30-seats`
- 18:00 [HAND] IG feed carousel `shift3-pair/01.png` to `06.png`. Caption: Pair.

**Wed 4 Nov**
- 18:00 [HAND] IG feed carousel `guide-ai-in-thai/01.png` to `07.png`. Caption: Guide, AI in Thai.
- 20:30 [HAND] IG Story `shift3-stories/shift3-story-open.png` again (second run), same link sticker as 25 Oct.

**Thu 5 Nov**
- 20:00 [AUTO] X `x-shift3-last-call`

**Fri 6 Nov**
- 18:00 [HAND] IG feed carousel `shift3-last-call/01.png` to `05.png`. Caption: Last call.
- 19:30 [HAND] IG Story `shift3-stories/shift3-story-lastcall.png`. Link sticker: apply link (utm ig-story), text "สมัคร SHIFT[3]". Optional countdown sticker only if a cut-off time is confirmed.
- [HAND] LINE OA broadcast: `shift3-banner/shift3-banner-square.png` + "ปิดรับพรุ่งนี้ ส. 7 พ.ย. SHIFT[3] กรอกใบสมัคร 2 นาทีเสร็จ ที่ passionseed.org/shift/3"

**Sat 7 Nov (deadline day)**
- 09:00 [HAND] IG Story `shift3-stories/shift3-story-tonight.png`. Link sticker: apply link (utm ig-story), text "สมัคร SHIFT[3]".
- 12:15 [AUTO] X `x-shift3-deadline-day`

**Sun 8 Nov**
- 09:00 [HAND] Take the apply banners down (they say "เปิดรับสมัครแล้ว" and carry an apply bar): restore the evergreen X header, LinkedIn cover and LINE OA rich message. No SHIFT[3] apply posts from here on.

### Round week

**Mon 9 Nov (Day 1)**
- 12:15 [AUTO] X `x-shift3-day-1` (no apply ask)
- 17:00 [HAND] IG Story `shift3-stories/shift3-story-day1.png`. Emoji slider (rocket) or a question sticker, prompt "ส่งกำลังใจให้ทุกทีม". **No apply link.**

**Tue 10 to Sat 14 Nov**
- Nothing scheduled. Optional by hand: one IG Story a night from the live session (screenshots only with the students' OK, group spaces only, no faces or names of minors without consent).

**Sun 15 Nov (Demo Day)**
- 17:00 [HAND] IG Story `shift3-stories/shift3-story-demoday.png`. Link sticker: https://passionseed.org/shift/next?utm_source=ig-story, text "SHIFT รอบหน้า".

## Gaps

- LinkedIn: only three SHIFT[3] founder posts exist, so only Mon 26 Oct, Thu
  29 Oct and Tue 3 Nov have a 08:30 slot. The other weekdays stay empty until
  new posts are written in `shift3-linkedin.ts` and added to `PUBLISH_PLAN`.
- X: Sat 31 Oct, Tue 3, Wed 4, Fri 6 and Sun 8 Nov are empty on purpose (12
  posts, max 2 a day, never more than one SHIFT[3] post a day).

## IG caption drafts

Each folder's `caption.txt` holds the caption generated from the set. The
drafts below match those files (refund line and hook already corrected in the
sets); the launch draft adds `#dek70 #dek71`.

### Launch (`shift3-launch-poster` + `shift3-launch`)
```
SHIFT[3] เปิดรับสมัครแล้ว
7 เย็น เปลี่ยนไอเดียในหัวเป็นของจริง แล้วชวนคนนอกมาลองใช้

จบ 7 วัน มี 3 อย่างติดมือ
1. ของจริงที่สร้างเอง แล้วชวนคนนอกมาลองใช้
2. บันทึกว่าอะไรพัง แล้วแก้ยังไง
3. พอร์ต 1 หน้า สำหรับ TCAS รอบ 1 ใช้เล่าตอนสัมภาษณ์ได้

จ. 9 พ.ย. ถึง อา. 15 พ.ย. ออนไลน์บน Discord ไลฟ์ทุกเย็น 19:00–21:00 น. จบที่ Demo Day อา. 15 พ.ย.
ทำเดี่ยวหรือทีม 1-3 คน ไม่ต้องมีพื้นฐานเขียนโค้ด ใช้ AI ช่วยสร้าง แต่เราเป็นคนตัดสินใจ
เหมาะกับ ม.4-ม.6 ที่เล็งพอร์ตสาย Tech, Business, Innovation เช่น CEDT, CS, CE, BBA, BAScii

฿690 ต่อคน สมัครคู่กับเพื่อน จ่ายคนละ ฿590
รับ 30 คน ปิดรับสมัคร ส. 7 พ.ย.
ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม

คอมเมนต์ "SHIFT" แล้วรับลิงก์สมัครทาง DM
หรือสมัครเองที่ passionseed.org/shift/3 กรอกใบสมัคร 2 นาทีเสร็จ
มีคำถาม ทัก LINE @passionseed

#PassionSeed #SHIFT #พอร์ตTCAS #TCAS #ทำพอร์ต #dek70 #dek71
```

### Proof (`shift3-proof`)
```
ของจริงจากรุ่นก่อน: 6 โปรเจกต์ที่นักเรียน SHIFT[0] และ SHIFT[1] ปล่อยให้คนลองใช้

แต่ละหน้าเล่า 3 อย่าง: โจทย์ ของที่ทำ และหลักฐานว่าไปต่อจากแผนแรกยังไง

ตัวเลขยังไม่เยอะ แต่เป็นของจริงทั้งหมด ไม่ปัดให้ดูเยอะ บางชิ้นมีคนนอกลอง 2 คน บางชิ้นมากกว่า 15 คน บางชิ้นยังเป็นเพื่อนที่ลอง ตัวเลขเป็นของแต่ละโปรเจกต์ ไม่ใช่ค่าเฉลี่ยของรุ่น SHIFT[0] เป็นรุ่นทดลองฟรี 9 คน

SHIFT[3] จ. 9 พ.ย. ถึง อา. 15 พ.ย. ไลฟ์บน Discord ทุกเย็น 19:00–21:00 น.
฿690 ต่อคน สมัครคู่กับเพื่อน จ่ายคนละ ฿590 · รับ 30 คน · ปิดรับ ส. 7 พ.ย.

อยากมีชิ้นของตัวเองบ้าง
คอมเมนต์ "SHIFT" แล้วรับลิงก์สมัครทาง DM
หรือสมัครเองที่ passionseed.org/shift/3 กรอกใบสมัคร 2 นาทีเสร็จ

#PassionSeed #SHIFT #พอร์ตTCAS #TCAS #ทำพอร์ต #ผลงานนักเรียน
```

### Parents (`shift3-parents`)
```
สำหรับผู้ปกครอง: SHIFT[3] ใช้เวลาแค่ไหน เรียนที่ไหน ต้องเตรียมอะไร

เวลา: ไลฟ์บน Discord ทุกเย็น 19:00–21:00 น. 7 เย็นติดกัน จ. 9 พ.ย. ถึง อา. 15 พ.ย. ระหว่างวันมีงานบ้าง เช่น คุยกับคนที่เจอปัญหา หรือส่งต้นแบบให้คนลองใช้
ที่ไหน: ออนไลน์จากบ้าน งาน คำถาม และคำแนะนำจากพี่เลี้ยงอยู่ในห้องกลุ่มบน Discord ที่ทีมงานเห็น
เครื่อง: เตรียมคอมพิวเตอร์ที่ต่อเน็ตได้ 1 เครื่อง เพราะเครื่องมือ AI บางตัวใช้บนมือถือไม่ได้
พลาดเย็นไหน: มีคลาสชดเชย ถ้ารู้ว่าไม่ว่างเกิน 2 เย็น แนะนำรอรุ่นถัดไป
จ่ายยังไง: ฿690 ต่อคน สมัครคู่ 2 คน จ่ายคนละ ฿590 โอนผ่าน QR พร้อมเพย์ ส่งสลิปทาง LINE @passionseed แล้วมีคนยืนยันที่นั่งให้
คืนเงินเต็ม: ทำครบทุกขั้น (รายการอยู่ในหน้าสมัคร) แล้วยังรู้สึกว่าไม่คุ้ม ทักมาบอกเราได้เลย

สมัครที่ passionseed.org/shift/3 ปิดรับ ส. 7 พ.ย. รับ 30 คน
ผู้ปกครองถามเพิ่มได้ที่ LINE @passionseed

#PassionSeed #SHIFT #TCAS #ผู้ปกครอง
```

### Objections (`shift3-objections`)
Paste `shift3-objections/caption.txt` as is (no refund line). Add `#dek70 #dek71` to the hashtags.

### Pair (`shift3-pair`)
Paste `shift3-pair/caption.txt` as is. Pair tip for the person posting: reply to comments that tag a friend with the DM link for both.

### Last call (`shift3-last-call`)
```
SHIFT[3] ปิดรับสมัคร ส. 7 พ.ย.

วันจันทร์ที่ 9 พ.ย. 19:00 น. คือเย็นแรก
เย็นนั้นทุกคนตัดไอเดียให้เหลือโจทย์เดียว ล็อกสโคปใน 1 หน้า แล้วเขียนชื่อคนนอกที่จะชวนมาลองใช้
อีก 6 เย็นต่อจากนั้น คุยกับคนที่เจอปัญหาจริง สร้างต้นแบบ ให้คนนอกลอง จดว่าอะไรพัง แล้วจบที่ Demo Day อา. 15 พ.ย. พร้อมพอร์ต 1 หน้าสำหรับ TCAS รอบ 1

ไลฟ์บน Discord ทุกเย็น 19:00–21:00 น. ทำเดี่ยวหรือทีม 1-3 คน ไม่ต้องมีพื้นฐานเขียนโค้ด

฿690 ต่อคน สมัครคู่กับเพื่อน จ่ายคนละ ฿590 · รับ 30 คน
จ่ายผ่านพร้อมเพย์ แล้วส่งสลิปทาง LINE @passionseed มีทีมงานตอบยืนยันที่นั่ง
ทำครบทุกขั้นแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็ม

คอมเมนต์ "SHIFT" แล้วรับลิงก์สมัครทาง DM
หรือสมัครเองที่ passionseed.org/shift/3 กรอกใบสมัคร 2 นาทีเสร็จ

#PassionSeed #SHIFT #พอร์ตTCAS #TCAS #ทำพอร์ต
```

### Guides (`guide-pick-a-problem`, `guide-interview-story`, `guide-ai-in-thai`)
Paste each folder's `caption.txt` as is. Each ends with the SHIFT[3] line
(dates, deadline, comment SHIFT) and has no refund line. After Sat 7 Nov,
cut the SHIFT[3] line before reposting any guide.

## Checklist for the person posting by hand

- Comment keyword "SHIFT" must be live in the DM auto-reply before 24 Oct 10:00.
- Every link sticker uses `utm_source=ig-story` so the apply form can count story traffic.
- No apply link or "สมัคร" anywhere from Sun 8 Nov onward.
- Before posting any image, open the PNG and check the wordmark reads SHIFT[3] with square brackets, not round or circled variants.
