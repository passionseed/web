# Cybersecurity: proposed production data fixes

Proposed only. Nothing here has been applied. Apply through the admin card editor (`RadarDraftEditor`), then run
`pnpm radar:dump cybersecurity` and refresh `lib/radar-guide/__fixtures__/cybersecurity.json`.

- Field id `ba10dbb5-f049-480d-a55f-635d10fbf7ca`. Card ids are given by their first 8 characters.
- Source of the "before" text: the production dump of 2026-11-11 (field row, `research`, `radar_cards`, `radar_sources`),
  plus a read-only select of `radar_field_skills` / `radar_skill_start_options` on the same day.
- Facts verified on 2026-11-11; details in [`../factsheets/cybersecurity.md`](../factsheets/cybersecurity.md).

## 1. Dash sweep (`content_th`, `tagline_th`, `name_th`)

`name_th` ("ความมั่นคงปลอดภัยทางไซเบอร์"), `tagline_th` ("ปกป้องโลกดิจิทัลจากภัยคุกคาม") and `hero_image_alt_th` have
no dashes. `content_th` has **21** dash hits: 12 on published cards, 9 on the hidden `jobs@930` card
(`radar:dump` lints every `content_th`, hidden or not).

### Published cards

| # | Card | Path | Before | After |
|---|---|---|---|---|
| 1 | hook@0 `1dab4d68` | `body` | `งานของสายนี้คือปกป้องระบบและข้อมูลขององค์กรจากแฮกเกอร์ — จับสัญญาณผิดปกติ ลองเจาะระบบตัวเองก่อนคนร้าย และรับมือเหตุโจมตีจริง ตลาดไทยขาดคนสายนี้มาก ถ้าเธอชอบแกะระบบและคิดเหมือนคนร้าย (แบบถูกกฎหมาย) ทางนี้มีงานรออยู่` | `งานของสายนี้คือปกป้องระบบและข้อมูลขององค์กรจากแฮกเกอร์: จับสัญญาณผิดปกติ ลองเจาะระบบตัวเองก่อนคนร้าย และรับมือเหตุโจมตีจริง ทีมทั่วโลกยังขาดคนที่มีทักษะสายนี้ ถ้าเธอชอบแกะระบบและคิดเหมือนคนร้าย (แบบถูกกฎหมาย บนระบบที่ได้รับอนุญาตเท่านั้น) ทางนี้มีงานรออยู่` (also replaces the unsourced "ตลาดไทยขาดคนสายนี้มาก"; see 2.7) |
| 2 | hook@0 `1dab4d68` | `stat` | `25k–70k+` | Minimum: `25k-70k+`. Recommended (2.1): `฿35,500` with `statLabel` `เฉลี่ย/เดือน · ประกาศงาน JobsDB พ.ย. 2569` |
| 3 | salaryProgression@40 `985e5510` | `levels.0.note` | `รู้เครื่องมือ SOC/มอนิเตอร์ มี cert พื้นฐาน (เช่น Security+) สกิลที่ติดตัว: คิดแบบคนร้าย — มองเห็นช่องโหว่ก่อนใคร` | `รู้เครื่องมือ SOC/มอนิเตอร์ มี cert พื้นฐาน (เช่น Security+) สกิลที่ติดตัว: คิดแบบคนร้าย มองเห็นช่องโหว่ก่อนใคร` |
| 4 | salaryProgression@40 `985e5510` | `levels.0.salary` | `25k–35k` | `25k-35k` (see 2.2 on labelling) |
| 5 | salaryProgression@40 `985e5510` | `levels.1.salary` | `35k–55k` | `35k-55k` |
| 6 | salaryProgression@40 `985e5510` | `levels.2.note` | `วางสถาปัตยกรรมความปลอดภัยทั้งองค์กร คุยกับบอร์ดเรื่องความเสี่ยงได้ สกิลที่ติดตัว: ชั่งความเสี่ยงกับธุรกิจ — สิ่งที่ AI สแกนช่องโหว่แทนไม่ได้` | `วางสถาปัตยกรรมความปลอดภัยทั้งองค์กร คุยกับบอร์ดเรื่องความเสี่ยงได้ สกิลที่ติดตัว: ชั่งความเสี่ยงกับธุรกิจ ซึ่ง AI ที่สแกนช่องโหว่ทำแทนไม่ได้` |
| 7-8 | aiImpact@70 `e9edb51a` | `verdict` (2 dashes) | `ไม่ — AI ไม่น่าจะแทนเธอ แต่จะกลายเป็นเครื่องมือที่เธอใช้ทุกวัน งานเฝ้าระวังซ้ำๆ อย่างการไล่อ่าน log หรือสแกนช่องโหว่เบื้องต้นกำลังถูก AI ทำแทน แต่การตัดสินใจท่ามกลางเหตุโจมตีจริง การเข้าใจบริบทของธุรกิจ และการรับมือภัยคุกคามที่ไม่เคยเจอมาก่อนยังต้องอาศัยคน — ในงานสำรวจ ISC2 (2024) มืออาชีพสองในสามมั่นใจว่าทักษะของตนจะทำงานร่วมกับ AI ไม่ใช่ถูกแทนที่` | `คำตอบสั้นๆ คือไม่: AI ไม่น่าจะแทนเธอ แต่จะกลายเป็นเครื่องมือที่เธอใช้ทุกวัน งานเฝ้าระวังซ้ำๆ อย่างการไล่อ่าน log หรือสแกนช่องโหว่เบื้องต้นกำลังถูก AI ทำแทน แต่การตัดสินใจท่ามกลางเหตุโจมตีจริง การเข้าใจบริบทของธุรกิจ และการรับมือภัยคุกคามที่ไม่เคยเจอมาก่อนยังต้องอาศัยคน งานสำรวจ ISC2 ปี 2025 ที่ถามคนสายนี้กว่า 16,000 คนทั่วโลก พบว่า 73% มองว่า AI จะทำให้เกิดทักษะเฉพาะทางใหม่ๆ เพิ่มขึ้น` (updates the figure to the 2025 study; add the new source in 3 and put its ref in `source_refs`) |
| 9 | marketThailand@80 `1f111b61` | `body` | `ตลาดมีงานให้เห็นจริงและกำลังขาดคนมาก — องค์กรทั่วโลก 67% บอกว่าคน security ไม่พอ (ISC2 2024) คนที่มีทักษะจริงจึงถูกแย่งตัว ...` | `ตลาดมีงานให้เห็นจริง และทีมทั่วโลกยังขาดทักษะ: ในงานสำรวจ ISC2 ปี 2025 คนสายนี้ 59% บอกว่าทีมขาดทักษะสำคัญ คนที่มีทักษะจริงจึงถูกแย่งตัว ...` (rest of the body unchanged except the LinkedIn numbers, see 2.5) |
| 10 | dayInLife@90 `bb5d3ec6` | `steps.0.detail` | `...แล้วแยกว่าอันไหนเป็น false positive (เตือนหลอก — ดูน่าสงสัยแต่ไม่ใช่การโจมตี) อันไหนต้องสืบสวนต่อ` | `...แล้วแยกว่าอันไหนเป็น false positive (เตือนหลอก คือดูน่าสงสัยแต่ไม่ใช่การโจมตี) อันไหนต้องสืบสวนต่อ` |
| 11 | dayInLife@90 `bb5d3ec6` | `steps.2.detail` | `...ให้คะแนนความรุนแรงด้วย CVSS (คะแนน 0–10) แล้วประสานทีม IT...` | `...ให้คะแนนความรุนแรงด้วย CVSS (คะแนน 0-10) แล้วประสานทีม IT...` |
| 12 | text@125 skills `044d343d` | `body` (bullet "Tools by role") | `...threat intel ใช้ MITRE ATT&CK (คลังความรู้วิธีโจมตีของแฮกเกอร์)/CVE — ไม่ใช่ทุกคนต้องใช้ทุก tool` | `...threat intel ใช้ MITRE ATT&CK (คลังความรู้วิธีโจมตีของแฮกเกอร์)/CVE และไม่ใช่ทุกคนต้องใช้ทุก tool` |
| 13 | cta@140 `68b9d2b9` | `body` | `เข้า squad 8–12 คน ทำภารกิจทดสอบเส้นทางนี้ จบแล้วได้ Career Evidence Report` | Minimum: `เข้า squad 8-12 คน ทำภารกิจทดสอบเส้นทางนี้ จบแล้วได้ Career Evidence Report`. But see 2.9: the "7-Day Squad" offer probably no longer exists. |

