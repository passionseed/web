# Data Scientist: proposed production data fixes

Proposed only. Nothing here has been applied. Apply through the admin card editor (`RadarDraftEditor`), then run
`pnpm radar:dump data-scientist` and refresh `lib/radar-guide/__fixtures__/data-scientist.json`.

- Field id `8cc44322-ba64-4e00-8595-f6f40cd7f4f7`. Card ids are given by their first 8 characters.
- Source of the "before" text: the production dump of 2026-11-11.
- Facts verified on 2026-11-11; details in [`../factsheets/data-scientist.md`](../factsheets/data-scientist.md).

## 1. Dash sweep (`content_th`, `tagline_th`, `name_th`)

`name_th` ("นักวิทยาศาสตร์ข้อมูล") and `tagline_th` have no dashes. `content_th` has **22** (18 em dashes, 4 en dashes).

| # | Card | Path | Before | After |
|---|---|---|---|---|
| 1 | salaryProgression@40 `f3aaace9` | `levels.0.salary` | `$70,000–$100,000` | `$70,000-$100,000` (see also 2.6: the USD ladder has no source) |
| 2 | salaryProgression@40 `f3aaace9` | `levels.1.salary` | `$120,000–$160,000` | `$120,000-$160,000` |
| 3 | salaryProgression@40 `f3aaace9` | `levels.2.salary` | `$160,000–$200,000` | `$160,000-$200,000` |
| 4 | salaryProgression@40 `f3aaace9` | `levels.3.salary` | `$200,000–$350,000+` | `$200,000-$350,000+` |
| 5 | salaryProgression@40 `f3aaace9` | `levels_thb.0.note` | `เริ่มจากทำ dashboard, SQL query, ช่วย senior วิเคราะห์ — ต้องมี Python + SQL พื้นฐาน` | `เริ่มจากทำ dashboard, SQL query, ช่วย senior วิเคราะห์ ต้องมี Python + SQL พื้นฐาน` |
| 6 | salaryProgression@40 `f3aaace9` | `levels_thb.1.note` | `สร้าง model เอง ทำ A/B test, feature engineering — ต้องมี stats + ML จริง` | `สร้าง model เอง ทำ A/B test, feature engineering ต้องมี stats + ML จริง` |
| 7-9 | aiImpact@70 `afe41efc` | `verdict` (3 dashes) | see 2.2 | see 2.2 (rewritten together with the BLS fix) |
| 10 | marketThailand@80 `4ef608e3` | `body` | `...ไม่ได้ขัดกับตรงนี้ — คนส่วนใหญ่ได้งาน แต่การแข่งขัน...` | `...ไม่ได้ขัดกับตรงนี้: คนส่วนใหญ่ได้งาน แต่การแข่งขัน...` (also relabel per 2.8) |
| 11 | dayInLife@90 `d682492c` | `steps.1.detail` | `...หรือ Neural Network — ล้วนเป็นชื่อวิธีสอนโมเดลยอดนิยม ทำ feature engineering...` | `...หรือ Neural Network (ล้วนเป็นชื่อวิธีสอนโมเดลยอดนิยม) ทำ feature engineering...` |
| 12 | dayInLife@90 `d682492c` | `steps.1.detail` | `...precision, recall และ AUC — ตัวเลขที่บอกว่าโมเดลทำนายแม่นแค่ไหน` | `...precision, recall และ AUC ซึ่งเป็นตัวเลขที่บอกว่าโมเดลทำนายแม่นแค่ไหน` |
| 13 | realPeople@100 `aa45db8a` | `people.0.advice` | `อย่าติดกับแค่ tool — Python, R, Spark จะเปลี่ยน แต่ statistical thinking กับ business sense อยู่ตลอด` | `อย่าติดกับแค่ tool: Python, R, Spark จะเปลี่ยน แต่ statistical thinking กับ business sense อยู่ตลอด` (only if the card is kept; see 3) |
| 14 | realPeople@100 `aa45db8a` | `people.0.whereHeading` | `ตั้งเป้า Senior DS — ต้องเก่ง communication กับ business stakeholders มากขึ้น` | `ตั้งเป้า Senior DS: ต้องเก่ง communication กับ business stakeholders มากขึ้น` (only if kept) |
| 15 | risks@110 `1f4cacef` | `risks.1` | `ต้องเรียนรู้ตลอดเวลา — เครื่องมือเปลี่ยนทุกปี` | `ต้องเรียนรู้ตลอดเวลา เพราะเครื่องมือเปลี่ยนทุกปี` |
| 16 | text@125 skills `305ec55d` | `skills.0.description` | `...(ปัจจัยอื่นที่อาจทำให้สรุปผลผิด) — ไม่ใช่แค่รัน p-value แล้วจบ` | `...(ปัจจัยอื่นที่อาจทำให้สรุปผลผิด) ไม่ใช่แค่รัน p-value แล้วจบ` |
| 17 | text@125 skills `305ec55d` | `skills.2.description` | `เลือก algorithm ที่เหมาะกับปัญหา (classification, regression, clustering — ประเภทของโจทย์ทำนาย) tune...` | `เลือก algorithm ที่เหมาะกับปัญหา (classification, regression, clustering คือประเภทของโจทย์ทำนาย) tune...` |
| 18 | text@125 skills `305ec55d` | `skills.4.description` | `สร้าง features (ตัวแปรที่โมเดลใช้ทำนาย) ใหม่จากข้อมูลดิบที่ทำให้ model แม่นขึ้น — ทักษะนี้ AutoML ยังทำแทนได้ยาก` | `สร้าง features (ตัวแปรที่โมเดลใช้ทำนาย) ใหม่จากข้อมูลดิบที่ทำให้ model แม่นขึ้น เป็นทักษะที่ AutoML ยังทำแทนได้ยาก` |
| 19 | text@125 skills `305ec55d` | `skills.6.description` | `...และ metrics ก่อนรัน — ไม่ใช่ดู data แล้วสรุปย้อนหลัง` | `...และ metrics ก่อนรัน ไม่ใช่ดู data แล้วสรุปย้อนหลัง` |
| 20 | text@130 startCarousel `ba747cf5` | `options.0.description` | `เรียน data analytics ตั้งแต่ศูนย์ ครอบคลุม SQL, spreadsheet, Tableau, R — ได้ certificate จาก Google` | `เรียน data analytics ตั้งแต่ศูนย์ ครอบคลุม SQL, spreadsheet, Tableau, R และได้ certificate จาก Google` |
| 21 | text@130 startCarousel `ba747cf5` | `options.2.description` | `สอน statistics + ML ด้วยภาษาง่ายๆ มี animation ช่วยเข้าใจ — พื้นฐานที่ DS ทุกคนต้องมี` | `สอน statistics + ML ด้วยภาษาง่ายๆ มี animation ช่วยเข้าใจ เป็นพื้นฐานที่ DS ทุกคนต้องมี` |
| 22 | cta@140 `e57a8bec` | `resources.0.note` | `คอร์สสั้น Python, Pandas, ML — ฟรี มีใบรับรอง` | `คอร์สสั้น Python, Pandas, ML ฟรี มีใบรับรอง` |

