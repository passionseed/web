# Claim ledger, 2026-10-11 (Asia/Bangkok)

Drafts only. Nothing posted. Public facts only; private brain numbers stay in `../internal`.

## Offer promoted

**SHIFT[2]**, `POSTER_COHORT`. Moved by the founder from Mon 12 Oct to **Wed 14 Oct 2026**, still 7 days: 14-20 Oct, applications through 14 Oct (Day 1, before the 19:00 session), ฿690/person, pair ฿590/person, 21 seats, Discord 19:00-21:00. Source: `lib/content/shift-cohort.ts` (`SHIFT_COHORT_2`, edited today, `postponedFrom: 2026-10-12`). Every offer/schedule slide, poster footer and SHIFT caption reads these values.

## Claims

| Claim | Type | Source | Boundary |
|---|---|---|---|
| SHIFT[2] runs 14-20 Oct, deadline 14 Oct, ฿690, pair ฿590, 21 seats | Offer | shift-cohort.ts | Founder must confirm the end date (assumed 7 days → Tue 20 Oct) |
| "ครบ 7 วันเท่าเดิม เวลาเรียนเดิม" | Offer | cohort schedule, sessionTime | Same as above |
| ไม่ได้ชิ้นงาน คืนเงินเต็ม (no artifact by Day 7) | Published offer condition | `REFUND_PROMISE`, slidesOffer.tsx | Not an admissions or user-count guarantee |
| mentor in team Discord rooms every evening | Program mechanism | slidesOffer PARENT_POINTS, round page | Parents' own access to Discord is not claimed |
| Students choose the problem, mentors don't decide | Design principle | `SHIFT_SDT` | Not a measured effect |
| Day 1 scope cut 80%, Day 2 talk to 3 people, Day 7 พอร์ต 1 หน้า | Program structure | cohort schedule | Targets, not completion rates |
| List testers on Day 1, Tester Hunt card | Program mechanism | `SHIFT_CHANGES`, `SHIFT_SKILL_CARDS` | `testerTarget` 15 never stated as achieved |
| ปฏิทิน กสพท70 changed brief after user conversations | Observed SHIFT[0] outcome | `SHIFT_COHORT_0.showcase` | Real work, not an admission result; no user count claimed |
| KK built a QR helper for his grandpa | Student's own words | `SHIFT_VOICES.kkGrandpa` (consent 2026-10-07) | Nickname + SHIFT only; "หลังตัด" example on guide-scope-cut is our framing of his project |
| Potter: introvert; "ไม่ต้องมีครูก็ได้" | Student's own words | `potterIntrovert`, `potterSelfTaught` | Nickname + ม.6 + SHIFT[0]; not linked to a project |
| ป่าน: "มันง่ายเกินไป แค่สั่ง AI ก็ได้ เลยขี้เกียจ" | Student's remark | `SHIFT_CHANGES` | No grade/cohort on record; shown as "นักเรียน SHIFT" |
| Fishing-rod quote | **Founder's** words | `founderFishingRod` | Never labelled as a student |
| SeedStack asks, student runs commands | Product design | seedstack guide, SeedStack memory notes | Not an outcome claim |
| SHIFT for Schools: ฿590, 23-30, <23 refund, 1 teacher, ≥5 outside users | Published school offer | `lib/content/shift-school.ts` | "800+ students" deliberately not repeated (unaudited) |
| Interview, tester, scope, portfolio advice | Editorial guidance | general practice | Not presented as research or results |

## Conflicts found (not resolved in copy)

1. SHIFT[2] end date after the move: assumed 7 days (Tue 20 Oct). If Demo Day stays Sun 18 Oct, change `sibling(..., 9)` and the schedule.
2. Seats and refunds for people who applied before the move: no policy on record. The poster says "สมัครไว้แล้วและมีคำถามเรื่องวันใหม่ ทัก LINE @passionseed" and promises nothing else.
3. Supabase camp cohort / Discord for SHIFT[2] may still carry 12 Oct (`starts_on`); not changed here.
4. `/shift/school` and its posters still say Pivot Log / Case Study (banned words).
5. `SHIFT_COHORT` (round 1) still has `anchorPriceBaht: 1500`, a price never charged.
6. Hana's quote names ฿990; SHIFT[2] is ฿690. Not used in this batch.
7. Price strategy docs (฿1,980-4,900) vs live ฿690; school ฿590 equals the open-round pair price.
