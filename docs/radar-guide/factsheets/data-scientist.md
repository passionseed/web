# Data Scientist (นักวิทยาศาสตร์ข้อมูล): fact sheet

- Script: [`../scripts/data-scientist.json`](../scripts/data-scientist.json), version 1, as_of 2026-11-11.
- Field: slug `data-scientist`, researched 2026-07-09, cards edited to 2026-07-24 (dump of 2026-11-11).
- Session-1 recording: `money` and `start` (start framed as "พอร์ตสายนี้ต้องมีอะไร"). All 7 chapters are scripted so the page has full transcripts.
- Lint: `lintCareerScriptFile` passes for all 7 chapters (estimated spoken length: hook 20.6s, reality 24s, money 27.3s, ai 29s, day 24.6s, study 25.2s, start 30.3s).
- Proposed data fixes for the deck: [`../content-fixes/data-scientist.md`](../content-fixes/data-scientist.md).

Grades: **A** primary source checked live; **B** dated platform snapshot or secondary source with a date; **C** estimate, blog or unsourced; **X** do not use.
Every number spoken or shown on screen in the script maps to one row below graded A or B.

## Claims used in the script

| # | Chapter / beat | Claim (as said or shown) | Source | URL | Grade | as_of | Verification note |
|---|---|---|---|---|---|---|---|
| 1 | hook / 1; reality / 2, 3; ai / 3; day / 1, 3, 4 | Core tasks: analyse large data sets, clean and manipulate raw data, identify business problems, test and validate models, build visualisations, present results to management | O*NET OnLine 15-2051.00 [7] | https://www.onetonline.org/link/summary/15-2051.00 | A | 2026-10-06 | Fetched 2026-11-11; page updated 6 Oct 2026. Task wording quoted in the claims. US task list, used for "what the job is", not "a Thai person's day". |
| 2 | hook / 2 | ประกาศงาน Data Scientist/Data Analyst ในไทย 2,129 เป็น 2,618 (+23%) | TDRI, "ตลาดงาน AI ไทยโต แต่ทักษะคนยังไม่ทัน", ดร. พุทธิพันธุ์ หิรัณยตระกูล [8] | https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/ | A | 2025-08-25 | Fetched 2026-11-11. Q2/2567 vs Q2/2568, one year-on-year comparison. Spoken as "ในปีเดียว", not "ต่อปี". |
| 3 | money / 2 | Data Analyst, กรุงเทพฯ, ค่าเฉลี่ย ฿33,500/เดือน | JobsDB Thailand salary page (new ref, proposed [10]) | https://th.jobsdb.com/career-advice/role/data-analyst/salary | B | 2026-11 | Fetched 2026-11-11. Average of full-time salary ranges employers disclosed in JobsDB ads, all levels. Every province shows the same 33,500, so treat it as a national ad average. `level: average`, never "เงินเดือนแรก". |
| 4 | money / 3 | Data Scientist, กรุงเทพฯ, ค่าเฉลี่ย ฿50,000/เดือน | JobsDB Thailand salary page [2] | https://th.jobsdb.com/career-advice/role/data-scientist/salary | B | 2026-11 | Fetched 2026-11-11. Same method as row 3 (Nonthaburi shows 71,250). The page no longer shows P10/P90 or ranges. |
| 5 | ai / 4 | สหรัฐฯ: data scientist คาดโต 35% ปี 2025-2035 | BLS Occupational Outlook Handbook [1] | https://www.bls.gov/ooh/math/data-scientists.htm | A | 2026-08-27 | Fetched 2026-11-11 (page modified 27 Aug 2026): "projected to grow 35 percent from 2025 to 2035", about 24,800 openings a year, 275,600 jobs (2025) to 371,000 (2035). US only, always said as "ในอเมริกา". Used as context, not as proof that AI augments the job. |
| 6 | study / 3 | งาน AI และ Data ในไทยแทบทุกตำแหน่งขอ SQL กับ Python เป็นพื้นฐาน | TDRI [8] (same article as row 2) | https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/ | A | 2025-08-25 | Fetched 2026-11-11. The article lists "การใช้ SQL เพื่อเข้าถึงและจัดการข้อมูล การใช้ Python สำหรับการวิเคราะห์และพัฒนาโมเดล" (plus cloud experience) as the minimum stack for nearly all AI roles, including data scientist/analyst. On screen dated "ส.ค. 2568". |
| 7 | start / 1 | สายวิทยาการคอมพิวเตอร์: 376 จาก 3,088 ประกาศที่รับจบใหม่ไม่ขอประสบการณ์ | TDRI Big Data ตลาดแรงงานไทย ไตรมาส 2/2568 [9] | https://tdri.or.th/2025/08/bigdata-report-labourmarket-q2-2025/ | A | 2025-08-28 | Fetched 2026-11-11. 3,088 postings accept 0 to 2 years of experience; 376 need none. Postings Jul 2024 to Jun 2025, 23 job sites. CS is the feeder field, not a DS-only figure; the line says "สายวิทย์คอม". The 8,242 graduates figure is not used (text says 8,246, table 8,242; different cohort window). |
| 8 | start / 3 and `first_step` | Kaggle Titanic is a free beginner competition; the Titanic Tutorial notebook walks through a first submission | Kaggle (new ref, proposed [11]) | https://www.kaggle.com/code/alexisbcook/titanic-tutorial | A | 2026-11-11 | Tutorial page and competition page (https://www.kaggle.com/competitions/titanic) both resolve on 2026-11-11. No number spoken. `first_step.minutes: 90` is our own estimate (metadata only, never spoken). |