Outside `content_th` (not linted by `radar:dump`, but rendered or stored): `research.metric_details.grad_employment_pct.en`
has one em dash ("% of graduates who get hired — not % of job postings..."); replace with a comma.

## 2. Outdated, misattributed or unsourced figures

### 2.1 hook@0 `d522b489`: BLS figure and "ทั่วโลก"

- `body` before: `ทุกบริษัทมีข้อมูลมหาศาล แต่หาคนที่เปลี่ยนข้อมูลดิบเป็นคำตอบที่ธุรกิจตัดสินใจได้ยากมาก นักวิทยาศาสตร์ข้อมูลคือคนที่ทำให้ตัวเลขมีความหมาย ทั่วโลกตำแหน่งนี้คาดว่าจะโต 34% ภายในปี 2034 (BLS สหรัฐฯ)`
- `body` after: `ทุกบริษัทมีข้อมูลมหาศาล แต่หาคนที่เปลี่ยนข้อมูลดิบเป็นคำตอบที่ธุรกิจตัดสินใจได้ยากมาก นักวิทยาศาสตร์ข้อมูลคือคนที่ทำให้ตัวเลขมีความหมาย ในสหรัฐฯ ตำแหน่งนี้คาดว่าจะโต 35% ช่วงปี 2025-2035 (BLS)`
- `statLabel` before: `ประกาศงาน Data/Analyst ในไทยโตขึ้นต่อปี (TDRI ไตรมาส 2/2568)`
- `statLabel` after: `ประกาศงาน Data Scientist/Analyst ในไทยโตขึ้นในปีเดียว (TDRI ไตรมาส 2/2567 เทียบ 2/2568)` (it is one year-on-year comparison, not a yearly rate)
- Source: BLS OOH, https://www.bls.gov/ooh/math/data-scientists.htm, "projected to grow 35 percent from 2025 to 2035" (page modified 2026-08-27, checked 2026-11-11). TDRI, https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/.

