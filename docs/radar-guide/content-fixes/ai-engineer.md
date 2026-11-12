# AI Engineer: proposed production data fixes

Proposed only. Nothing here has been applied. Apply through the admin card editor (`RadarDraftEditor`), then run
`pnpm radar:dump ai-engineer` and refresh `lib/radar-guide/__fixtures__/ai-engineer.json`.

- Field id `b7e0261d-5001-46f1-820f-9b86936d3999`. Card ids are given by their first 8 characters.
- Source of the "before" text: the production dump of 2026-11-11.
- Facts verified on 2026-11-11; details in [`../factsheets/ai-engineer.md`](../factsheets/ai-engineer.md).
- Order of work: item 3 (salary card) blocks recording `money`; item 6 (start options) blocks publishing `start`.

## 1. Dash sweep (`content_th`, `tagline_th`, `name_th`)

`name_th` ("วิศวกร AI") and `tagline_th` have no dashes. `content_th` has **7** (3 em dashes, 4 en dashes).

| # | Card | Path | Before | After |
|---|---|---|---|---|
| 1 | salaryProgression@40 `05628027` | `levels.3.note` | `...(เพดานอ้างอิง AI Unlock ปี 2568: Lead/Principal ML Engineer 180k–300k+ บาท/เดือน)` | Remove the whole parenthetical (AI Unlock is grade C, see 3). Dash-only fallback: `180k-300k+` |
| 2 | salaryProgression@40 `05628027` | `levels.3.salary` | `ประมาณ 150k–250k+ บาท/เดือน` | Superseded by 3. Dash-only fallback: `ประมาณ 150k-250k+ บาท/เดือน` |
| 3 | marketThailand@80 `85be2ea1` | `body` | `ตลาดต้องการคนจริง — JobsDB มีประกาศสายนี้ 265 ตำแหน่ง (ก.ค. 2569)` | `ตลาดต้องการคนจริง: TDRI พบตำแหน่งวิศวกร AI/ML ในไทยเพิ่มจาก 85 เป็น 321 ในหนึ่งปี (ไตรมาส 2 ปี 2567 เทียบ 2568)` (see 2.2) |
| 4 | marketThailand@80 `85be2ea1` | `body` | `หลายประกาศขอประสบการณ์ 3–5 ปีพร้อมทักษะทำ AI ขึ้น production` | `หลายประกาศขอประสบการณ์ 3-5 ปีพร้อมทักษะทำ AI ขึ้น production` |
| 5 | marketThailand@80 `85be2ea1` | `job_access.applicant_data` | `...ใช้ภาวะขาดแคลนคนที่มีทักษะพร้อมทำงานเป็นตัวแทน — ตัวนี้วัดว่า 'คนทักษะตรงกันแย่งกันต่อ 1 ตำแหน่งมากแค่ไหน'...` | `...ใช้ภาวะขาดแคลนคนที่มีทักษะพร้อมทำงานเป็นตัวแทน ตัวนี้วัดว่า 'คนทักษะตรงกันแย่งกันต่อ 1 ตำแหน่งมากแค่ไหน'...` |
| 6 | dayInLife@90 `4e25c90a` | `steps.0.label` | `เช็ค dashboard (จอแสดงสถานะระบบ) ของ AI ที่คนใช้จริง — ความเร็ว ค่าใช้จ่าย อัตราพลาด` | `เช็ค dashboard (จอแสดงสถานะระบบ) ของ AI ที่คนใช้จริง: ความเร็ว ค่าใช้จ่าย อัตราพลาด` |
| 7 | dayInLife@90 `4e25c90a` | `steps.1.detail` | `...task completion rate (อัตราที่ผู้ใช้ทำงานสำเร็จจริง) — ไม่ใช่แค่ดู demo แล้วรู้สึกว่าฉลาด` | `...task completion rate (อัตราที่ผู้ใช้ทำงานสำเร็จจริง) ไม่ใช่แค่ดู demo แล้วรู้สึกว่าฉลาด` |

Outside `content_th` (not linted by `radar:dump`, but the Thai `metric_details` text renders on the injected
careerSurvival card): `research.metric_details.*.th` and `research.global_metric_details.*.th` hold **13** more dashes.

