# SHIFT[3] posting plan, Halloween re-plan, 27 Oct to 15 Nov 2026

Replaces the remaining hand-posted slots in
`output/marketing/2026-10-23/SHIFT3-POSTING-PLAN.md` from today on. So far
only one poster has gone out, so this plan front-loads every channel for the
11 days left before applications close.

Facts come from `SHIFT_COHORT_3` in `lib/content/shift-cohort.ts`; do not
retype them anywhere else: ฿690 per student, ฿590 each for a pair, 30 seats,
Mon 9 to Sun 15 Nov, Discord every evening 19:00–21:00, applications close
Sat 7 Nov, apply at passionseed.org/shift/3. Refund line, exactly as on the
posters: "ทำครบแล้วไม่คุ้ม คืนเงินเต็ม".

## What changed from the 23 Oct plan

1. **One look.** The round page, register page, gallery card and link
   preview now wear the Halloween pixel night (this branch). Every new post
   uses it too, so a student who taps through sees one place.
2. **Reels first.** `company-brain/marketing.md` says reels, not carousels:
   our carousels reached far fewer people, and portfolio-tip reels brought
   most of our follows. The 23 Oct plan is mostly carousels. Here, carousels
   become the save-for-later layer and reels carry reach.
3. **Every channel, not only Instagram.** LINE OA, Camphub, Discord alumni,
   TikTok and Facebook each get a slot, with their own tracked link.
4. **Halloween is Sat 31 Oct.** Pumpkin and ghost copy stops after 31 Oct.
   The pixel night art stays until the deadline: it is the round's look, not
   a holiday post.

## Tracked links

The apply form keeps `utm_source` (`lib/shift/attribution.ts`), so each
channel gets its own value and we can count sign-ups per channel.

| Channel | Link |
|---|---|
| IG comment DM | already set by the auto-reply (keyword `SHIFT`) |
| IG story sticker | passionseed.org/shift/3?utm_source=ig-story |
| IG bio | passionseed.org/shift/3?utm_source=ig-bio |
| TikTok bio | passionseed.org/shift/3?utm_source=tiktok |
| Facebook page | passionseed.org/shift/3?utm_source=facebook |
| LINE broadcast | passionseed.org/shift/3?utm_source=line-broadcast |
| LINE rich menu | passionseed.org/shift/3?utm_source=line-menu |
| LINE parents list | passionseed.org/shift/3?utm_source=line-parents |
| Discord alumni | passionseed.org/shift/3?utm_source=discord-alumni |
| Friend invite (alumni) | passionseed.org/shift/3?utm_source=friend |
| Camphub listing | keep as is: last round it is stored as `poster` |

## Assets

**Ready (Halloween pixel):**

| Asset | Where |
|---|---|
| Launch cover 1080x1350 (QR or "comment SHIFT") | `/shift/poster/3/launch` |
| IG carousel, 7 slides, comment SHIFT | `/shift/poster/3/halloween` |
| Listing banner 1200x630 | `/shift/poster/3/banner` |
| Register page and round page | `/shift/apply?round=3`, `/shift/3` |

**Ready but cosmos style (use as is, or re-skin if time allows):** proof,
parents, objections, pair, last-call and the three guide carousels, the 8
stories, the LINE square, X header, LinkedIn cover and the Camphub poster
(all in `output/marketing/2026-10-23/`).

**To make in Halloween pixel, in this order:**

1. LINE rich message 1040x1040 and rich menu 2500x1686 (needed Wed 28 Oct).
2. IG stories 1080x1920: open, poll, answer, pair, last call, tonight
   (needed from Wed 28 Oct, one a day).
3. Reel end card 1080x1920: "คอมเมนต์ SHIFT" bubble plus the send-to-a-friend
   line, reused at the end of every reel.
4. X header 1500x500 and LinkedIn cover 1584x396.
5. Camphub poster 1080x1350, only if the listing lets us swap the image.

## Reels (3 main a week, plus trial hooks)

Each reel does one step for one segment (`company-brain/marketing.md`), runs
about 15–45 seconds, has its hook readable on frame 1 with the sound off, and
ends with two asks: comment `SHIFT`, and send it to a friend in a named
situation. Post the same file to TikTok and the Facebook page, and upload the
original to Instagram, not a TikTok download.

| Date | Segment and step | Idea | End ask |
|---|---|---|---|
| Wed 28 Oct 18:00 | 4, Believe | Certificates stacked up vs one app 15+ real people tried (Magnified Lens). Pixel art for the frame, real app screen recording. | Comment SHIFT. Send to the friend with a folder full of certificates. |
| Fri 30 Oct 18:00 | 2, Believe | "รู้คณะแล้ว แต่ยังไม่เริ่ม": the กสพท70 calendar, how one talk with real users changed the brief. | Comment SHIFT. Send to the friend who wants med. |
| Sat 31 Oct 19:00 | 1 and brand, Notice | Halloween: the pixel student in a witch hat building on a laptop while the city trick-or-treats; 7 nights, one real project. The fun post for the month. | Comment SHIFT. Tag the friend you'd build with. |
| Mon 2 Nov 18:00 | 2, Trust | Angpao on camera: what one 19:00–21:00 evening looks like on Discord, with group-room footage only. | Comment SHIFT. Send to the friend who says they can't code. |
| Wed 4 Nov 18:00 | 4, Trust | Angpao on camera: why SHIFT makes you build, not listen, and what goes in the 1-page portfolio. | Comment SHIFT. Send to the friend still collecting certificates. |
| Thu 5 Nov 18:00 | 2 and 4, Act | Last call: 2 days left, pair price, what Day 1 asks you to bring. | Comment SHIFT. Send to the friend you'd apply with. |