### 2.2 aiImpact@70 `afe41efc`: verdict (3 dashes, outdated BLS, faulty logic)

- before: `ยังไม่โดนแทนที่ — AI กำลังช่วยทำงาน routine ของ data scientist ให้เร็วขึ้น เช่น data cleaning, EDA เบื้องต้น และเขียนโค้ด boilerplate แต่งานที่สำคัญที่สุด — การตั้งโจทย์ การตีความผลลัพธ์ และการเชื่อมโยงกับบริบทธุรกิจ — ยังต้องการมนุษย์ BLS ยังคาดว่าอาชีพนี้จะโต 34% ถึงปี 2034 แปลว่า AI มาเสริม ไม่ใช่มาแทนที่`
- after: `ยังไม่โดนแทนที่: AI กำลังช่วยทำงาน routine ของ data scientist ให้เร็วขึ้น เช่น data cleaning, EDA เบื้องต้น และเขียนโค้ด boilerplate แต่งานที่สำคัญที่สุด คือการตั้งโจทย์ การตีความผลลัพธ์ และการเชื่อมโยงกับบริบทธุรกิจ ยังต้องใช้คน ในสหรัฐฯ BLS ยังคาดว่าอาชีพนี้จะโต 35% ช่วงปี 2025-2035 แต่งานซ้ำๆ ระดับแรกเข้าจะแข่งกันหนักขึ้น`
- Why: BLS 2025-35 projection (source above). A growth projection does not show that AI "augments" the job, so the "แปลว่า AI มาเสริม" conclusion is removed; the honest junior-layer risk (already in risks@110) is stated instead.

### 2.3 fantasyReality@10 `2fd41040`: "80%"

- `reality` before: `80% ของเวลาไปกับการทำความสะอาดข้อมูล แก้ missing values จัดรูปแบบ CSV/JSON และอธิบายผลลัพธ์ให้คนที่ไม่เข้าใจ statistics ฟัง`
- `reality` after: `เวลาส่วนใหญ่ไปกับการทำความสะอาดข้อมูล แก้ missing values จัดรูปแบบ CSV/JSON และอธิบายผลลัพธ์ให้คนที่ไม่เข้าใจ statistics ฟัง`
- Why: the 80% figure comes from blogs ([4] Qualify Nation, [6] Noble Desktop) repeating an unsourced folk statistic.

### 2.4 dayInLife@90 `d682492c`: "60-80%"

- `steps.0.detail` ending before: `...เพื่อเข้าใจข้อมูลก่อนตัดสินใจขั้นต่อไป งานนี้กินเวลาถึง 60-80% ของโปรเจกต์`
- after: `...เพื่อเข้าใจข้อมูลก่อนตัดสินใจขั้นต่อไป งานนี้มักกินเวลามากที่สุดของโปรเจกต์`
- Why: same as 2.3, and it contradicts the 80% there.

### 2.5 marketThailand@80 `4ef608e3`: openings with no source

- `openings` before: `~800 ตำแหน่ง (JobsDB ก.ค. 2569)`
- after: remove the field, or re-pull a dated count from JobsDB and add it as a source row. No `radar_sources` row backs the current figure.
- `companies` (SCB, KBTG, AIS, Agoda, Shopee, Central Group, True Digital) has no source either; keep only names backed by a current job ad, or drop.