| # | Path | Before | After |
|---|---|---|---|
| 8 | `metric_details.salary_floor.th` | `40,000–65,000` and `25,000–35,000` | Rewrite per 2.4 (both dashes go) |
| 9 | `metric_details.demand_growth.th` | `2024–2034` and `1,550–2,300` | Rewrite per 2.5 (both dashes go) |
| 10 | `metric_details.salary_ceiling.th` | `180,000–300,000+` and `100,000–150,000` | Rewrite per 2.4 (both dashes go) |
| 11 | `metric_details.saturation_level.th` | `ตลาดไม่ saturated อย่างที่คิด — สิ่งที่ saturated คือ...` | `ตลาดไม่ saturated อย่างที่คิด สิ่งที่ saturated คือ...` |
| 12 | `metric_details.saturation_level.th` | `...ไม่ใช่ 'การแข่งขันต่อตำแหน่ง' บนการ์ดตลาดไทย — คนละมุมกัน) (ตัวนี้วัด 'ความอิ่มตัวของคนในตลาด' ว่าคนสายนี้ล้นตลาดหรือยัง ไม่ใช่ 'การแข่งขันต่อตำแหน่ง' บนการ์ดตลาดไทย — คนละมุมกัน)` | `...ไม่ใช่ 'การแข่งขันต่อตำแหน่ง' บนการ์ดตลาดไทย ซึ่งเป็นคนละมุมกัน)` (the parenthetical is duplicated today; keep one copy, no dash) |
| 13 | `metric_details.grad_employment_pct.th` | `...ที่ได้งานภายใน 6 เดือนหลังจบ' — ไม่ใช่ % ของเด็กจบทุกคน...` | `...ที่ได้งานภายใน 6 เดือนหลังจบ' ไม่ใช่ % ของเด็กจบทุกคน...` |
| 14 | `metric_details.grad_employment_pct.th` | `...มักตกรอบตั้งแต่ด่านแรก — นี่คือเหตุที่ตัวเลขนี้สูง...` | `...มักตกรอบตั้งแต่ด่านแรก นี่คือเหตุที่ตัวเลขนี้สูง...` (also see 2.7) |
| 15 | `metric_details.progression_difficulty.th` | `(framework ใหม่ทุก 3–6 เดือน)` | `(framework และเครื่องมือเปลี่ยนเร็วมาก)` (the 3-6 months figure has no source) |
| 16 | `global_metric_details.demand_growth.th` | `BLS คาด data scientists โต 34% ช่วง 2024–2034 และ software developers/QA/testers โต 15%...` | Rewrite per 2.6 |

The English `metric_details.saturation_level.en` and `grad_employment_pct.en` also hold em dashes; replace with commas when
those fields are next edited.

## 2. Outdated, misattributed or unsourced figures

### 2.1 hook@0 `d23c07be`: make TDRI 85 to 321 the hook stat (spec section 9)

- `stat` before `265`; after `321`
- `statLabel` before `ประกาศงาน AI Engineer ในไทยบน JobsDB ก.ค. 2569`; after `ตำแหน่งงานวิศวกร AI/ML ในไทย ไตรมาส 2 ปี 2568 จาก 85 ในปีก่อน (TDRI)`
- Add `source_refs: [9]` (new source, see 2.8).
- Why: TDRI counted AI/ML Engineer postings at 85 (Q2 2024) and 321 (Q2 2025), +277.6%, and companies hiring from 54 to 180
  (https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/, 25 Aug 2025, VERIFIED 2026-11-11). The 265 figure is a
  keyword search snapshot; the same search showed **289** on 2026-11-11 and includes loosely titled jobs.

### 2.2 marketThailand@80 `85be2ea1`

- `body`: replace the JobsDB 265 sentence as in dash fix #3. Keep "TDRI ประเมินว่าไทยขาดคนสาย AI ราว 80,000 คน" (VERIFIED:
  "A talent gap of 80,000 AI professionals", TDRI, 26 June 2025, source [7]).
- Soften the last sentence, which states an opinion as fact. Before: `เด็กจบใหม่ที่มี portfolio ระบบจริงยังผ่านด่านนี้ได้ดี ส่วนคนที่มีแค่ certificate มักตกรอบตั้งแต่ด่านแรก`.
  After: `ทางเข้าของเด็กจบใหม่คือ portfolio ที่เป็นระบบใช้งานได้จริง certificate อย่างเดียวมักไม่พอ`.
- `openings` before `265 ตำแหน่งบน JobsDB Thailand`; after `289 ประกาศบน JobsDB เมื่อค้นคำว่า AI Engineer (11 พ.ย. 2569)`, or drop the
  field and let the TDRI figure carry the card.
- `eyebrow` before `ตลาดไทย · ประเมิน 21 ก.ค. 2569`; after `ตลาดไทย · อัปเดต 11 พ.ย. 2569`.
- `source_refs` before `[1, 7, 8]`; after `[1, 7, 9]`. Source [8] (depa, "ปัญหากำลังคนด้านดิจิทัลในไทย") has no figure on this card.
- Companies list: re-check against the live JobsDB search before the next publish. On 2026-11-11 the first page showed
  Osotspa, Ascend Group, ttb spark, Shopee, G-Able, Thai Life Insurance; the stored list has Bangkok Bank, SCB DataX, True,
  ETDA, SCG, CP Axtra, Fujitsu Thailand, MUI Robotics, which were not re-verified.

