# Cybersecurity guide: cutscene recording sheet

**For:** the founder (on-camera host). **As of:** 2026-11-11.
**Source of truth:** the `clip` slot in each page file under
`lib/radar-guides/cybersecurity/pages/`. This sheet copies those lines for the
shoot. If you change a spoken line, change the page file in the same PR:
`radar:clip` hashes `scriptLinesTh`, and a clip recorded against an old script
fails `radar:check` with "script changed after recording".

Until a clip is recorded, the level still works: the host NPC says the same
lines in dialogue boxes. So record in priority order, not page order.

## How to shoot

- Vertical 9:16, face at eye level, phone at arm's length or on a stand. Quiet room.
- One sentence per line below. Pause half a beat between lines: the caption
  aligner (whisper) cuts on pauses.
- Say every number as written (digits are what the captions show). Do not add a
  number or a claim that is not in the script.
- Record the **hook take 1** as the first line, then two more takes of only the
  hook (takes 2 and 3) at the end. The editor picks one; the rest of the script
  stays as written.
- Safety lines (marked **SAFETY**) are said looking straight into the lens, no
  cutaway over them.
- Then run `pnpm radar:clip cybersecurity <level> <file.mov>` and commit
  `clips.json` and `clips/<level>.vtt` in a PR.

## Priority

| # | Level | Clip | Length | Required | Safety |
|---|---|---|---|---|---|
| 1 | 10 `tonight` | คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก | 22s | yes | yes |
| 2 | 2 `doors` | แฮกเกอร์หลอก AI ด้วยข้ออ้างเดียว | 25s | no | yes |
| 3 | 1 `mythos` | AI เจอบั๊กที่แก่กว่าเธอ | 20s | no | no |
| 4 | 3 `triage` | เกมนี้ AI ติดป้ายผิด 2 ใน 10 เธอเจอไหม | 25s | no | no |
| 5 | 4 `scam` | ข้อความไหนในแชตบ้านเธอคือมิจ | 20s | no | no |
| 6 | 6 `money` | เงินเดือนไซเบอร์ไทย ของจริง | 25s | no | no |
| 7 | 7 `fit` | ลังเลคอม วิศวะ หมอ ลองตอบหกข้อ | 30s | no | no |

Levels 5 `firstjob`, 8 `tcas`, 9 `terminal` and 11 `next` have no cutscene:
their reels are motion or demo-mode recordings of the page.

Links: every IG reel asks for a comment "RADAR"; the comment-to-DM campaign
sends the guide link (`RADAR_COMMENT_DM_AUTO` is off by default, so an admin
sends it from the comment queue). TikTok captions use typeable links only:
`passionseed.org/r/cyber-<level>`. The DM and every link go to the public
guide page; nothing here invites a private chat with a student.

---

<!-- CLIPS:START (kept in sync with the page files; see the note at the top) -->

## 1. Level 10 `tonight`: คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก

- **Plays:** right after the host's intro, before the legal line, the room card and the write-up maker.
- **Duration:** 22s. **Required.** **SAFETY** on lines 4 and 5.
- **On-screen text (hook):** คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก

**Teleprompter**

```
คืนนี้ลองแค่ห้องเดียว ฟรี
เปิด TryHackMe ห้อง Offensive Security Intro
เขาสร้างเว็บธนาคารปลอมไว้ให้ฝึกโดยเฉพาะ
ย้ำอีกที ฝึกเฉพาะในห้องที่เขาเปิดให้ลองแบบนี้เท่านั้น
ระบบจริงของคนอื่น ห้ามลอง ผิดกฎหมาย ต่อให้แค่ลองดูก็ตาม
ทำเสร็จแล้วกลับมาหน้านี้ เขียนสั้นๆ ว่าลองอะไร อะไรไม่เวิร์ก
ถ้าเป็นเจ้าของระบบจะแก้ยังไง
นั่นคือผลงานไซเบอร์ชิ้นแรกของเธอ
```

**Hook takes**
1. คืนนี้ลองแค่ห้องเดียว ฟรี
2. อยากมีผลงานไซเบอร์ชิ้นแรก เริ่มคืนนี้ได้เลย
3. ไม่ต้องรอเข้ามหาลัย ผลงานชิ้นแรกทำได้คืนนี้