### 2.6 salaryProgression@40 `f3aaace9`: unsourced ladders

- `levels_thb` (25,000-40,000 / 45,000-80,000 / 80,000-120,000 / 120,000-150,000+) cites [2] JobsDB and [3] Robert Walters, neither with a stored figure or quote. JobsDB now shows only ad averages (Data Analyst ฿33,500, Data Scientist ฿50,000, November 2026) and Robert Walters returns 403. Proposal: add the two JobsDB averages as dated source quotes (new ref [10] below for the Data Analyst page; update [2]), and attach a dated source for the junior range before it is spoken on camera.
- `levels` (USD, $70,000 to $350,000+) has no source and does not describe Thailand. Proposal: remove the USD ladder, or replace it with BLS May 2025 figures (P10 $67,240, median $120,230, P90 $199,130, US only).

### 2.7 research JSON (rendered on the careerSurvival card)

| Path | Before | After | Source |
|---|---|---|---|
| `global_metric_details.demand_growth.th` | `BLS คาดการณ์การเติบโต 34% สำหรับ data scientist ปี 2024-2034 อาชีพที่เติบโตเร็วอันดับ 4 ในสหรัฐฯ จ้างงานเพิ่มจาก 245,900 (2024) เป็น 328,300 (2034) เพิ่ม 82,500 ตำแหน่ง ~23,400 ตำแหน่ง/ปี` | `BLS คาดการณ์ว่า data scientist ในสหรัฐฯ จะโต 35% ช่วงปี 2025-2035 จาก 275,600 เป็น 371,000 ตำแหน่ง (เพิ่ม 95,400) เปิดรับเฉลี่ยราว 24,800 ตำแหน่งต่อปี` | BLS OOH (checked 2026-11-11). "อันดับ 4" dropped: not re-checked against the 2025-35 list. |
| `global_metric_details.demand_growth.source` | `BLS Occupational Outlook Handbook: Data Scientists 2024-2034` | `BLS Occupational Outlook Handbook: Data Scientists 2025-2035` | BLS |
| `global_metric_details.salary_floor.th` | `BLS รายงาน P10 ของ data scientist ที่ $58,510/ปี (~$4,876/เดือน) คนจบ bootcamp ระดับ entry ในสหรัฐฯ มักได้ $85,000-$120,000` | `BLS รายงาน P10 ของ data scientist ในสหรัฐฯ ที่ $67,240/ปี (~$5,603/เดือน, พ.ค. 2568)` | BLS May 2025 wages. Bootcamp claim dropped (no source). |
| `global_metrics.salary_floor` | `4876` | `5603` | 67,240 / 12 |
| `global_metric_details.salary_ceiling.th` | `BLS P90 อยู่ที่ $174,790/ปี (~$14,566/เดือน) Senior DS ที่ FAANG ได้ $200,000-$350,000+ รวม equity 365 Data Science รายงานช่วงเงินเดือนเฉลี่ย DS ที่ $160,000-$200,000` | `BLS P90 ของ data scientist ในสหรัฐฯ อยู่ที่ $199,130/ปี (~$16,594/เดือน, พ.ค. 2568)` | BLS May 2025. FAANG and 365DS claims dropped (no source / course seller). |
| `global_metrics.salary_ceiling` | `14566` | `16594` | 199,130 / 12 |
| `metric_details.demand_growth.source` / `.source_url` | `TDRI Big Data Labour Market Report Q2/2025` / `https://tdri.or.th/2025/08/bigdata-report-labourmarket-q2-2025/` | `TDRI: ตลาดงาน AI ไทยโต แต่ทักษะคนยังไม่ทัน (ส.ค. 2568)` / `https://tdri.or.th/2025/08/ai-job-market-2tracked-growth/` | Misattributed: the 2,129 to 2,618 (+23%) figure is in the AI job market article, not the Big Data report. |
| `metric_details.salary_floor.th` | `JobsDB Thailand (ก.ค. 2569) รายงาน Data Scientist ระดับ P10 ที่ 18,000 บาท/เดือน Junior DS เริ่มจริงที่ 25,000-35,000 บาทในกรุงเทพ` | `JobsDB (พ.ย. 2569): ค่าเฉลี่ยในประกาศงาน Data Analyst 33,500 บาท/เดือน และ Data Scientist ในกรุงเทพฯ 50,000 บาท/เดือน (เฉลี่ยจากช่วงเงินเดือนที่นายจ้างระบุในประกาศ ทุกระดับ)` | JobsDB pages (checked 2026-11-11) no longer show P10/P90. Keep `metrics.salary_floor` 25000 only once a dated junior source is attached. |
| `metric_details.salary_ceiling.th` | `JobsDB Thailand P90 อยู่ที่ 114,000 บาท/เดือน Lead Data Scientist รายงานที่ 170,000+ บาท/เดือนใน Glassdoor Head of Data/CDO ที่ธนาคารใหญ่เกิน 200,000 บาทรวมโบนัส` | Re-source or mark as estimate: the JobsDB P90 is no longer published and Glassdoor/CDO figures have no stored URL. | n/a |
| `metric_details.saturation_level.th`, `global_metric_details.saturation_level.th` | `...Data Scientist ถูก layoff เพียง 3% เทียบกับ 22% สำหรับ SWE...` | Remove the 3% / 22% figures (US data from a course seller, 365 Data Science). | n/a |
| `global_metric_details.progression_difficulty.th`, `global_metric_details.grad_employment_pct.th` | 54% master's, 24% PhD, Python 57% vs 78%, NLP 5% to 19%, ~78% employed, $103,580 vs $49,500 | Label clearly as US posting data from 365 Data Science, or remove. | n/a |
| `reasoning` (not rendered) | `BLS คาดการณ์การเติบโต 34% ภายในปี 2024-2034 ซึ่งเร็วกว่าค่าเฉลี่ยทุกอาชีพ 11 เท่า และเป็นอาชีพที่เติบโตเร็วอันดับ 4 ในสหรัฐฯ ...` | `BLS คาดการณ์ว่า data scientist ในสหรัฐฯ จะโต 35% ช่วงปี 2025-2035 ...` (drop "11 เท่า" and "อันดับ 4") | BLS |
| `sources.0.title` | `Occupational Outlook Handbook: Data Scientists (2024-2034)` | `Occupational Outlook Handbook: Data Scientists (2025-2035)` | BLS |

