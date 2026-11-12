# Software Engineer: proposed production data fixes

Proposed only, not applied. Apply them in the admin card editor or `RadarDraftEditor`, then refresh `lib/radar-guide/__fixtures__/software-engineer.json` with `pnpm radar:dump software-engineer`. Field id `ac112631-0ee9-491a-8c4d-a339df949132`. Taken from the 2026-11-11 dump. Sources and grades are in [`../factsheets/software-engineer.md`](../factsheets/software-engineer.md).

## 1. Dashes in `name_th`, `tagline_th` and `content_th` (spec 9, "Content blockers")

`name_th` (นักพัฒนาซอฟต์แวร์) has none. `tagline_th` has 1 and the cards' `content_th` has 19, so 20 in all. Where a line also carries an outdated or unsourced claim, the "after" fixes both (see section 2).

| # | Row (kind@position, card id) | Path | Before | After |
|---|---|---|---|---|
| 1 | `radar_fields.tagline_th` (reaches link previews) | `tagline_th` | ทุกธุรกิจต้องใช้ซอฟต์แวร์ แต่ AI กำลังเปลี่ยนวงการ — ตำแหน่ง junior ลดลง คนที่ใช้ AI เป็นจะได้เปรียบ | ทุกธุรกิจต้องใช้ซอฟต์แวร์ แต่ AI กำลังเปลี่ยนวงการ ที่นั่งจบใหม่แคบลง คนที่ใช้ AI เป็นและมีผลงานจริงจะได้เปรียบ |
| 2 | hook@0 `f4e2d81f-7843-4c20-ab87-9f1145b4738d` | `body` | ทุกธุรกิจต้องใช้ซอฟต์แวร์ — แต่วงการกำลังเปลี่ยนเร็วมาก AI ทำให้ทีมเล็กลงแต่ต้องเก่งขึ้น คนที่ใช้ AI เป็นจะได้เปรียบสุดๆ แต่ตำแหน่ง junior กำลังลดลงอย่างรวดเร็ว | ทุกธุรกิจต้องใช้ซอฟต์แวร์ แต่วงการกำลังเปลี่ยนเร็วมาก AI ทำให้ทีมเล็กลงแต่ต้องเก่งขึ้น คนที่ใช้ AI เป็นจะได้เปรียบ ส่วนบริษัทเทคใหญ่ของโลกรับเด็กจบใหม่น้อยลงมาก |
| 3 | hook@0 | `statLabel` | อัตราเติบโตของตำแหน่งงาน 2024-2034 (BLS) — แต่การจ้างตำแหน่งจบใหม่ลดลงกว่าครึ่ง | อัตราเติบโตของงานนี้ในสหรัฐฯ 2025-2035 (BLS) |
| 4 | fantasyReality@10 `b68b51b3-610a-4128-a0be-89edfcfe3d5d` | `reality` | ส่วนใหญ่ของเวลาไปกับการอ่านโค้ดคนอื่น ประชุม code review แก้บั๊กที่หาสาเหตุไม่เจอ และเขียน documentation — แต่ตอนที่ทุกอย่างรันผ่าน มันฟินมาก | ส่วนใหญ่ของเวลาไปกับการอ่านโค้ดคนอื่น ประชุม code review แก้บั๊กที่หาสาเหตุไม่เจอ และเขียน documentation แต่ตอนที่ทุกอย่างรันผ่าน มันฟินมาก |
| 5 | salaryProgression@40 `07c09dcf-873a-427d-82fb-691547e64ada` | `levels.0.note` | เริ่มต้นเรียนรู้ ทำ task เล็กๆ — ตำแหน่งนี้กำลังลดลงเพราะ AI | เริ่มต้นเรียนรู้ ทำ task เล็กๆ ที่นั่งระดับนี้แคบลง ต้องมีผลงานจริงให้ดู |
| 6 | salaryProgression@40 | `levels.2.note` | ออกแบบระบบ เป็น mentor ให้ทีม — ตำแหน่งที่ยังขาดแคลน | ออกแบบระบบ เป็น mentor ให้ทีม ระดับนี้ยังเป็นที่ต้องการ |
| 7 | aiImpact@70 `15c8fc15-1a4f-407a-842d-5406981f592e` | `automated.0` | งาน junior ที่เป็น routine — หลายบริษัทลด headcount แล้ว | งาน junior ที่เป็น routine: AI เริ่มทำแทนได้ |
| 8 | marketThailand@80 `a184c411-a043-4a90-91ee-ac1898453dbd` | `body` | ตลาดยังต้องการ dev เก่งๆ แต่ตำแหน่งจบใหม่ลดลงมากเพราะบริษัทใช้ AI แทน ปัจจุบัน JobsDB มีตำแหน่ง Software Engineer/Developer ราว 800-1,000 ตำแหน่งทั่วประเทศ ส่วนใหญ่กระจุกในกรุงเทพฯ และต้องการคนระดับ mid-senior ที่ใช้ AI เป็น เด็กจบใหม่ต้องแข่งกันสูงมาก — โดยประมาณว่าจบใหม่สายนี้ได้งานจริงราวครึ่งหนึ่ง (50%) ภายในปีแรกหลังเรียนจบ | ตลาดยังต้องการ dev เก่งๆ แต่ที่นั่งสำหรับจบใหม่แคบ TDRI นับประกาศงาน ก.ค. 2567 ถึง มิ.ย. 2568 พบว่าสายวิทยาการคอมพิวเตอร์มีตำแหน่งที่เปิดรับจบใหม่ 3,088 ตำแหน่ง และไม่ต้องมีประสบการณ์เลยเพียง 376 ตำแหน่ง ขณะที่ปีที่ข้อมูลอ้างอิงมีผู้จบสาขานี้ 8,242 คน งานส่วนใหญ่กระจุกในกรุงเทพฯ และต้องการคนที่ใช้ AI เป็นและมีผลงานจริง |
| 9 | marketThailand@80 | `job_access.label` | ยากสำหรับมือใหม่ — ต้องมีผลงานจริง | ยากสำหรับมือใหม่: ต้องมีผลงานจริง |
| 10 | marketThailand@80 | `job_access.applicant_data` | การจ้าง junior ลดลงกว่าครึ่ง (ARDURA 2026) — ตัวเลข placement 71-79% ที่เคยได้ยินเป็นของคนจบ bootcamp ฝั่งสหรัฐฯ ไม่ใช่ตลาดจบใหม่ไทย ตำแหน่ง mid-senior ยังขาดแคลน แต่ต้องมีประสบการณ์ 3+ ปี | สายวิทยาการคอมพิวเตอร์: ประกาศรับจบใหม่ 3,088 ตำแหน่ง ไม่ต้องมีประสบการณ์ 376 ตำแหน่ง (TDRI, ก.ค. 2567 ถึง มิ.ย. 2568) ตัวเลข placement 71-79% ที่เคยได้ยินเป็นของคนจบ bootcamp ฝั่งสหรัฐฯ ไม่ใช่ตลาดจบใหม่ไทย |
| 11 | dayInLife@90 `29809d74-91da-40b5-b265-3a9f064c6498` | `steps.1.detail` | อ่าน PR (Pull Request = คำขอนำโค้ดใหม่เข้าระบบหลัก) บน GitHub ตรวจ logic การตั้งชื่อตัวแปร และช่องโหว่ความปลอดภัย — AI ช่วย review เบื้องต้นได้ แต่คนยังเป็นผู้ตัดสินใจ | อ่าน PR (Pull Request = คำขอนำโค้ดใหม่เข้าระบบหลัก) บน GitHub ตรวจ logic การตั้งชื่อตัวแปร และช่องโหว่ความปลอดภัย AI ช่วย review เบื้องต้นได้ แต่คนยังเป็นผู้ตัดสินใจ |
| 12 | dayInLife@90 | `steps.3.detail` | ประชุมกับทีมเพื่อร่างระบบบนกระดาน พิจารณา scalability (รองรับผู้ใช้จำนวนมากได้ไหม) ค่าใช้จ่าย และ trade-offs (ต้องแลกอะไรกับอะไร) — งานนี้ AI ยังทำแทนไม่ได้ | ประชุมกับทีมเพื่อร่างระบบบนกระดาน พิจารณา scalability (รองรับผู้ใช้จำนวนมากได้ไหม) ค่าใช้จ่าย และ trade-offs (ต้องแลกอะไรกับอะไร) ซึ่งงานนี้ AI ยังทำแทนไม่ได้ |
| 13 | realPeople@100 `6bec2cad-fb69-4c64-948c-ea84ce8b0469` (hide it, see 2.6) | `people.0.advice` | อย่ารอให้เก่งก่อนค่อยสมัคร — สมัครเลย แล้วเรียนจากงานจริง ตอนนี้ต้องใช้ AI เป็นด้วย ไม่งั้นช้ากว่าคนอื่น | อย่ารอให้เก่งก่อนค่อยสมัคร สมัครเลย แล้วเรียนจากงานจริง ตอนนี้ต้องใช้ AI เป็นด้วย ไม่งั้นช้ากว่าคนอื่น |
| 14 | realPeople@100 | `people.0.whereHeading` | ตั้งเป้า Senior ใน 2 ปี — ต้องมี system design + mentoring skill | ตั้งเป้า Senior ใน 2 ปี: ต้องมี system design + mentoring skill |
| 15 | risks@110 `40bcf992-0f93-4f7c-a40e-4f1f99c3c6c9` | `risks.0` | ตำแหน่ง junior ลดลง 50% — บริษัทใช้ AI + senior แทนทีมใหญ่ เข้าสู่วงการยากขึ้นมาก | บริษัทเทคใหญ่ของโลกรับเด็กจบใหม่น้อยกว่าปี 2019 เกินครึ่ง (SignalFire 2025) ในไทยงานรับจบใหม่สายวิทย์คอมที่ไม่ต้องมีประสบการณ์มีแค่ 376 ตำแหน่ง (TDRI) เข้าวงการยากขึ้น ต้องมีผลงานจริง |
| 16 | risks@110 | `risks.1` | คนไม่ใช่ dev สร้างแอปง่ายๆ ได้เอง (vibe coding) — งานบางประเภทหายไป | คนไม่ใช่ dev สร้างแอปง่ายๆ ได้เอง (vibe coding) งานบางประเภทเลยหายไป |
| 17 | risks@110 | `risks.5` | Ageism — บางบริษัทชอบจ้างคนรุ่นใหม่ที่เงินเดือนถูกกว่า | Ageism: บางบริษัทชอบจ้างคนรุ่นใหม่ที่เงินเดือนถูกกว่า |
| 18 | text@130 startCarousel `e53aa200-9e73-4d71-91d7-68c9f2d7ff29` | `options.2.title` | CS50 — Harvard (edX) | CS50 จาก Harvard |
| 19 | text@130 | `options.3.description` | ฝึก problem solving และ algorithm ทุกวัน เริ่มจาก Easy แล้วค่อยขยับ — ทักษะนี้ใช้ในการสัมภาษณ์งาน | ฝึก problem solving และ algorithm ทุกวัน เริ่มจาก Easy แล้วค่อยขยับ หลายบริษัทใช้โจทย์แบบนี้ตอนสัมภาษณ์งาน |
| 20 | sources@150 `34d64375-9b54-49d7-99a7-c8386096d1f6` | `items.8.title` | Software Engineer Compensation — Thailand | Software Engineer Compensation, Thailand |