### 2.3 salaryProgression@40 `05628027` (blocks recording `money`)

The card's refs [1] JobsDB search, [2] BLS data scientists and [3] 365 Data Science do not support any THB figure. The junior
35k-50k is a blend of JobsDB (25k-35k) and AI Unlock (40k-65k, no named method, a company that sells AI courses). The founder
clip says 25k-35k, so the card must match before the clip sits above it.

Proposed levels (source: JobsDB career advice "เจาะลึกสายอาชีพ AI Engineer", updated 12 Dec 2025,
https://th.jobsdb.com/th/career-advice/article/ai-engineer-job, VERIFIED 2026-11-11):

| Level | Before | After |
|---|---|---|
| 0 Junior AI / ML Engineer, 0-2 ปี | `ประมาณ 35k-50k บาท/เดือน` | `ราว 25k-35k บาท/เดือน` |
| 1 AI Engineer, 2-5 ปี | `ประมาณ 50k-90k บาท/เดือน` | Merge 1 and 2 into `Mid-Senior AI Engineer`, `2-8 ปี`, `ราว 70k-130k บาท/เดือน (บางกรณี)` |
| 2 Senior / Lead AI Engineer, 5-8 ปี | `ประมาณ 90k-150k บาท/เดือน` | (merged above) |
| 3 AI Architect / Head of AI Platform, 8+ ปี | `ประมาณ 150k–250k+ บาท/เดือน` | `Lead AI Engineer / AI Architect`, `8+ ปี`, `100k-150k+ บาท/เดือน` |

- If the chess animation needs exactly 4 levels, keep level 1 as `AI Engineer`, `2-5 ปี` with salary `ระหว่างขั้นแรกกับขั้นถัดไป`
  (no number) rather than an unsourced range.
- `levels.3.note`: drop `(เพดานอ้างอิง AI Unlock ปี 2568: Lead/Principal ML Engineer 180k–300k+ บาท/เดือน)`.
- `source_refs` before `[1, 2, 3]`; after `[10]` (new JobsDB career-advice source, see 2.8).
- Add one line of caveat to the card if the component allows it: `ตัวเลขจากข้อมูลประกาศงานของ JobsDB ไม่ใช่สถิติเงินเดือนทางการ`.

### 2.4 research.metrics and metric_details: salary floor and ceiling

- `metrics.salary_floor` before `35000`; after `25000`.
- `metric_details.salary_floor.th` after: `JobsDB (บทความแนะแนวอาชีพ อัปเดต ธ.ค. 2568) ระบุ Junior AI Engineer ราว 25,000-35,000 บาท/เดือน แล้วแต่บริษัท จึงใช้ 25,000 บาท/เดือนเป็นจุดเริ่มต้น`; `source_url` `https://th.jobsdb.com/th/career-advice/article/ai-engineer-job`.
- `metrics.salary_ceiling` before `250000`; after `150000`.
- `metric_details.salary_ceiling.th` after: `JobsDB ระบุ Lead AI Engineer / AI Architect เฉลี่ย 100,000-150,000 บาท/เดือนขึ้นไป บางบริษัทจ่ายสูงกว่านี้ แต่ยังไม่มีแหล่งข้อมูลที่ตรวจสอบได้`; `source_url` as above.
  The current 250,000 "at KBTG, SCB DataX, Agoda, Grab" is editorial, with no source.

### 2.5 research.metric_details.demand_growth (Thailand card)

Before: `BLS คาด data scientists โต 34% ช่วง 2024–2034; 365 Data Science วิเคราะห์ 903 job postings พบ AI engineer salary เฉลี่ยสหรัฐเพิ่ม $50k ใน 1 ปี; Axialsearch รายงาน AI/ML engineering postings ทรงตัวที่ 1,550–2,300 โพสต์ต่อสัปดาห์ในครึ่งแรกปี 2026`

After: `TDRI พบตำแหน่งวิศวกร AI/ML ในไทยเพิ่มจาก 85 เป็น 321 (ไตรมาส 2 ปี 2567 เทียบ 2568) และบริษัทที่เปิดรับเพิ่มจาก 54 เป็น 180 บริษัท`;
`source` `TDRI`; `source_url` `https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/`. The BLS figure is outdated and is a
different occupation; the 365 Data Science and Axialsearch figures are US-only blogs.

### 2.6 research.global_metric_details and global_metrics (BLS, label as US)

BLS published 2025-2035 projections (https://www.bls.gov/ooh/math/data-scientists.htm, VERIFIED 2026-11-11: 35% growth
2025-2035, median $120,230 May 2025, lowest 10% under $67,240, highest 10% over $199,130, about 24,800 openings a year).

| Path | Before | After |
|---|---|---|
| `global_metric_details.demand_growth.th` | `BLS คาด data scientists โต 34% ช่วง 2024–2034 และ software developers/QA/testers โต 15%; AI Engineer อยู่ตรงกลางของสองตลาดนี้` | `สหรัฐฯ (BLS): data scientists คาดว่าโต 35% ช่วง 2025-2035 และ software developers โต 10% BLS ยังไม่มีหมวด AI Engineer แยก จึงใช้สองอาชีพนี้เทียบ` |
| `global_metric_details.salary_floor.th` | `BLS ระบุ lowest 10% ของ data scientists ต่ำกว่า $63,650/ปี หรือประมาณ $5,304/เดือน` | `สหรัฐฯ (BLS, พ.ค. 2025): 10% ล่างของ data scientists ได้ต่ำกว่า $67,240/ปี หรือประมาณ $5,603/เดือน` |
| `global_metrics.salary_floor` | `5304` | `5603` |
| `global_metric_details.salary_ceiling.th` | `BLS ระบุ highest 10% ของ data scientists มากกว่า $194,410/ปี หรือประมาณ $16,201/เดือน` | `สหรัฐฯ (BLS, พ.ค. 2025): 10% บนของ data scientists ได้มากกว่า $199,130/ปี หรือประมาณ $16,594/เดือน` |
| `global_metrics.salary_ceiling` | `16201` | `16594` |

The software developers 10% (2025-2035) figure is the corrected value listed in spec section 9; it should be re-checked on
https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm when this is applied. Never write "ทั่วโลก"
for a BLS number.

### 2.7 grad_employment_pct 82% (team estimate)

`metric_details.grad_employment_pct.th` already says it is an estimate, but the careerSurvival label reads like a measured
statistic. Prefix the Thai detail with `ทีมเราประเมิน:` and drop `(ประกาศที่รับเด็กจบใหม่จริง ๆ มีแค่ 2.5% ตาม 365 Data Science)`, which is
US data. If Thai data is wanted instead: TDRI found 3,088 Computer Science postings open to new graduates, 376 of them with no
experience required (Jul 2024 to Jun 2025, https://tdri.or.th/2025/08/bigdata-report-labourmarket-q2-2025/).

### 2.8 radar_sources

| Change | Before | After |
|---|---|---|
| Add ref 9 | (none) | `TDRI`, `ตลาดแรงงานเอไอมาแรง ทีดีอาร์ไอพบ 2 ตำแหน่งงานโตอย่างก้าวกระโดด`, `https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/`, tier `primary`, published 2025-08-25, quote_th `ตำแหน่งวิศวกร AI/ML เพิ่มจาก 85 เป็น 321 อัตรา (ไตรมาส 2 ปี 2567 เทียบ 2568) บริษัทที่เปิดรับเพิ่มจาก 54 เป็น 180 บริษัท` |
| Add ref 10 | (none) | `JobsDB Thailand`, `เจาะลึกสายอาชีพ AI Engineer`, `https://th.jobsdb.com/th/career-advice/article/ai-engineer-job`, tier `secondary`, published 2025-12-12, quote_th `Junior AI Engineer ราว 25,000-35,000 บาท/เดือน แล้วแต่บริษัทและสภาพงาน` |
| Add ref 11 (optional, used in the `study` and `start` scripts) | (none) | `TDRI`, Big Data ตลาดแรงงาน ไตรมาส 2/2568, `https://tdri.or.th/2025/08/bigdata-report-labourmarket-q2-2025/`, tier `primary`, published 2025-08-28 |
| [1] `292301c1` quote_th | `JobsDB แสดง 265 ตำแหน่งสาย AI Engineer ในไทย (ก.ค. 2569)` | `JobsDB แสดง 289 ประกาศเมื่อค้นคำว่า AI Engineer (เช็ก 11 พ.ย. 2569)`; tier `secondary` (a keyword search snapshot) |
| [3] `e61dfc81` 365 Data Science | tier `primary` | tier `secondary` (blog, US data) |
| [4] `ff7f208b` AI Unlock | tier `primary` | tier `secondary` (blog with no named method; publisher sells AI courses). Remove from card `source_refs` where it is the only support. |
| [2] `7312873c` BLS | title `BLS Data Scientists` | keep, but note in the card that it covers US data scientists, not AI engineers |

Then update the sources@150 `65a2f73a` `items` list to match.

### 2.9 Other card copy that states unsourced quantities

- aiImpact@70 `761daf11` `verdict`: `ทดลองเร็วขึ้นหลายเท่า` → `ทดลองได้เร็วขึ้นมาก` (no source quantifies it).
- dayInLife@90 `4e25c90a` `title`: `วันจริงของ AI Engineer คือครึ่งหนึ่ง coding ครึ่งหนึ่งไล่ความจริงของระบบ` → `วันจริงของ AI Engineer คือเขียนโค้ด สลับกับไล่ดูว่าระบบทำงานจริงไหม` (the half-and-half split is a figure of speech that reads like data).
- risks@110 `84231f7c` `risks.0`: `framework, model, pricing และ best practice เปลี่ยนทุกไตรมาส` → `framework, model, pricing และ best practice เปลี่ยนเร็วมาก`.

### 2.10 content_en (not shown to Thai viewers, but read by any pipeline that uses it)

The English cards contradict the Thai ones: hook "The hottest job on Earth", dayInLife "9am-6pm at Google DeepMind", a USD
ladder $80k-$500k+ with no source, fantasyReality "80% of the time is data prep". Script generation reads `content_th` only
(spec 7.1); the motion reel and captions must do the same. Rewrite `content_en` from the Thai cards when convenient.

## 3. Composite people

None. This field has no `realPeople` card.

## 4. Start options: free first step first, certificates last (blocks publishing `start`)

### 4.1 What the page has today

- An anon read of `radar_field_skills` for this field returned **no rows** on 2026-11-11 (only 5 business-territory skills are
  published in `radar_skills`). So the `RadarSkillExperience` rail is empty and there are no `radar_skill_start_options`
  to reorder. The `start` chapter would show only the skills `text@125` card behind the "ดูทักษะทั้งหมด" expander. Confirm with
  a service-role read in admin, in case rows exist but are unpublished.
- startCarousel `text@130` `fc6111fb` (hidden on the page by design) is a numbered list written for university students and
  career switchers: 1 software basics (Python, SQL, Git, API, Docker, cloud), 2 ML basics, 3 a RAG project, 4 an eval set of
  50-100 cases, 5 MLOps, 6 apply for internships. None of it is a free, under-2-hour first step that ends with something
  made, and it names no certificate (good). It has no dashes.

### 4.2 Proposed primary skill and start options

Map one primary skill (for example slug `ai-evaluation`, `name_th` `ทำ AI แล้ววัดผลเป็น`) to this field, publish it, and
add start options in this `sort_order`:

1. **Teachable Machine: โมเดลแรก + ชุดข้อสอบแรก** (kind `project`)
   - `title_th`: `สอนโมเดลแยกของสองอย่าง แล้วสอบมันด้วยรูปใหม่`
   - `summary_th`: `ใช้ Teachable Machine ฟรี ไม่ต้องเขียนโค้ด ถ่ายรูปสิ่งของสองอย่าง สอนโมเดล แล้วเอารูปที่มันไม่เคยเห็นมาสอบ จดในตารางว่าถูกหรือพลาดตรงไหน ใช้รูปสิ่งของ ไม่ต้องใช้หน้าตัวเอง`
   - `provider`: `Google`; `destination_url`: `https://teachablemachine.withgoogle.com/`
   - `metadata`: `{"cost":"ฟรี","minutes":60,"makes":"โมเดลหนึ่งตัวกับตารางผลสอบ"}` (60 minutes is our estimate)
   - Matches the `first_step` in `docs/radar-guide/scripts/ai-engineer.json`. Open the site on the day this is applied to confirm it still trains without sign-in.
2. **Kaggle Learn: Python** (kind `course`), `https://www.kaggle.com/learn/python`, free. Check the course length shown on the page before writing it.
3. **Kaggle Learn: Intro to Machine Learning** (kind `course`), `https://www.kaggle.com/learn/intro-to-machine-learning`, free.
4. **Hugging Face Learn** (kind `course`), `https://huggingface.co/learn`, free (already a `cta@140` resource).
5. **โปรเจกต์ RAG ตอบพร้อมอ้างแหล่ง + ชุดข้อสอบ** (kind `project`), from startCarousel steps 3-4, for students who can already code.
6. Certificates, if any, last. Do not add the Google Cloud Professional ML Engineer certification as a start option: it costs
   $200 and Google recommends 3+ years of industry experience (checked 2026-11-11 on
   https://cloud.google.com/learn/certification/machine-learning-engineer).