**Trial Reels:** two hooks for the 28 Oct and 30 Oct reels (four trials).
Share a trial with followers after about 72 hours only if its sends and
saves per reach beat our average or the main reel. Judge on DM link clicks
and sign-ups, not views.

## Calendar

[AUTO] already scheduled by `social-publish` from `PUBLISH_PLAN`.
[HAND] a person posts.

### Tue 27 Oct (today)

- [HAND] Check that the X and LinkedIn slots from 24 to 27 Oct in
  `PUBLISH_PLAN` actually went live. If not, run `social-publish` now; it
  skips past slots, so repost `x-shift3-launch` by hand.
- [HAND] IG bio link and TikTok bio link to their tracked links above.
- [HAND] Confirm the Camphub SHIFT[3] listing is live with dates and price.
  Camphub brought 9 of 16 paid seats in SHIFT[2], our biggest source.
- 20:30 [HAND] IG Stories: poll and answer (`shift3-story-poll`, then
  `shift3-story-answer`), as in the 23 Oct plan.

### Wed 28 Oct

- 09:00 [HAND] LINE OA: rich menu and cover to the Halloween square, linked
  to the `line-menu` link.
- 18:00 [HAND] Reel 1, IG + TikTok + Facebook.
- 19:00 [HAND] LINE broadcast 1 (launch, copy below), Halloween cover image.
- 20:00 [AUTO] X `x-shift3-no-code`.
- 20:30 [HAND] IG Story: Reel 1 reshared, link sticker (ig-story).

### Thu 29 Oct

- 08:30 [AUTO] LinkedIn `li-post-interview-fear`.
- 18:00 [HAND] IG carousel: the Halloween 7-slide set
  (`/shift/poster/3/halloween`), caption = launch caption from the 23 Oct
  plan with "คอมเมนต์ SHIFT" first.
- 20:00 [AUTO] X `x-shift3-ai-in-thai`.
- [HAND] Discord alumni: pinned post (copy below) asking SHIFT[0]–[2]
  alumni to send the friend link.

### Fri 30 Oct

- 18:00 [HAND] Reel 2.
- 19:00 [HAND] LINE parents list: broadcast 2 (parents, copy below) with the
  parents carousel pages 1, 2 and 6.
- 20:00 [AUTO] X `x-shift3-parents`.
- 20:30 [HAND] IG Story: open story, link sticker.

### Sat 31 Oct (Halloween)

- 11:00 [HAND] IG carousel `shift3-objections`.
- 19:00 [HAND] Reel 3, the Halloween reel, IG + TikTok + Facebook + LINE VOOM.
- 20:30 [HAND] IG Story: Halloween question sticker, "ถ้ามี 7 เย็น อยากสร้างอะไร"
  (the comment prompt from the SDT reel plan), then reshare answers with the
  link sticker.
- From here on, no pumpkin or ghost copy. The art stays.

### Sun 1 Nov

- 18:00 [HAND] IG carousel `guide-interview-story`.
- 20:00 [AUTO] X `x-shift3-interview-story`.

### Mon 2 Nov

- 12:15 [AUTO] X `x-shift3-busy`.
- 18:00 [HAND] Reel 4.
- 19:30 [HAND] IG Story: pair story, link sticker text "สมัครกับเพื่อน".

### Tue 3 Nov

- 08:30 [AUTO] LinkedIn `li-post-30-seats`.
- 18:00 [HAND] IG carousel `shift3-pair`. Reply to comments that tag a friend
  with the DM link for both.

### Wed 4 Nov

- 18:00 [HAND] Reel 5.
- 20:30 [HAND] IG Story: open story, second run.

### Thu 5 Nov

- 18:00 [HAND] Reel 6, last call.
- 19:00 [HAND] LINE broadcast 3 (2 days left, copy below).
- 20:00 [AUTO] X `x-shift3-last-call`.

### Fri 6 Nov

- 18:00 [HAND] IG carousel `shift3-last-call`.
- 19:30 [HAND] IG Story: last-call story, link sticker.
- [HAND] Discord alumni: reminder under the pinned post.

### Sat 7 Nov (deadline day)

- 09:00 [HAND] IG Story: tonight story, link sticker.
- 10:00 [HAND] LINE broadcast 4 (closes today, copy below).
- 12:15 [AUTO] X `x-shift3-deadline-day`.

### Sun 8 Nov

- 09:00 [HAND] Take every apply banner and the LINE rich menu link down.
  No "สมัคร" anywhere from now on.

### Round week, 9 to 15 Nov