**IG caption**
```
คืนนี้ลองแค่ห้องเดียว แล้วเธอจะมีผลงานไซเบอร์ชิ้นแรก
ห้องฝึกฟรีบน TryHackMe มีเว็บธนาคารปลอมให้ลองโดยเฉพาะ
ฝึกเฉพาะในห้องที่เขาเปิดให้ลองเท่านั้น ระบบจริงของคนอื่น ห้ามแตะ

คอมเมนต์ RADAR รับลิงก์ด่านนี้ทาง DM
ส่งให้เพื่อนที่อยากลองแต่ไม่รู้จะเริ่มตรงไหน
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM นะ ลิงก์พาไปด่าน "ภารกิจคืนนี้" พร้อมตัวช่วยเขียนผลงานชิ้นแรก

**TikTok caption**
```
คืนนี้ ห้องเดียว ได้ผลงานไซเบอร์ชิ้นแรก ฝึกเฉพาะในห้องที่เขาเปิดให้ลองเท่านั้น
เล่นต่อที่ passionseed.org/r/cyber-tonight
```

---

## 2. Level 2 `doors`: แฮกเกอร์หลอก AI ด้วยข้ออ้างเดียว

- **Plays:** after the three flip cards ("นี่คือการทดสอบที่ได้รับอนุญาต").
- **Duration:** 25s. Optional. **SAFETY** on lines 5 to 7, face on screen.
- **On-screen text (hook):** แฮกเกอร์หลอก AI ด้วยข้ออ้างเดียว

**Teleprompter**

```
มีเคสจริงอย่างน้อยสามเคส ที่คนร้ายหลอก AI ด้วยข้ออ้างเดียวกัน
ว่านี่คือการทดสอบที่ได้รับอนุญาต
สิ่งที่แยกนักทดสอบระบบออกจากอาชญากร ไม่ใช่ฝีมือ
แต่คือการได้รับอนุญาตจริงๆ มีสัญญา มีขอบเขตชัดเจน
จำไว้เลย ระบบที่ไม่ใช่ของเรา
ถ้าเจ้าของไม่ได้อนุญาตเป็นลายลักษณ์อักษร ห้ามแตะ ผิดกฎหมาย
แค่พิมพ์บอกเองว่าได้รับอนุญาต แบบนั้นไม่นับ
```

**Hook takes**
1. มีเคสจริงอย่างน้อยสามเคส ที่คนร้ายหลอก AI ด้วยข้ออ้างเดียวกัน
2. ข้ออ้างเดียว ที่คนร้ายใช้หลอก AI มาแล้วอย่างน้อยสามครั้ง
3. ฝีมือไม่ใช่สิ่งที่แยกแฮกเกอร์สายขาวกับคนร้าย

**IG caption**
```
แฮกเกอร์หลอก AI ด้วยข้ออ้างเดียว: "นี่คือการทดสอบที่ได้รับอนุญาต"
สิ่งที่แยกนักทดสอบระบบออกจากอาชญากร ไม่ใช่ฝีมือ แต่คือการได้รับอนุญาตจริง
ระบบที่เจ้าของไม่ได้อนุญาตเป็นลายลักษณ์อักษร ห้ามแตะ

คอมเมนต์ RADAR รับลิงก์ด่าน "สองประตู" ทาง DM
ส่งให้เพื่อนที่คิดว่าเก่งอย่างเดียวพอ
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM ในด่านนี้มีเกม "ใครได้กุญแจ" ลองแจกกุญแจดูว่าตรงกฎไหม

**TikTok caption**
```
ข้ออ้างเดียวที่คนร้ายใช้หลอก AI และทำไมพิมพ์ว่าได้รับอนุญาตเองไม่นับ
เล่นต่อที่ passionseed.org/r/cyber-doors
```

---

## 3. Level 1 `mythos`: AI เจอบั๊กที่แก่กว่าเธอ

- **Plays:** after the find-the-line game and the Mythos intel cards.
- **Duration:** 20s. Optional.
- **On-screen text (hook):** AI เจอบั๊กที่แก่กว่าเธอ

**Teleprompter**

```
เมษาที่ผ่านมา Anthropic สร้าง AI ชื่อ Mythos
แล้วไม่ยอมปล่อยให้คนทั่วไปใช้ เพราะมันหาช่องโหว่เก่งเกินไป
บริษัทบอกว่ามันเจอบั๊กที่ซ่อนอยู่ในระบบมาราว 27 ปี
แก่กว่าเธออีก
แต่นี่ไม่ได้แปลว่าคนหมดความหมายนะ
ไกด์นี้จะพาไปดูว่าตรงไหนที่ยังต้องใช้คน
และเธอเริ่มลงมือได้ตั้งแต่คืนนี้
```

**Hook takes**
1. เมษาที่ผ่านมา Anthropic สร้าง AI ชื่อ Mythos
2. มี AI ตัวหนึ่งที่บริษัทไม่กล้าปล่อยให้คนทั่วไปใช้
3. บั๊กตัวนี้อยู่ในโค้ดมานานกว่าอายุเธออีก