### 2.8 Labels (covered by spec 2.9, listed for this career)

- marketThailand@80 `body` quotes `'อัตราการจ้างจบใหม่ 67%'`. After the relabel, change it to `'คะแนนโอกาสงานจบใหม่ 67 (ทีมเราประเมิน)'` so the body matches the new careerSurvival label.

### 2.9 `radar_sources` rows

| ref | Change |
|---|---|
| 1 (BLS) | `quote_th` before: `BLS คาดการณ์ตำแหน่ง Data Scientist ในสหรัฐฯ โต 34% ช่วง 2024-2034 เร็วกว่าค่าเฉลี่ยของทุกอาชีพมาก มีตำแหน่งเปิดใหม่เฉลี่ยราว 23,400 ตำแหน่งต่อปี`; after: `BLS คาดการณ์ตำแหน่ง Data Scientist ในสหรัฐฯ โต 35% ช่วง 2025-2035 มีตำแหน่งเปิดใหม่เฉลี่ยราว 24,800 ตำแหน่งต่อปี ค่าจ้างมัธยฐาน $120,230 (พ.ค. 2568)`; `accessed_at` 2026-11-11. |
| 2 (JobsDB DS) | Add `quote_th`: `ค่าเฉลี่ยในประกาศงาน Data Scientist กรุงเทพฯ 50,000 บาท/เดือน (พ.ย. 2569) คำนวณจากช่วงเงินเดือนที่นายจ้างระบุในประกาศ`; `accessed_at` 2026-11-11. |
| 8 (TDRI AI jobs) | Add `quote_th`: `ประกาศงาน Data Scientist/Data Analyst 2,129 ตำแหน่ง (ไตรมาส 2/2567) เป็น 2,618 (ไตรมาส 2/2568) เพิ่มราว 23%`; `published_at` 2025-08-25. |
| 9 (TDRI Big Data) | Add `quote_th`: `สาขาวิทยาการคอมพิวเตอร์: ประกาศที่รับประสบการณ์ 0-2 ปี 3,088 ตำแหน่ง ในนั้น 376 ตำแหน่งไม่ต้องมีประสบการณ์ (ประกาศ ก.ค. 2567 ถึง มิ.ย. 2568)`; `published_at` 2025-08-28. |
| 10 (new) | JobsDB, "Data Analyst Salary in Thailand", https://th.jobsdb.com/career-advice/role/data-analyst/salary, quote `ค่าเฉลี่ยในประกาศงาน Data Analyst 33,500 บาท/เดือน (พ.ย. 2569)`, accessed 2026-11-11. |
| 11 (new) | Kaggle, "Titanic Tutorial", https://www.kaggle.com/code/alexisbcook/titanic-tutorial, accessed 2026-11-11 (for the first start option). |
| 4, 5, 6 | Blogs and a course seller. Keep only where a card has nothing better; do not cite them for numbers. |