Beats without numbers that are founder framing rather than sourced fact (no claim needed by lint, kept deliberately modest):
- money / 1 "หลายคนเข้าสายนี้ผ่าน Data Analyst ก่อน": matches the deck's own ladder (level 1 is "Junior Data Analyst"). Phrased as "หลายคน", not "ส่วนใหญ่".
- money / 4 "ค่าเฉลี่ยจากประกาศงานทุกระดับ ไม่ใช่เงินเดือนแรก": the honest caveat on rows 3 and 4.
- ai / 1-2 "งานซ้ำๆ โดนก่อน ... ตำแหน่งแรกๆ จะแข่งกันหนักขึ้น": from aiImpact@70 `automated` and risks@110 (sources [4], [5] are blogs, grade B/C). No number, said as opinion.
- reality / 2 "เวลาส่วนใหญ่หมดไปกับการเก็บกวาดข้อมูล": the card's "80%" is not used (see X list).
- study / 1-2 faculty list: entryRoutes@120 names only, no ranking or numbers.
- start / 2, 4: portfolio advice and the canteen-price project (startCarousel option "วิเคราะห์ข้อมูลที่สนใจด้วย Python").

## Claims in the deck that the script does not use

| Claim | Where | Grade | Why not |
|---|---|---|---|
| "ทั่วโลก ... โต 34% ภายในปี 2034" | hook@0 body, aiImpact@70 verdict | X | BLS is US only and now says 35% for 2025-2035. Fix in content-fixes. |
| "BLS ยังคาดว่าโต ... แปลว่า AI มาเสริม ไม่ใช่มาแทนที่" | aiImpact@70 verdict | X | A growth projection does not show that AI augments the job. |
| "80% ของเวลาไปกับการทำความสะอาดข้อมูล" | fantasyReality@10 | X | Folk statistic from blogs [4], [6]; surveys disagree. |
| "กินเวลาถึง 60-80% ของโปรเจกต์" | dayInLife@90 step 1 | X | Same, and contradicts the 80% above. |
| Junior Data Analyst ฿25,000-40,000 and the rest of the THB ladder | salaryProgression@40 `levels_thb` | C | Refs [2], [3] have no stored quote or figure; JobsDB no longer shows ranges and Robert Walters returned 403. The ladder is plausible (row 3's 33,500 average sits inside it) but not on camera until a dated source is attached. This is also why the money hook avoids "เริ่ม"/"จบใหม่". |
| USD ladder $70k to $350k+, "FAANG $200k-$350k+" | salaryProgression@40 `levels`, global_metric_details | X | No source; not Thailand. |
| JobsDB P10 ฿18,000 / P90 ฿114,000; Lead DS ฿170,000+ (Glassdoor) | metric_details.salary_floor / salary_ceiling | C | Not on the JobsDB page any more; Glassdoor has no stored URL. |
| BLS P10 $58,510 / P90 $174,790 | global_metric_details | X (outdated) | BLS May 2025: P10 $67,240, P90 $199,130, median $120,230. |
| "~800 ตำแหน่ง (JobsDB ก.ค. 2569)" | marketThailand@80 openings | C | No source row. |
| grad_employment_pct 67%, job_access 50, ai_risk_score 3 | careerSurvival, marketThailand@80, aiImpact@70 | C | Team estimates. Only usable with "ทีมเราประเมิน"; the script does not use them. |
| DS layoffs 3% vs SWE 22%; 54% need a master's, 24% a PhD; ~78% employed in year one | metric_details / global_metric_details (365 Data Science) | X | US data from a course seller; not checked. |
| "เร็วกว่าค่าเฉลี่ย 11 เท่า", "อันดับ 4 ในสหรัฐฯ" | research.reasoning (not rendered) | X | Based on the 2024-34 projections. |
| Composite person "Data Scientist (ปีที่ 3)" | realPeople@100 | X | Made up ("Composite from BLS/365 Data Science"), published as "คนจริงในสายนี้". Hide. |
| Companies hiring: SCB, KBTG, AIS, Agoda, Shopee, Central Group, True Digital | marketThailand@80 | C | No source. |
| Google Data Analytics Certificate "ฟรี (audit) / $49/mo, 6 เดือน" | text@130 option 1 | B for the corrected wording | Coursera page (fetched 2026-11-11): 9 courses, "6 months at 10 hours a week", $49/month (US/Canada) after a 7-day free trial, financial aid available, no audit option stated. Not used: certificates go last. |

## Gaps to close before session 2

- **TCAS data** for `study`: seats, rounds and scores for สถิติ, วิทยาการข้อมูล and วิทยาการคอมพิวเตอร์ from `tcas_programs` / `tcas_admission_rounds` (shown at `/faculty-radar/cs`). The study script states no TCAS numbers until then.
- **A dated Thai entry-level salary source** (recruiter salary guide or a JobsDB/LinkedIn snapshot with ranges) if a "จบใหม่เริ่มเท่าไหร่" money reel is wanted. Until then money claims are `level: average`.
- **Start options** on the page come from the primary skill's `radar_skill_start_options`; an anon read returned no rows (RLS or no mapping), so the rail order could not be checked. See content-fixes.