The same em dash is in `radar_sources` ref 10 `title` (row `2b4d11a4-373a-46fc-ac32-c031a5851c6e`): "Software Engineer Compensation — Thailand" becomes "Software Engineer Compensation, Thailand".

The careerSurvival card shows the Thai text in `radar_fields.research`, which also contains dashes. They are outside the `content_th` lint but still reach students:

| Path | Before (excerpt) | After (excerpt) |
|---|---|---|
| `research.metric_details.saturation_level.th` | …แต่ mid-senior ยังขาดแคลน — สำหรับคนที่กำลังจะเข้าตลาด… | Rewrite the whole line, see 2.3 |
| `research.metric_details.grad_employment_pct.th` | …ภายในปีแรกหลังเรียนจบ (โดยประมาณ) — ตอนนี้อยู่ราว 50%… | Rewrite the whole line, see 2.4 |
| `research.global_metric_details.saturation_level.th` | …ตำแหน่ง computing ว่างในสหรัฐฯ — อิ่มตัวเฉพาะ entry-level… | Rewrite the whole line, see 2.3 |

## 2. Outdated or unsourced figures

### 2.1 BLS growth: 15% (2024-2034) becomes 10% (2025-2035), labelled US

Source: [BLS OOH, Software Developers](https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm), read 2026-11-11: "projected to grow 10 percent from 2025 to 2035" (software developers 10%, QA/testers 6%), "106,100 openings for software developers, quality assurance analysts, and testers" a year, developers' median $135,980 (May 2025).