As in the 23 Oct plan: Day 1 story with no apply link, optional nightly
stories from group rooms only (no faces or names of minors without consent),
Demo Day story on Sun 15 Nov linking to `/shift/next`.

## LINE OA copy

Check before sending: the plan's monthly broadcast quota against our friend
count (both unknown as of 2026-10-27), so all four broadcasts fit.

**Broadcast 1, launch (Wed 28 Oct)**

```
SHIFT[3] เปิดรับสมัครแล้ว 🎃
7 เย็น สร้างของจริง 1 ชิ้น แล้วชวนคนนอกมาลองใช้ จบพร้อมพอร์ต 1 หน้าสำหรับ TCAS รอบ 1

จ. 9 ถึง อา. 15 พ.ย. ออนไลน์บน Discord ทุกเย็น 19:00–21:00 น.
ทำเดี่ยวหรือทีม 1-3 คน ไม่ต้องมีพื้นฐานเขียนโค้ด
฿690 ต่อคน สมัครคู่กับเพื่อน จ่ายคนละ ฿590 · รับ 30 คน
ทำครบแล้วไม่คุ้ม คืนเงินเต็ม

ปิดรับ ส. 7 พ.ย. กรอกใบสมัคร 2 นาที
passionseed.org/shift/3?utm_source=line-broadcast
```

**Broadcast 2, parents (Fri 30 Oct, parents list)**

```
คำตอบสั้นๆ สำหรับผู้ปกครอง SHIFT[3]

เรียนที่ไหน: ออนไลน์จากบ้าน ในห้องกลุ่มบน Discord ที่ทีมงานเห็นทุกห้อง
ใช้เวลาเท่าไร: ทุกเย็น 19:00–21:00 น. 7 เย็นติดกัน จ. 9 ถึง อา. 15 พ.ย.
ต้องเตรียมอะไร: คอมพิวเตอร์ที่ต่อเน็ตได้ 1 เครื่อง
ค่าใช้จ่าย: ฿690 ต่อคน สมัครคู่ จ่ายคนละ ฿590 ชำระผ่านพร้อมเพย์ แล้วส่งสลิปในแชตนี้ มีทีมงานยืนยันที่นั่ง
ทำครบแล้วไม่คุ้ม คืนเงินเต็ม

อ่านรายละเอียด passionseed.org/shift/3?utm_source=line-parents
ถามเพิ่มได้ในแชตนี้เลย
```

**Broadcast 3, two days left (Thu 5 Nov)**

```
SHIFT[3] ปิดรับสมัคร ส. 7 พ.ย. เหลืออีก 2 วัน

เย็นแรก จ. 9 พ.ย. 19:00 น. ทุกคนตัดไอเดียให้เหลือโจทย์เดียว แล้วเริ่มคุยกับคนที่เจอปัญหาจริง
ชวนเพื่อนมาด้วย จ่ายคนละ ฿590

passionseed.org/shift/3?utm_source=line-broadcast
```

**Broadcast 4, closes today (Sat 7 Nov)**

```
วันนี้วันสุดท้าย SHIFT[3] เปิดรับถึง ส. 7 พ.ย.
กรอกใบสมัคร 2 นาที แล้วเจอกันเย็นวันจันทร์ 19:00 น. บน Discord
passionseed.org/shift/3?utm_source=line-broadcast
```

## Discord alumni pinned post

```
SHIFT[3] เปิดแล้ว จ. 9 ถึง อา. 15 พ.ย. ทุกเย็น 19:00–21:00 น.
มีเพื่อนที่อยากมีโปรเจกต์จริงในพอร์ตไหม ส่งลิงก์นี้ให้เขาได้เลย
passionseed.org/shift/3?utm_source=friend
สมัครคู่กับเพื่อน จ่ายคนละ ฿590 ปิดรับ ส. 7 พ.ย.
```

## How we know it worked

Count every Monday (2 Nov) and on 8 Nov, from `shift_applications`:

- Sign-ups and paid seats per `utm_source`, against SHIFT[2]'s 16 paid seats
  (9 Camphub, 6 IG comment DM, 1 IG link).
- Per reel: sends and saves per reach, comments with `SHIFT`, DM link clicks.
- LINE: link taps per broadcast in LINE OA Manager.
- At 8 Nov, keep the 3 best post types for SHIFT[4] and drop the 3 worst.

## Rules for whoever posts

- Never promise admission. Sell the real project and the evidence, not
  portfolio review.
- Student stories, screens or clips only with the student's, a parent's and
  everyone-in-the-clip's consent. Students are minors.
- No em dashes in captions. Thai first.
- Every link carries its `utm_source`.
- Before posting an image, check the wordmark reads SHIFT[3] with square
  brackets.
- After Sun 8 Nov, no apply asks anywhere.

## Open questions

- Which poster has already gone out, and where? (fill in)
- Did the 24 to 27 Oct X and LinkedIn slots go live? (fill in)
- LINE OA friend count and broadcast quota. (fill in)
- Is the Camphub listing for SHIFT[3] live? (fill in)
- Who films the Angpao-on-camera reels (2 and 4 Nov), and when? (fill in)
