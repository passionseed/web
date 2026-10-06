# Claim/source ledger, 2 October 2026, Asia/Bangkok

Review only. This ledger uses public program records and source references. No applicant records, student identifiers, interview transcripts, or private research excerpts are included.

## Selected cohort and offer audit

Select **SHIFT[1]**, the nearest upcoming open round on the review date. Canonical `AD_COHORT = SHIFT_COHORT`. Dates 5–11 October 2026, application deadline 3 October 2026, ฿670/person, team 1–3, 19:00–21:00 Bangkok on Discord. Capacity 15, not a remaining-seat claim. Pair reduction ฿100/person gives ฿570/person when two friends apply together. No countdown wording.

Verified against `lib/content/shift-cohort.ts`, the rendered [round 1 page](https://www.passionseed.org/shift/1), and the rendered [round 1 application](https://www.passionseed.org/shift/apply?round=1), read-only on 2 October 2026 around 10:48 Bangkok. Page and form agree. The page's availability counter is a volatile payment-confirmation snapshot and is excluded from evergreen cards. No application submitted.

`POSTER_COHORT = SHIFT_COHORT_2`: separate round 2 posters, ฿990/person, pair ฿890, capacity 21, 12–18 October, deadline 10 October. Rendered [round 2 page](https://www.passionseed.org/shift/2) agrees. Do not reuse its offer card in this round 1 ad. Existing root `output/shift-ad/` contains stale round 2 offer exports even though ad source selects round 1; dated exports here replace them for this draft. Historical exports are retained.

**Unresolved conflicts:** AGENTS.md strategy says approximately ฿1,980–2,000. `docs/strategy/shift-seeding-trust-engine.md` proposes ฿1,999, a different 9-seat offer and a continued-coaching guarantee. These are not the live offer. This draft uses verified published round 1 terms for review; it does not resolve pricing policy. The live page still prints the older LINE ID `@161irjbq` while local cohort payment config and funnel notes say `@passionseed`. No LINE ID or payment instructions appear in the assets. Reconcile public payment copy separately before release.

## Claims

| Claim allowed in draft | Type | Source | Boundary |
| --- | --- | --- | --- |
| กสพท70 started as a portfolio-criteria site, changed to an exam calendar after user conversations | Recorded SHIFT[0] outcome | `SHIFT_COHORT_0.showcase`, `lib/content/shift-cohort.ts` | No interview count, verbatim user quote, or measured benefit supplied |
| Magnified Lens received feedback from more than 15 real testers | Recorded SHIFT[0] outcome | Same showcase record; existing Lens reel proof | Applies only to Lens; no retention, unique-user analytics, representative demographics, or universal result inferred |
| TradBid released v1 and improved to v2 during the round | Recorded SHIFT[0] outcome | Same showcase record | No exact feature diff or before/after effectiveness metric available |
| TradBid screenshot shows a trading simulation with ฿10,000 fictional cash | Visible product evidence | `public/shift/testimonial/tradbid-sim.png`, visually inspected before changes | Not investment returns, earnings, or real trading; screenshot preserved |
| กสพท70 screenshot shows the built calendar | Visible product evidence | `kaspt70-countdown.png` | Does not validate the displayed admission dates as official/current; never advise readers to use screenshot dates |
| Aim to contact 15 outside testers | Program target | Cohort `testerTarget`, round-page FAQ | Not a promised or achieved result for all teams |
| Day 1 choose scope; days 2–3 interview/build; days 4–6 test/improve; day 7 demo and พอร์ต 1 หน้า | Program structure/target | Cohort schedule | Not a completion rate or guaranteed public user count |
| Student chooses, learns through testing, has peers/mentors | Design principles | `SHIFT_SDT`, `SHIFT_DAILY_SHOW`, round-page squad section, AGENTS.md | Not a measured SDT intervention effect; no control group or pre/post measurement supplied |
| Mentor support in team Discord rooms | Published program mechanism | Round page; AGENTS.md safeguarding | Not private 1:1 minor DMs; no mentor-specific student interaction invented |
| Existing `shift-testimonials.ts` quotes | TechSeed #3/#5 / portfolio-review evidence | Header and per-card metadata | Not SHIFT outcomes; none reused in these assets |
| Refund if no artifact in hand after day 7 | Published offer condition | Round 1 rendered payment section and FAQ | Exact condition in primary text only; not an admissions guarantee, unconditional refund, or 15-user guarantee |
| Three interview questions and four-column worksheet | Editorial exercise | `lib/content/shift-guide.ts` | Not a reconstruction of the project's actual interview; examples labeled hypothetical |

## Retrieval and novelty

Read AGENTS.md, full UI design-system, required cohort/testimonial/ad files and consuming imports. Searched `../internal/docs/project`, `docs/plans`, `docs/superpowers`, `research`, and `curriculum` for SHIFT, SDT, self-determination, cohort reports, and project names. Relevant grounding references: `../internal/docs/project/PROJECTSEED-STRATEGY.md` (historical adjacent program), `BUSINESS_MODEL_CANVAS.md`, `FIRST-DOLLAR-STRATEGY.md`, `../internal/curriculum/pathlab/startup/README.md` (open questions and small experiments), `../internal/curriculum/techseed/hacking/README.md`. No dedicated new SHIFT cohort report or empirical SDT study was located. Private contents remain outside public drafts.

Existing drafts inspected: seeding/trust playbook, funnel notes, grid slide source, testimonial reel source, story reel source. Existing assets inspected: original ad panorama and offer cards, organic grid preview, calendar/Lens/TradBid screenshots, testimonial videos via frame previews. Old playbook narratives and admissions statistics are proposals with unsupported proof and are excluded.

No new student outcome is claimed. Repeating the calendar case is justified by a clear improvement: an actionable three-question guide, transparent distinctions between record and suggested exercise, accessible ad proof type, respectful parent hook, absolute dates, capacity labeling, and a repaired panorama export. Use this novelty record on the next run; do not remake this angle unless new evidence improves it.

## Live project verification

All three screenshot projects loaded with HTTP 200 in the browser on this review date. TradBid `/sim` still shows fictional ฿10,000 cash and buy/sell controls; its live price changes, so the preserved screenshot is a historical product view, not a current quote. Lens live page describes its sidebar capture, yellow movable lens and zoom view, and labels its sample material as simulated content. กสพท70 still shows a calendar/countdown; its current seconds differ from the preserved screenshot. Screenshot date labels are not independently verified admissions information. No tester analytics or private interviews were accessed.