**IG caption**
```
AI เพิ่งเจอบั๊กที่ซ่อนอยู่ราว 27 ปี แก่กว่าเธออีก
(ตัวเลขจาก Anthropic เอง)
แล้วตรงไหนที่ยังต้องเป็นคน ไกด์นี้พาไปเล่นทีละด่าน

คอมเมนต์ RADAR รับลิงก์ทาง DM
ส่งให้เพื่อนที่ชอบแกะว่าระบบพังตรงไหน
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM ด่านแรกให้ลองหาบรรทัดที่มีบั๊กเอง ไม่ต้องเขียนโค้ดเป็น

**TikTok caption**
```
AI เจอบั๊กที่แก่กว่าเธอ ลองหาบรรทัดที่มีบั๊กเองได้
เล่นต่อที่ passionseed.org/r/cyber-mythos
```

---

## 4. Level 3 `triage`: เกมนี้ AI ติดป้ายผิด 2 ใน 10 เธอเจอไหม

- **Plays:** after the alert game, before the "เจอเร็ว แต่แก้ช้า" bucket.
- **Duration:** 25s. Optional.
- **On-screen text (hook):** เกมนี้ AI ติดป้ายผิด 2 ใน 10 เธอเจอไหม

**Teleprompter**

```
ถ้าเธอลังเลระหว่างหมอกับคอม ลองดูงานนี้
หมอห้องฉุกเฉินต้องคัดว่าใครด่วนจริง
คนสายไซเบอร์ก็คัดว่าสัญญาณไหนคือโดนจริง
ต่างกันที่ตอนนี้ AI ติดป้ายมาให้ก่อน และบางทีมันก็ผิด
งานของเราคือรู้ว่ามันผิดตรงไหน
ลองเล่นเกมนี้ดู ถ้าสนุก นั่นคือเบาะแสสำคัญเกี่ยวกับตัวเธอ
```

**Hook takes**
1. ถ้าเธอลังเลระหว่างหมอกับคอม ลองดูงานนี้
2. งานไซเบอร์จริงไม่เหมือนในหนัง ส่วนหนึ่งคือการจับผิด AI
3. หมอห้องฉุกเฉินกับคนสายไซเบอร์ ทำงานคล้ายกันกว่าที่คิด

**IG caption**
```
งานไซเบอร์จริง คือจับผิด AI
ในเกมจำลองนี้ AI ติดป้ายสัญญาณเตือนมา 10 อัน ผิด 2 อัน เธอหาเจอไหม

คอมเมนต์ RADAR รับลิงก์เกมทาง DM
ส่งให้เพื่อนที่ยังลังเลระหว่างหมอกับคอม
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM ถ้าจับผิดได้ครบ จะได้ badge "ตาคมไม่พลาด"

**TikTok caption**
```
AI ติดป้ายผิด 2 ใน 10 เธอหาเจอไหม (เกมจำลอง)
เล่นที่ passionseed.org/r/cyber-triage
```

---

## 5. Level 4 `scam`: ข้อความไหนในแชตบ้านเธอคือมิจ

- **Plays:** after the family-chat game.
- **Duration:** 20s. Optional.
- **On-screen text (hook):** ข้อความไหนในแชตบ้านเธอคือมิจ

**Teleprompter**

```
ข่าวไซเบอร์ไม่ได้อยู่ไกลเลย
เมื่อกันยาที่ผ่านมา มีคนอายุ 19 ถึง 22 สามคน
เสียเงินรวมกว่า 2,700,000 บาท ให้ตำรวจปลอมกับทุนเรียนต่อปลอม
แต่มีเงิน 500,000 บาทที่รอดมาได้ เพราะคนจากธนาคารโทรมาเตือนทัน
งานนั้นแหละคือสายไซเบอร์
ลองแยกเจ็ดข้อความนี้ดู ถ้าแยกถูกหมด ส่งให้ที่บ้านเลย
```

**Hook takes**
1. ข่าวไซเบอร์ไม่ได้อยู่ไกลเลย
2. ข้อความไหนในแชตบ้านเธอคือมิจ ลองทายดู
3. ทุนเรียนต่อปลอม หลอกคนอายุ 19 ถึง 22 ไปแล้วหลักล้าน