| Path | Before | After |
|---|---|---|
| hook@0 `stat` | 15% | 10% |
| hook@0 `statLabel` | see dash fix 3 | อัตราเติบโตของงานนี้ในสหรัฐฯ 2025-2035 (BLS) |
| `research.metric_details.demand_growth.th` | BLS คาดการณ์ software developer จะโต 15% ระหว่างปี 2024-2034 (เร็วกว่าค่าเฉลี่ยของทุกอาชีพมาก ราว 129,200 ตำแหน่งใหม่/ปี) แต่การจ้างตำแหน่งจบใหม่ลดลงกว่าครึ่งเพราะ AI | ในสหรัฐฯ BLS คาดว่างาน software developer จะโต 10% ระหว่างปี 2025-2035 เร็วกว่าค่าเฉลี่ยของทุกอาชีพมาก (รวมสาย QA และ tester มีตำแหน่งว่างราว 106,100 ตำแหน่งต่อปี) |
| `research.metric_details.demand_growth.en` | BLS projects 15% growth for software developers 2024-2034 … ~129,200 openings projected annually. Thailand's digital transformation in banking and e-commerce drives 15-20% annual growth in demand. | In the US, BLS projects 10% growth for software developers 2025-2035, much faster than average, with about 106,100 openings a year including QA analysts and testers. (Drop the unsourced "15-20% annual growth" Thailand line.) |
| `research.global_metric_details.demand_growth.th` / `.en` | BLS คาดการณ์ software developer จะโต 15% ระหว่าง 2024-2034 (~129,200 ตำแหน่ง/ปี)… | สหรัฐฯ: BLS คาดว่าจะโต 10% ระหว่าง 2025-2035 (~106,100 ตำแหน่ง/ปี รวม QA และ tester)… Same change in `en`. |
| `research.metric_details.demand_growth.sources[0].title` | BLS Occupational Outlook: Software Developers 2024-2034 | BLS Occupational Outlook: Software Developers 2025-2035 |
| `research.reasoning` (EN, not rendered) | BLS projects 15% growth 2024-2034 … Score lowered from 7 to 6 … | BLS projects 10% growth 2025-2035 (US). Also correct "Score lowered from 7 to 6": the field score is 4. |
| `research.global_metric_details.salary_floor` / `salary_ceiling` | BLS OES May 2024: P10 $79,850, P90 $211,450 | Refresh from the BLS OEWS May 2025 table for 15-1252. The percentiles were not on the page fetched 2026-11-11, so read them off the table when applying; do not guess. |