### Hidden card `jobs@930` `385f45d9` (9 en dashes)

Recommended: delete the card. Its numbers are unsourced and its listing URLs are 2023-2024 job ids (factsheet).
If it is kept, replace each en dash with a hyphen:

| Path | Before | After |
|---|---|---|
| `jobs.0.salary` | `35k–70k` | `35k-70k` |
| `jobs.0.salaryGlobal` | `$5k–$9k` | `$5k-$9k` |
| `jobs.0.salaryGlobalThb` | `≈฿180k–324k` | `≈฿180k-324k` |
| `jobs.1.salary` | `45k–90k` | `45k-90k` |
| `jobs.1.salaryGlobal` | `$6k–$11k` | `$6k-$11k` |
| `jobs.1.salaryGlobalThb` | `≈฿216k–396k` | `≈฿216k-396k` |
| `jobs.2.salary` | `50k–120k` | `50k-120k` |
| `jobs.2.salaryGlobal` | `$7k–$15k` | `$7k-$15k` |
| `jobs.2.salaryGlobalThb` | `≈฿252k–540k` | `≈฿252k-540k` |

### Outside `content_th` (rendered on the careerSurvival card or stored in `research`)

`research.metric_details.*` and `global_metric_details.*` are shown on the injected "แนวโน้มอาชีพนี้เป็นอย่างไร?" card.