**IG caption**
```
ข้อความไหนในแชตบ้านเธอคือมิจ
เกมแยกแชต 7 ข้อความ ทุกข้อความเป็นตัวอย่างจำลอง แต่บทพูดมาจากเคสจริง

คอมเมนต์ RADAR รับลิงก์เกมทาง DM
ถ้าแยกถูกหมด ส่งให้แม่เลย
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM เล่นเสร็จแล้วส่งต่อให้ที่บ้านได้เลย

**TikTok caption**
```
ข้อความไหนในแชตบ้านเธอคือมิจ ลองแยก 7 ข้อความ (ตัวอย่างจำลอง)
เล่นที่ passionseed.org/r/cyber-scam
```

---

## 6. Level 6 `money`: เงินเดือนไซเบอร์ไทย ของจริง

- **Plays:** after the salary guess reveal and the entry-level stat.
- **Duration:** 25s. Optional.
- **On-screen text (hook):** เงินเดือนไซเบอร์ไทย ของจริง

**Teleprompter**

```
ตัวเลขเงินเดือนไซเบอร์ที่เห็นในคลิป บางตัวเป็นของอเมริกา
ของไทย ไปดูประกาศงาน Security Engineer บน JobsDB
ตัวเลขกลางๆ อยู่ที่เดือนละ 35,500 บาท
อันนี้รวมทุกระดับนะ ไม่ใช่เงินเดือนแรก
ส่วนตัวเลขสูงสุด คู่มือเงินเดือนของ Adecco บอกว่า
ระดับอาวุโส 7 ปีขึ้นไป สูงสุดราว 250,000 บาท
แต่ตัวเลขนี้ค่อนไปทางบริษัทข้ามชาตินะ
จุดเริ่มไม่หวือหวา แต่ทางขึ้นชันสำหรับคนที่พิสูจน์ฝีมือได้
```

**Hook takes**
1. ตัวเลขเงินเดือนไซเบอร์ที่เห็นในคลิป บางตัวเป็นของอเมริกา
2. เงินเดือนสายไซเบอร์ในไทย ของจริงเท่าไหร่
3. สายไซเบอร์ไม่ได้รวยตั้งแต่วันแรก แต่ทางขึ้นชัน

**IG caption**
```
เงินเดือนสายไซเบอร์ในไทย ของจริง
ค่ากลางในประกาศงาน Security Engineer บน JobsDB: 35,500 บาท (รวมทุกระดับ ไม่ใช่เงินเดือนแรก)
ระดับอาวุโส 7 ปีขึ้นไป ตามคู่มือ Adecco: สูงสุดราว 250,000 บาท (ค่อนไปทางบริษัทข้ามชาติ)

คอมเมนต์ RADAR รับลิงก์ทาง DM ลองเดาก่อนดูเฉลย
ส่งให้เพื่อนที่คิดว่าสายนี้รวยตั้งแต่วันแรก
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM ในด่านนี้ลองเดาเงินเดือนก่อน แล้วค่อยดูตัวเลขจริงพร้อมแหล่งที่มา

**TikTok caption**
```
เงินเดือนไซเบอร์ไทย ค่ากลาง 35,500 (รวมทุกระดับ) ไม่ใช่เงินเดือนแรก
ดูแหล่งที่มาที่ passionseed.org/r/cyber-money
```

---

## 7. Level 7 `fit`: ลังเลคอม วิศวะ หมอ ลองตอบหกข้อ

- **Plays:** opens the level, before the six questions.
- **Duration:** 30s. Optional.
- **On-screen text (hook):** ลังเลคอม วิศวะ หมอ ลองตอบหกข้อ

**Teleprompter**

```
ตอน ม.5 หลายคนเลือกคณะจากคะแนน ที่บ้าน หรือเพื่อน
แต่แทบไม่มีใครถามว่าเธอเคยลองงานจริงหรือยัง
ถ้าเธอชอบหาว่าอะไรพัง ชอบตัดสินใจตอนกดดัน
ไซเบอร์กับหมอมีอะไรคล้ายกันมากกว่าที่คิด
ลองตอบหกข้อนี้ ไม่ใช่แบบทดสอบบุคลิก แค่ช่วยคิด
แล้วไปลองห้องฝึกคืนนี้ ค่อยตัดสินใจ
```

**Hook takes**
1. ตอน ม.5 หลายคนเลือกคณะจากคะแนน ที่บ้าน หรือเพื่อน
2. ลังเลระหว่างคอม วิศวะ หมอ เป็นเรื่องปกติมาก
3. ไซเบอร์กับหมอ คล้ายกันมากกว่าที่คิด

**IG caption**
```
ลังเลระหว่างคอม วิศวะ หมอ ลองตอบหกข้อนี้
ไม่ใช่แบบทดสอบบุคลิก แค่ช่วยคิด แล้วไปลองห้องฝึกจริงก่อนตัดสินใจ

คอมเมนต์ RADAR รับลิงก์ทาง DM
ส่งให้เพื่อนที่ยังเลือกคณะไม่ได้
```
**Pinned comment:** คอมเมนต์ RADAR แล้วเช็ก DM ตอบเสร็จจะรู้ว่าเธอเอนไปทางไหน แล้วด่านถัดไปพาไปดูที่เรียน

**TikTok caption**
```
ลังเลคอม วิศวะ หมอ ลองตอบหกข้อ ไม่ใช่แบบทดสอบบุคลิก แค่ช่วยคิด
เล่นที่ passionseed.org/r/cyber-fit
```

<!-- CLIPS:END -->