## 3. Composite person: hide realPeople@100 `aa45db8a`

Set `is_hidden = true`. Its `publisher` is "Composite from BLS/365 Data Science career data", but the card is titled
"เส้นทางของคนที่ทำจริง" with eyebrow "คนจริงในสายนี้". Bring it back only with a real, consenting person.

## 4. Start options: free first step first, certificates last

The rule (spec 7.1 and 9): the first start option is free, takes under 2 hours and ends with something the student made;
certificates go last. Data scientist's first option today is a 6-month paid certificate.

### 4.1 startCarousel text@130 `ba747cf5` (hidden on the page today, but the source of the options)

Order before: 1 Google Data Analytics Certificate, 2 Kaggle Competitions, 3 StatQuest, 4 วิเคราะห์ข้อมูลที่สนใจด้วย Python.

Order after:

1. **Kaggle Titanic** (rewrite of option 2)
   - `title`: `Kaggle Titanic: ส่งคำตอบแรก`
   - `url`: `https://www.kaggle.com/code/alexisbcook/titanic-tutorial`
   - `cost`: `ฟรี`
   - `duration`: `ไม่ถึง 2 ชั่วโมง` (our estimate)
   - `type`: `ลองทำ`
   - `cta`: `อยากลองโจทย์นี้`
   - `description`: `ทำตาม Titanic Tutorial จนส่งไฟล์ทำนายผลขึ้นกระดานคะแนน ได้ notebook ชิ้นแรกของตัวเอง แล้วค่อยขยับไปโจทย์อื่นบน Kaggle`
2. **วิเคราะห์ข้อมูลที่สนใจด้วย Python** (was option 4, unchanged)
3. **StatQuest with Josh Starmer** (was option 3; dash fix #21)
4. **Google Data Analytics Certificate** (was option 1, moved last)
   - `cost` before `ฟรี (audit) / $49/mo`; after `ทดลองฟรี 7 วัน แล้ว $49/เดือน (มีทุนช่วยเหลือ)`
   - `duration` before `6 เดือน`; after `6 เดือน (ราว 10 ชม./สัปดาห์)`
   - Source: https://www.coursera.org/professional-certificates/google-data-analytics (checked 2026-11-11: 9 courses, "6 months at 10 hours a week", $49/month in the US and Canada after a 7-day free trial, financial aid available, no audit option stated).

### 4.2 `radar_skill_start_options` for the primary skill (what the page actually renders)

The `start` chapter renders the `RadarSkillExperience` rail from `radar_field_skills` and `radar_skill_start_options`,
not the hidden startCarousel. An anon read of `radar_field_skills` for this field returned no rows (RLS or no mapping),
so the live order could not be checked. In admin:

- Confirm data-scientist has a primary skill mapped. Without one, the `start` chapter has no cards and is skipped
  (spec 2.2), and the recorded `start` clip would have nowhere to sit except as a video-only chapter.
- Set `sort_order` so the first option is the Kaggle Titanic first submission (free, under 2 hours, ends with a submission
  and a notebook), and any certificate is last.