### 2.2 JobsDB salary references

Source: [JobsDB](https://th.jobsdb.com/career-advice/role/software-engineer/salary), read 2026-11-11. It now shows November 2026 averages by location (Bangkok ฿38,000, Pathum Thani ฿42,500, Chon Buri ฿40,000), "based on full-time salary ranges disclosed by employers on Jobsdb job ads". There are no ranges by level and no listing count.

| Path | Before | After |
|---|---|---|
| marketThailand@80 `openings` | ~800-1,000 ตำแหน่ง (JobsDB, Jul 2026) | 3,088 ตำแหน่งรับจบใหม่ สายวิทย์คอม (TDRI, ก.ค. 2567 ถึง มิ.ย. 2568) |
| marketThailand@80 `eyebrow` | ตลาดไทย · ประเมิน ก.ค. 2569 | ตลาดไทย · ข้อมูล TDRI 2568 |
| `research.metric_details.salary_floor.th` | …เริ่มต้นที่ 25,000-35,000 บาท/เดือน ตาม JobsDB 2026… | JobsDB ไม่แสดงช่วงเงินเดือนแยกตามระดับแล้ว ค่าเฉลี่ยจากประกาศงานในกรุงเทพฯ อยู่ที่ราว 38,000 บาท/เดือน (พ.ย. 2569, ทุกระดับ) Remove the PayScale figure: 5 salaries, last updated 2025-06. |
| salaryProgression@40 `levels[*].salary` | 25,000-35,000 / 40,000-70,000 / 90,000-130,000 / 130,000-220,000+ | No live source backs these ranges, and there is a gap between 70k and 90k. Either re-source each level (for example from a dated salary guide by Robert Walters, Adecco or similar, with its URL) or mark the card "ประมาณการ" with a date. The script does not speak them. |
| salaryProgression@40 `levels.3.note` | …Levels.fyi P90 ≈ 224K/เดือน | ตัดสินใจเรื่อง architecture ทั้งระบบ (Drop the Levels.fyi P90: self-reported and skewed to multinationals.) |

### 2.3 ARDURA claims become TDRI Thai data (spec 9)

Remove `radar_sources` ref 11 (ARDURA, row `54206433-7722-44db-be17-8e3893233fa4`) and the matching `sources@150` item. Add:
- **TDRI**: "Big Data ตลาดแรงงาน ไตรมาส 2/2568", https://tdri.or.th/2025/08/bigdata-report-labourmarket-q2-2025/, tier primary. Computer Science: 8,242 graduates (2565 cohort; the body text says 8,246), 3,088 postings open to new graduates, 376 requiring no experience. Computer Engineering: 3,554 / 3,004 / 379. Postings July 2024 to June 2025, 23 job sites.
- **SignalFire**: "State of Tech Talent Report 2025", https://www.signalfire.com/blog/signalfire-state-of-talent-report-2025, tier secondary, published 2025-05-20. New grads are 7% of Big Tech hires (top 15 tech companies by market cap); down over 50% from 2019.

| Path | Before | After |
|---|---|---|
| marketThailand@80 `source_refs` | [2, 9, 11] | [2, 9, TDRI ref] |
| risks@110 | risks.0 (see dash fix 15) | cite TDRI and SignalFire refs |
| `research.metric_details.saturation_level.th` | ตลาด junior อิ่มตัวสูงในปี 2026: สัดส่วนจ้างจบใหม่ลดจาก 15% เหลือ 7% การจ้าง junior developer ลดลง ~50% (ARDURA) แต่ mid-senior ยังขาดแคลน — … | ที่นั่งระดับจบใหม่แคบ: TDRI พบว่าสายวิทยาการคอมพิวเตอร์มีประกาศรับจบใหม่ 3,088 ตำแหน่ง แต่ไม่ต้องมีประสบการณ์เพียง 376 ตำแหน่ง (ก.ค. 2567 ถึง มิ.ย. 2568) คนที่มีประสบการณ์ยังเป็นที่ต้องการ (ตัวเลขนี้วัดความอิ่มตัวของแรงงานทั้งตลาด ต่างจากคะแนน 'การแข่งขัน' ในการ์ดตลาดไทยที่วัดผู้สมัครต่อตำแหน่งเปิดสำหรับจบใหม่) |
| `research.global_metric_details.saturation_level.th` | การจ้าง junior developer ลดลง ~50% ทั่วโลก … 1.4 ล้าน+ ตำแหน่ง computing ว่างในสหรัฐฯ — อิ่มตัวเฉพาะ entry-level… | บริษัทเทคใหญ่ 15 อันดับแรกของโลก รับเด็กจบใหม่เพียง 7% ของการจ้างทั้งหมด และน้อยกว่าปี 2019 เกินครึ่ง (SignalFire 2025) ความอิ่มตัวอยู่ที่ระดับเริ่มต้นเป็นหลัก (Drop the code.org 1.4M figure, an old projection.) |
| `research.global_metric_details.grad_employment_pct.th` / `.en` | อัตราว่างงาน CS จบใหม่ ~5.7% (Q4 2025) ว่างงานแฝง 42.5%… | Remove. 42.5% is very likely the NY Fed underemployment rate for all recent graduates, not CS. Re-source from the NY Fed "Labor Market for Recent College Graduates" table (computer science row) or drop it. |
| `research.metric_details.grad_employment_pct.th` and `metrics.grad_employment_pct` (50) | ตัวเลขนี้คือสัดส่วนของเด็กจบใหม่สายคอมพิวเตอร์ที่ได้งาน… (โดยประมาณ) — ตอนนี้อยู่ราว 50%… | This is our estimate built from a non-Thai blog, and the page labels it like a measured rate. Either relabel it "ทีมเราประเมิน" (no dash, no ARDURA numbers) or replace it with the TDRI ratio described in words, not as an employment percentage. |
| `research.sources` | includes ARDURA (2026-01-01, title has an em dash) and Metana | Replace ARDURA with TDRI and SignalFire. Metana can stay as the bootcamp-placement debunk source. |

### 2.4 Other unsourced or invented lines

- **aiImpact@70 `verdict`**: "ตำแหน่ง junior/mid หายไปเพราะ senior + AI ทำงานแทนทั้งทีมได้" overclaims, since the deck's own market card says mid and senior are in demand. After: "AI ไม่ได้แทนที่นักพัฒนาทุกคน แต่แทนที่คนที่ใช้ AI ไม่เป็น งานระดับเริ่มต้นบางส่วน AI ทำได้แล้ว คนที่ใช้ AI เป็นและตรวจงานของ AI ได้จะยิ่งมีค่า"
- **dayInLife@90 `steps.5.detail`**: "…บน Grafana หรือ CloudWatch (แดชบอร์ดเฝ้าระบบ) อย่างน้อย 30 นาทีหลัง deploy". The 30 minutes is invented. After: "…บน Grafana หรือ CloudWatch (แดชบอร์ดเฝ้าระบบ) หลัง deploy"
- **`sources@150` and `radar_sources` ref 4**: Stack Overflow 2025 becomes the 2026 survey, https://survey.stackoverflow.co/2026/ (the script cites 73% daily use and 48% trust when they can easily validate).

### 2.5 Hide the composite person (spec 9)

realPeople@100 `6bec2cad-fb69-4c64-948c-ea84ce8b0469` is labelled "คนจริงในสายนี้" but its publisher is "Composite from WEF/SO Survey developer career data", and it includes an invented "เงินเดือน 22K". Set `is_hidden=true`. Fix dash rows 13-14 anyway in case it is ever unhidden.

## 3. Start options: ordering and the missing skill rail

**The rail is empty.** On 2026-11-11 `radar_field_skills` had no rows for this field, and `radar_skill_start_options` (5 rows in the whole table) had none for it (read-only check). So the `start` chapter on `/radar/software-engineer` shows only the skills card. The only start options are in startCarousel text@130, which is hidden on purpose (commit c8533443). Proposal: map a primary skill (for example "Web development") in `radar_field_skills` with `is_primary=true`, and give it the start options below in `radar_skill_start_options` in this order. If the team prefers not to add skills yet, apply the same order to text@130 `options` so the data is right when the rail lands.

Current order in text@130: (1) สร้างเว็บส่วนตัวด้วย HTML/CSS/JS, ฟรี, 1-2 สัปดาห์; (2) freeCodeCamp / The Odin Project, `type` "YouTube" (wrong, both are websites); (3) CS50 Harvard (edX), "ฟรี (audit) / $149 (certificate)"; (4) LeetCode / Codewars. Option 1 is free and ends with something made, but it takes 1-2 weeks, so it fails the under-2-hours rule (spec 7.1).

Proposed order:

| # | title_th | cost | duration | type | url | Why |
|---|---|---|---|---|---|---|
| 1 (new) | ทำเว็บหน้าเดียวแนะนำตัวเอง ขึ้น GitHub Pages | ฟรี | เย็นเดียว (ไม่เกิน 2 ชั่วโมง) | ลองทำ | https://pages.github.com/ | Free (GitHub Pages is available on GitHub Free for public repos), under 2 hours, ends with a live link the student made. Matches the `start` script's `first_step`. Description: "เขียน HTML หน้าเดียวเล่าว่าเราเป็นใคร ชอบอะไร แล้วปล่อยขึ้น GitHub Pages ได้ลิงก์ของตัวเองส่งให้เพื่อนดู เป็นพอร์ตชิ้นแรก" |
| 2 | ทำเว็บแก้ปัญหาเล็กๆ ของคนรอบตัว (was "สร้างเว็บส่วนตัวด้วย HTML/CSS/JS") | ฟรี | 1-2 สัปดาห์ | ลองทำ | none | The second portfolio piece. Description: "เช่นตารางเวรห้อง หรือเมนูร้านแถวบ้าน deploy ขึ้น Vercel หรือ Netlify ฟรี ใช้ AI ช่วยได้ แต่ต้องอธิบายโค้ดได้ทุกบรรทัด" |
| 3 | The Odin Project / freeCodeCamp | ฟรี | 3-6 เดือน | คอร์สออนไลน์ (was "YouTube") | https://www.theodinproject.com/ | Free and project-based ("Our full stack curriculum is free"). |
| 4 | แก้โจทย์บน LeetCode / Codewars | ฟรี | ต่อเนื่อง | ลองทำ | https://leetcode.com/ | Unchanged apart from dash fix 19. |
| 5 (moved last) | CS50 จาก Harvard | ฟรี | 12 สัปดาห์ (self-paced) | คอร์ส | https://cs50.harvard.edu/x/ | Certificate-oriented, so it goes last. Drop the "$149" price: Harvard's own CS50x certificate is free and the edX price changes. Description: "คอร์สพื้นฐาน CS ที่สอน problem solving, algorithms และ web dev" (drop "ที่ดีที่สุด", an unsourced superlative) |
