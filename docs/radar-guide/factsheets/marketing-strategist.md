# Marketing (นักการตลาด): fact sheet

- Guide: `lib/radar-guides/marketing-strategist/` (Level 1, draft, as of 2026-11-20). Alias `mkt`. Facts in `facts.ts`, must-not-say list in `banned.ts`.
- Field: slug `marketing-strategist`, DB name นักกลยุทธ์การตลาด, tier `shifting`, `is_published` false (publishing is a founder step). The guide says **นักการตลาด**: it is what students say ("อยากเป็นนักการตลาด", "เรียนการตลาด"), it is the first alias in the DB research, and Level 1 covers the whole career (brand, online ads, insight, product, social), not only strategy.
- Built from the DB dump (field row, 13 cards, 6 sources, research JSON). Almost every figure in that dump is US data (BLS, ContentGrip) or a salary (Level 2 only), so Level 1 uses new Thai sources. Every URL below was opened on 2026-11-19 or 2026-11-20.

Grades: **A** primary source we checked, with the exact wording or number. **B** secondary source with a date. **C** our estimate, a blog or course seller, or no source. **X** do not say.

## Claims used in Level 1

| # | Claim (as used) | Number | Level / block | Source | Grade | as_of | Verification note |
|---|---|---|---|---|---|---|---|
| M1 | หมีเนย is the mascot of Butterbear, a small dessert shop at EmSphere, made to give the brand an image people remember. Fans are mostly working adults (Gen Y, Gen X), not small children, many calling themselves มัมหมี; they want a break from work stress, and the bear recalls childhood teddy bears; it shows up on every platform. | none | dream: intel-origin, clues sort (adults, stress, teddy) | [InfoQuest, 16 ส.ค. 2567](https://www.infoquest.co.th/2024/422085) (interview with ผศ.ดร.นพพร เรืองวานิช, Thammasat Commerce and Accountancy); [Thairath Money, 2 ก.ค. 2567](https://www.thairath.co.th/money/business_marketing/marketing/2797670) | B | 2026-11-20 | An expert's reading of the fans, not a survey: copy says ส่วนใหญ่, never a share. Thairath: Thai dessert brand under Coffee Beans by Dao, at EMSPHERE; fans call it ฮีลใจ. Fact `f.mkt-butterbear-fans`. |
| M2 | A Chinese tourist filmed the bear dancing outside EmSphere; the clip went viral in China, which first spread it abroad. Fans queue for the weekly meet and greet from as early as 4:30 am. | 4:30 (said as ตี 4 กว่าๆ) | dream: clues sort (fan-clip, tourists), queue line | [Inside Retail Asia, 30 Jul 2024](https://insideretail.asia/2024/07/30/how-a-cute-mascot-turned-thai-bakery-chain-butterbear-into-a-phenomenon/); InfoQuest (M1) | B | 2026-11-20 | Two outlets for the clip; the queue time is Inside Retail's only. Fact `f.mkt-butterbear-china`. |
| M3 | Zanroo counted 13,599,968 engagements (about 13.6 million) about Butterbear on social media, 1 to 12 June 2024; TikTok 73.3%, X 26.1%. | 13.6 ล้าน, 12, 73.3% | dream: guess game, stat item, og, reel hook; work: insight kind tile | [Marketing Oops, 13 Jun 2024](https://www.marketingoops.com/?p=326969) | B | 2026-11-20 | Third-party social listening (not the brand's own number). Engagement counts interactions, not people. Fact `f.mkt-butterbear-buzz`. Radar check warns on "ล้าน" (a spelled number the fact backs), as for ViaBus "10 ล้าน". |
| M4 | A Chula marketing lecturer: mascots build fans, not just customers; timing and luck matter too, so brands keep investing. | none | dream: honesty item ("ไม่มีใครสั่งให้ไวรัลได้") | Thairath (M1) | B | 2026-11-20 | Fact `f.mkt-mascot-luck`. Keeps the dream honest: luck is part of it. |
| M5 | A marketing plan states the goal, target customers, methods, budget and expected results; measuring results compares actual results with the target. | none | work: debrief line; tonight: plan-parts item and the EvidenceMaker room link | [Marketeer, 22 Aug 2024](https://marketeeronline.co/archives/371763) (Dr. Kasem Pipatseritham) | B | 2026-11-20 | Free to read, no log-in (checked 2026-11-20). Fact `f.mkt-plan`. |
| S1 | The toast shop, its ideas and every count in the work games. | 8, 13, 2,400, 200, 1, 25, 0 | work: ideas and results sorts | simulated | n/a | 2026-11-20 | `sim.mkt-shop`, watermarked ตัวอย่างจำลอง. Built on M5's plan-and-measure loop. |
| S2 | Tonight's targets: 10 more students, ask 3 friends. | 10, 3 | tonight | our practice goal | n/a | 2026-11-20 | `sim.mkt-tonight`: a target the guide sets, shown in the sources sheet as จำลอง. |

Round 1 (Level 2) uses the shared TCAS facts. Faculties were checked in the TCAS70 mytcas course feed (`courses.json`, 2026-11-20): 79 programmes in the field การตลาด, mostly in business administration and management science faculties; advertising sits in communication arts (field โฆษณา, and majors inside นิเทศศาสตร์ programmes). The link label names "บริหารธุรกิจ สาขาการตลาด และนิเทศศาสตร์ สาขาโฆษณา". course.mytcas.com has no search URL (the search box is client-side), so the link opens its home page. No count is printed.

## Kinds of marketer (work level grid)

ดูแลแบรนด์ (brand, played), ยิงแอดออนไลน์ (digital and performance), เจาะอินไซต์ (consumer insight and research), การตลาดสินค้า (product marketing), ดูแลโซเชียล (social and content). Checked against Thai job boards on 2026-11-19: JobThai's marketing category "Brand/Product Marketing" (titles such as Brand Manager, Product Manager, Brand & Growth Marketing Manager), and JobsDB searches for brand manager, consumer insights, digital marketing, performance marketing and content marketing roles. The lines describe the work and carry no numbers; the insight tile cites M3.

## Not used, and why

| Claim | Where it lives | Grade | Reason |
|---|---|---|---|
| BLS 6% growth 2024 to 2034, 36,400 openings a year, median $161,030 | hook@0 stat, research, sources[1] | A (US) | US data; Level 1 has no market figures. Banned in `banned.ts`. |
| 75% of marketers use AI, 80% for content, 30% of CMOs ready to scale AI | hook@0, aiImpact@70, sources[4] | C | ContentGrip summary, no primary survey named. Banned. |
| 58% overwhelmed, Gartner 70%+ stretched, LinkedIn 32% job change | insights, risks@110, fantasyReality@10 | C | No primary sources in the deck. Banned. |
| About 264 Marketing Manager jobs on Glassdoor (Apr 2026) | marketThailand@80 | C | Stale snapshot, not a market size. Banned. |
| JobsDB 25,000-38,000 entry, 65,750 median, up to 97,000; PayScale 819,512/yr | salaryProgression@40, metric_details | B | Salaries stay on Level 2. Banned on Level 1. |
| A CMO's company sales +31%, profit +168% | realPeople@100, sources[5] | C | Secondary profile; a company's results, off topic for students. Banned. |
| Douyin clip over 16 million views and 5 million likes | Inside Retail | C | Single source; the clip is told without numbers. Banned. |
| Butterbear company revenue (DBD filings via PPTV); spend per bill 300 to 1,500 baht | search results | B / C | Money figures stay off Level 1, and per-bill has no primary source. Banned. |
| Brand names in the start carousel (Grab, LINE MAN, ตี๋น้อย, KFC) and agency names | text@130, marketThailand@80 | n/a | Not needed; Level 1 names one public case only. |

## Safety and tone notes

- Butterbear is told from the news. The dream's honesty card says "เรื่องนี้เล่าจากข่าว เราไม่ได้ทำงานกับแบรนด์นี้", and `banned.ts` blocks wording that implies a partnership or sponsorship. No logo or mascot likeness in the art.
- Tonight is free and needs no account. Students are minors: the pinned safety line says not to message the shop or strangers; the plan uses only what they see from outside and what friends say. Taking the plan to the shop means going with a teacher or parent. The write-up stays on the device.
- No price or baht figure anywhere on Level 1. The work level's "ลดราคา" answer is a concept, not a number.
- Thai copy was drafted, rewritten by Gemini (agy, gemini-4-neon-high), then checked line by line against the house rules (no dashes, no น้องๆ, เธอ, box lengths). The Cursor and Codex review from AGENTS.md is still to do.