| Path | Before | After |
|---|---|---|
| `research.summary.th` | same text as hook@0 `body` | same "after" as row 1 |
| `research.ai_impact.verdict.th` | same text as aiImpact `verdict` | same "after" as rows 7-8 |
| `research.metric_details.salary_floor.th` | `...อยู่ราว 25,000–35,000 บาท/เดือน จากช่วงเงินเดือนที่นายจ้างระบุจริงในประกาศงานบน JobsDB (เข้าถึงข้อมูล ก.ค. 2569)` | `...อยู่ราว 25,000-35,000 บาท/เดือน (ประเมินจากช่วงเงินเดือนในประกาศงานบน JobsDB ก.ค. 2569) ปัจจุบัน JobsDB แสดงค่าเฉลี่ยประกาศงาน Security Engineer ที่ 35,500 บาท/เดือน (พ.ย. 2569)` |
| `research.metric_details.salary_ceiling.th` | `ระดับอาวุโส/หัวหน้าทีมในไทยเริ่มที่ราว 70,000 บาท/เดือนขึ้นไป จากประกาศงานจริงบน JobsDB (ก.ค. 2569) — ตำแหน่งผู้บริหารอย่าง CISO ในธนาคารอาจสูงกว่านี้มาก แต่นั่นคือเพดานของคนส่วนน้อย ไม่ใช่เส้นทางมาตรฐาน` | `ระดับอาวุโส/หัวหน้าทีมในไทยราว 70,000 บาท/เดือนขึ้นไป (ประเมินจากประกาศงานบน JobsDB ก.ค. 2569) ตำแหน่งผู้บริหารอย่าง CISO ในธนาคารอาจสูงกว่านี้มาก แต่นั่นคือเพดานของคนส่วนน้อย ไม่ใช่เส้นทางมาตรฐาน` |
| `research.metric_details.saturation_level.th` | `วัดว่าตลาดมีคนทำสายนี้มากพอหรือยัง (ยิ่งต่ำยิ่งขาดคน) — ไม่ใช่ตัวเดียวกับ 'การแข่งขัน' ...ตลาดขาดคนอย่างหนัก: ISC2 (2024) ระบุช่องว่างบุคลากรทั่วโลก 4,763,963 คน เพิ่มขึ้น 19.1% จากปี 2023 อุปสงค์มากกว่าอุปทานมาก` | `วัดว่าตลาดมีคนทำสายนี้มากพอหรือยัง (ยิ่งต่ำยิ่งขาดคน) ไม่ใช่ตัวเดียวกับ 'การแข่งขัน' ...ตลาดขาดคนอย่างหนัก: ISC2 ประเมินช่องว่างบุคลากรทั่วโลกปี 2024 ไว้ 4,763,963 คน ปี 2025 ISC2 เลิกประเมินตัวเลขนี้ และพบว่า 59% ของคนสายนี้บอกว่าทีมขาดทักษะสำคัญ` (see 2.4) |
| `research.metric_details.grad_employment_pct.th` | `นิยาม: โอกาสโดยประเมินที่เด็กจบใหม่ 'ที่มีทักษะพิสูจน์ได้' จะได้งานสายนี้ — ไม่ใช่สถิติการจ้างจริง ...ISC2 (2024) พบองค์กรทั่วโลก 67% มีคน security ไม่พอ และขาดคนรวม 4.76 ล้านตำแหน่ง...` | `นิยาม: โอกาสโดยประเมินที่เด็กจบใหม่ 'ที่มีทักษะพิสูจน์ได้' จะได้งานสายนี้ ไม่ใช่สถิติการจ้างจริง ...ISC2 (2024) พบองค์กรทั่วโลก 67% มีคน security ไม่พอ และประเมินช่องว่างไว้ 4.76 ล้านคน (ISC2 ไม่ได้ประเมินตัวเลขนี้แล้วในปี 2025)...` |
| `research.global_metric_details.grad_employment_pct.th` | `นิยามเดียวกับตัวเลขไทย: โอกาสโดยประเมินที่เด็กจบใหม่จะได้งาน ไม่ใช่สถิติจริง — ระดับโลกสูงกว่าเล็กน้อยเพราะช่องว่างบุคลากร 4.76 ล้านตำแหน่งกระจายทั่วโลก (ISC2 2024)` | `นิยามเดียวกับตัวเลขไทย: โอกาสโดยประเมินที่เด็กจบใหม่จะได้งาน ไม่ใช่สถิติจริง ระดับโลกสูงกว่าเล็กน้อยเพราะช่องว่างบุคลากรกระจายอยู่ทุกตลาด (ISC2 2024)` |
| `research.metric_details.salary_floor.source`, `salary_ceiling.source` | `JobsDB Thailand — Security Engineer Salary` | `JobsDB Thailand: Security Engineer Salary` |
| `research.summary.en`, `ai_impact.verdict.en`, `metric_details.salary_floor.en`, `saturation_level.en`, `grad_employment_pct.en`, `global_metric_details.grad_employment_pct.en` | em/en dashes | replace each with a comma, colon or hyphen (ranges). English copy, lower priority. |

