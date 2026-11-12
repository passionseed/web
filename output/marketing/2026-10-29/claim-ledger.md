# Claim ledger, 2026-10-29: SHIFT[3] small startup lab posters

Round promoted: SHIFT[3]. `cohortStatus(SHIFT_COHORT_3, "2026-10-29")` = open (deadline 2026-11-07). It is `POSTER_COHORT`.

| Claim (where) | Type | Source | Boundary |
|---|---|---|---|
| 9 to 15 Nov, 7 evenings, 19:00–21:00, online, ฿690, apply by Sat 7 Nov (offer band, all) | observed | `SHIFT_COHORT_3` via `SHIFT3` (lib/content/shift-cohort.ts) | Printed from data, not literals |
| Pair price ฿590 each (P4) | observed | `pairPriceBaht()`, `PAIR_DISCOUNT_BAHT` | Two friends applying together |
| ทำครบแล้วไม่คุ้ม คืนเงินเต็ม (all) | design principle / promise | `REFUND_PROMISE` (riso.tsx), same as every SHIFT poster | Brain wording differs, see conflicts |
| Team 1-3 people (P1) | observed | `teamSizeLabel(SHIFT_COHORT_3)` | Solo allowed |
| Talk to people with the problem from night 1 (P2, P5) | observed | company-brain shifts/shift-3.md, Day 1 interview workshop + homework | |
| Real people try the prototype (P2, P4, P5) | observed | shift-3.md Day 2 AI Studio prototype, Day 4-5 missions | No tester count printed on purpose (see conflicts) |
| Night 7 pitch: problem, link, tools, who tested it (P3) | observed | shift-3.md Day 7 | |
| Night 1 we find the problem together, you choose (P5) | observed | shift-3.md Day 1 "write problems, then pick 1"; `SHIFT_SDT` autonomy | |
| Mentor asks, doesn't think for you (P5) | design principle | `SHIFT_SDT` Autonomy line | |
| Group room on Discord with a mentor (P4) | observed | shift.md, shift-3.md; safeguarding rule (group spaces only) | Mentor every day except day 3 (and day 5 if day 4 goes well); students still meet |
| Leave with a prototype outsiders tried + 1-page portfolio (P4, P5) | target | `SHIFT3_LEAVE_WITH` | Many don't finish (shift-3.md problem 10); refund line covers it |
| "Startup lab" framing (all) | founder opinion / positioning | User request 2026-10-29 | No funding, investor or company-registration promise anywhere; community.md says startup/funding access is not an included benefit |
| "MY_STARTUP · วันที่ 30: ยังไม่มีใครเปิดเลย" and "0 USERS" (P2 phone) | illustration | Fictional ghost-product mock, not a SHIFT number | Not a claim about any student project |
| "FULL REFUND" stamp (P4) | promise | Same as `REFUND_PROMISE`, which runs around the stamp rim | English shorthand only; the Thai condition is printed with it |

## Conflicts found

1. **Tester count.** `SHIFT_COHORT_3.testerTarget` is 15 (inherited from SHIFT[1] via `sibling()`), but company-brain numbers.md says SHIFT[3] uses 5 real users (Angpao, 2026-10-23). Posters print no number. Fix the cohort record if anything renders `testerTarget` for round 3.
2. **Refund wording.** Posters say "ทำครบแล้วไม่คุ้ม คืนเงินเต็ม"; brain shift.md says refund if a student finishes day 7 with no work in hand. Written definition still "(fill in)". Unchanged from earlier posters.
3. **Public day plan vs real plan** (already logged in brain): the website schedule (Scope Lock, Reality Check...) does not match the internal SHIFT[3] plan. These posters only use lines true under both.

## Founder to confirm before posting

- "แล็บสตาร์ทอัพเล็กๆ" as the public name for SHIFT[3] in the band of all five.
- P4 "ห้องกลุ่มบน Discord มี mentor ดูแล": OK given day 3 has no mentor live?