## 2. Outdated, misattributed or unsourced figures

| # | Where | Now says | Fix | Source (verified 2026-11-11) |
|---|---|---|---|---|
| 2.1 | hook@0 `stat` + `statLabel` | `25k–70k+` · "บาท/เดือน · ตั้งแต่จบใหม่ถึงอาวุโส" | JobsDB no longer publishes ranges or levels, so the 25k-70k span cannot be re-checked. Replace with `฿35,500`, label `เฉลี่ย/เดือน · ประกาศงาน JobsDB พ.ย. 2569`, or keep the range relabelled "ประเมินจากประกาศงาน JobsDB ก.ค. 2569". | https://th.jobsdb.com/career-advice/role/security-engineer/salary ("Security Engineer Salary in TH (November, 2026)", average THB 35,500, "based on full-time salary ranges disclosed by employers on Jobsdb job ads") |
| 2.2 | salaryProgression@40 `eyebrow`, `levels`, `source_refs` | "เงินเดือนโตแค่ไหน · จากประกาศ JobsDB ก.ค. 2569"; refs [2, 4] | Relabel the eyebrow `เงินเดือนโตแค่ไหน · ประเมินจากประกาศ JobsDB ก.ค. 2569`. Remove ref [4] from the card and from each level (see 3). Mid ends at 55k and senior starts at 70k: either add a note "ช่วง 55k-70k ไม่มีข้อมูล" or change senior to `55k+`. Do not present the ladder as measured. | same JobsDB page |
| 2.3 | `research.metric_details.demand_growth.th` | `BLS คาดการณ์การเติบโต 29% ในช่วงปี 2024-2034 สูงกว่าค่าเฉลี่ยทุกอาชีพ (3%) มาก มีตำแหน่งเปิดรับเฉลี่ย 16,000 ตำแหน่ง/ปีในสหรัฐฯ ไทยมี 401+ ตำแหน่งบน JobsDB เฉพาะกรุงเทพฯ` | `ในสหรัฐฯ BLS คาดการณ์การเติบโต 21% ในช่วงปี 2025-2035 สูงกว่าค่าเฉลี่ยทุกอาชีพ (3%) มาก มีตำแหน่งเปิดรับเฉลี่ยราว 14,100 ตำแหน่ง/ปี (ตัวเลขสหรัฐฯ เท่านั้น)` and drop the undated "401+ ตำแหน่งบน JobsDB". | https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm ("projected to grow 21 percent from 2025 to 2035"; "About 14,100 openings ... each year"; page modified 2026-08-27) |
| 2.4 | `research.global_metric_details.demand_growth.th` | `BLS คาดการณ์การเติบโต 29% ในช่วงปี 2024-2034 มีตำแหน่งเปิดเฉลี่ย 16,000 ตำแหน่ง/ปี` | `BLS (สหรัฐฯ) คาดการณ์การเติบโต 21% ในช่วงปี 2025-2035 มีตำแหน่งเปิดเฉลี่ยราว 14,100 ตำแหน่ง/ปี` | same BLS page |
| 2.5 | `research.global_metric_details.salary_floor.th` / `salary_ceiling.th` | `$69,660/ปี (10th percentile)`; `CISO ... $300,000-400,000+/ปี เฉลี่ย $124,910/ปี` | Old wage year. Replace with `ค่ากลางในสหรัฐฯ $129,180/ปี (พ.ค. 2025)`. Drop the CISO $300k-400k+ figure (no source given) and the P10 unless re-read from the BLS OEWS table. | BLS page ("$129,180 in May 2025") |
| 2.6 | marketThailand@80 `body` (LinkedIn numbers) and `eyebrow` | "LinkedIn (ก.ค. 2569) แสดงผลค้นหา 222 งาน มีเพียง 34 งานที่รับระดับประสบการณ์น้อย เทียบกับ 133 งานระดับกึ่งอาวุโส"; eyebrow "ตลาดไทย · ประเมิน 21 ก.ค. 2569" | Logged out, the same search now shows **405** jobs and no experience split. Re-pull the split logged in and update the numbers and date, or drop the numbers and keep "ประกาศส่วนใหญ่อยากได้คนมีประสบการณ์". | https://th.linkedin.com/jobs/cyber-security-jobs ("405งาน Cyber Security ใน ประเทศไทย") |
| 2.7 | marketThailand@80 `body` (ISC2 67%), `source_refs` [9, 14, 15] | ISC2 2024 67% | Use ISC2 2025 (59% critical or significant skills needs, up from 44%). Replace ref [9] (2023 generic page) with the new ISC2 2025 source. | https://www.isc2.org/Insights/2025/12/2025-ISC2-Cybersecurity-Workforce-Study |
| 2.8 | marketThailand@80 `openings` | `คาดว่าจะมีตำแหน่งงานว่างมากกว่า 1,000 ตำแหน่งในอีก 1-2 ปีข้างหน้า` | No source. Remove, or replace with `ยังไม่มีตัวเลขคาดการณ์ตำแหน่งงานไซเบอร์ในไทยที่เชื่อถือได้` | none |
| 2.9 | marketThailand@80 `companies` | AIS, True, SCB, Bangkok Bank, PTTGC, DECODE, KBank, depa, NCSA | From 2023-24 listings. Retitle as "ตัวอย่างองค์กรที่เคยเปิดรับ" or re-check live listings. | none current |
| 2.10 | `research.metric_details.saturation_level` / `grad_employment_pct` / `global_metric_details.saturation_level` | ISC2 workforce gap 4,763,963 (+19.1%) presented as current | ISC2's 2025 study says "ISC2 has not included an estimate of the cybersecurity workforce gap this year." Label the figure as 2024 and add the 2025 skills finding (texts in section 1). | ISC2 2024 and 2025 pages |
| 2.11 | `research.metric_details.progression_difficulty.th` | `...ประสบการณ์ 5-10 ปีเพิ่มเงินเดือน 30-40% Cert เช่น CISSP เพิ่มเงินเดือนอีก ~25%` (source: Nucamp blog) | `เส้นทางอาชีพชัดเจนผ่าน Certification (CompTIA Security+ → CEH → CISSP) โดย CISSP ต้องมีประสบการณ์ทำงานจริงหลายปีก่อน` (drop the course seller's percentages) | Nucamp is a bootcamp seller (grade C) |
| 2.12 | aiImpact@70 `verdict`, `source_refs` | ISC2 2024 two-thirds | Update to ISC2 2025 (73%) as in section 1, rows 7-8. Keep `ai_risk_score` 3 labelled as our team's estimate. | ISC2 2025 page |
| 2.13 | entryRoutes@120 | `source_refs: []`, faculties only | Add a TCAS-backed line: "มีหลักสูตรไซเบอร์ตรงๆ แล้ว เช่น สจล. (วิศวกรรมคอมพิวเตอร์และความปลอดภัยไซเบอร์), มข. (ความมั่นคงปลอดภัยไซเบอร์), มช. (ระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์), มธ. (คอมพิวเตอร์เครือข่ายและความปลอดภัยทางไซเบอร์ โครงการพิเศษ)" after checking they are in TCAS70. Soften "ได้เปรียบที่สุด" to "เรียนครบทั้ง network, OS, security" (no source). | `tcas_programs` (mytcas scrape 2026-03-11): 10160101300504A, 10030138220204A, 10040106300502E, 10050209220202B |
| 2.14 | cta@140 `button`, `eyebrow`, `body` | "เข้าร่วม 7-Day Squad", "ลองของจริง 7 วัน", "Career Evidence Report" | Check in company-brain that this program still runs (spec 9, open decision 2: the program line is SHIFT and its open round, and TechSeed ended). If it doesn't, replace it with the agreed program line, with no price. | company-brain |

## 3. Sources (`radar_sources`)

| Action | ref | Now | Change |
|---|---|---|---|
| Fix URL | 1 | `https://www.nist.gov/cybersecurity/what-cybersecurity` (returns 404 on 2026-11-11) | `https://csrc.nist.gov/glossary/term/cybersecurity`, title "Cybersecurity (NIST CSRC Glossary)", tier primary, accessed 2026-11-11 |
| Remove | 4 | `https://www.linkedin.com/jobs/` with "published 2024-01-20" and an invented quote | Delete. Remove 4 from salaryProgression@40 `source_refs` and every `levels[].source_refs` |
| Update | 2 | JobsDB, accessed 2026-07-24 | accessed 2026-11-11; quote_en "Security Engineer average THB 35,500 (November 2026), based on full-time salary ranges disclosed by employers on Jobsdb job ads." |
| Update | 12 | BLS, accessed 2026-07-10 | accessed 2026-11-11; quote_en "Employment of information security analysts is projected to grow 21 percent from 2025 to 2035, much faster than the average for all occupations." |
| Update | 14 | LinkedIn search, accessed 2026-07-21 | accessed date after the re-pull in 2.6 |
| Replace | 9 | ISC2 Research/Workforce-Study (2023) | Replace with the ISC2 2025 study below, or add new and drop 9 from marketThailand |
| Add | new | none | ISC2 2025 Cybersecurity Workforce Study, https://www.isc2.org/Insights/2025/12/2025-ISC2-Cybersecurity-Workforce-Study, published 2025-12-04, secondary, quote_en "59% cited critical or significant skills needs this year, up from 44% in 2024." |
| Add | new | none | TryHackMe free training guide, https://tryhackme.com/resources/blog/free-offensive-security-training (2023-11-28) and https://tryhackme.com/resources/blog/free-tryhackme-training-to-learn-cyber-security-in-2026 (2026-08-19), for the start options in section 4 |
| Add | new | none | mytcas program pages for the four programs in 2.13 |
| Review | 3, 5, 8 | 2023/2024 pages with generic quotes | Cited by no published card that the script uses. Remove if no card cites them. |

## 4. Start options (blocks recording `start`)

**Cybersecurity has no rows in `radar_field_skills`, so `RadarSkillExperience` renders no start options at all** (read-only
select, 2026-11-11; the same is true of the other three tech careers). The `start` chapter would show only the skills
`text@125` card. The current "start" material lives only in cta@140 `resources` (TryHackMe, HackTheBox) and in
`research.entry_routes` / `proof_to_build`.

Proposed: create one primary skill for this field (for example slug `security-foundations`, name_th
"พื้นฐานความปลอดภัยไซเบอร์") and these start options, in this `sort_order`:

| sort_order | kind | title_th | summary_th | destination_url | metadata |
|---|---|---|---|---|---|
| 0 | project | TryHackMe: ห้อง Offensive Security Intro | ลองหาหน้าลับของเว็บธนาคารปลอมที่สร้างไว้ให้ฝึก แล้วเขียนสรุปสั้นๆ ว่าเจออะไร ใช้วิธีไหน พร้อมภาพหน้าจอ ฝึกเฉพาะในแล็บที่ได้รับอนุญาตเท่านั้น | https://tryhackme.com/room/offensivesecurityintro | `{"cost":"ฟรี","duration":"ไม่เกิน 1 ชั่วโมง"}` (confirm both on a free account first) |
| 1 | project | TryHackMe: ห้อง Defensive Security Intro | ลองฝั่งป้องกัน: ดูสัญญาณเตือนแล้วตัดสินใจว่าอันไหนโดนจริง | https://tryhackme.com/room/defensivesecurityintro | `{"cost":"ฟรี","duration":"30 นาที ถึง 2 ชั่วโมง"}` |
| 2 | community | HackTheBox | สนามฝึกระดับกลางถึงสูง ไปต่อเมื่อทำห้องพื้นฐานจบแล้ว ฝึกเฉพาะเครื่องที่แพลตฟอร์มเปิดให้ | https://www.hackthebox.com | `{"cost":"มีส่วนฟรี"}` |
| 3 | course | CompTIA Security+ (ใบรับรอง) | ใบรับรองพื้นฐานที่ประกาศงานมักขอ เสียค่าสอบ เก็บไว้ทีหลัง | https://www.comptia.org/certifications/security | `{"cost":"เสียค่าสอบ"}` |

Rules met: the first option is free, takes under 2 hours, and ends with something the student made (a write-up and a
screenshot). The certificate is last. Every option that involves attacking a system carries the authorised-lab line.
The defensive room's URL slug and the HackTheBox free tier were not re-checked; confirm them in the admin editor
preview before publishing.
