# Mechanical Engineer (วิศวกรเครื่องกล): fact sheet for Level 1

- Guide: `lib/radar-guides/mechanical-engineer/` (draft, asOf 2026-11-20). Facts live in `facts.ts`; this page records how each one was checked and what was left out.
- Started from the DB deck dump (field row, 12 cards, 6 sources, research JSON). None of the deck's figures are used in Level 1: they are salary, job-count and US data, which stay on the Level 2 deck.
- Every fact below was opened at its source on 2026-11-19 or 2026-11-20.
- Grades: **A** primary source we checked, exact number. **B** secondary source with a date, or the subject's own figure reported by the press. **C** our estimate, a blog, or no source. **X** do not use. Only A and B appear in the guide.

## Claims used in the guide

| # | Fact id | Where | Claim (as shown) | Source URL | Grade | Note |
|---|---|---|---|---|---|---|
| 1 | `f.me-thai-train` | dream: intel card, guess game, stat card, og; work: debrief | "รถไฟไทยทำ", a prototype passenger car from a KMITL-led project, handed to the State Railway on 3 ก.ค. 2569; ran **more than 10,000 km** of tests; **44.1%** of parts made in Thailand; body about **22%** lighter; 25 seats, 24 m | https://www.posttoday.com/smart-city/744879 (2026-07-03), https://www.dailynews.co.th/news/5959448/ (2026-06-19) | B (vendor badge) | PostToday: "สูงถึงร้อยละ 44.1", "น้ำหนักเบาลงร้อยละ 22", "กว่า 10,000 กิโลเมตร", "ความเร็วสูงสุด 120 กิโลเมตรต่อชั่วโมง", "ขนาด 25 ที่นั่ง". Daily News: "มีความยาว 24 เมตร", "มีที่นั่ง 25 ที่", local parts "ประมาณ 44%", handover set for 3 Jul 2569 at Hua Lamphong. All figures are the project's own, reported at the handover, so they carry the vendor badge and the dream level says so ("พูดตรงๆ"). Copy always says กว่า 10,000. |
| 2 | `f.me-ecomarathon` | dream: flip card 1, reel variant | Team Virgin, วิทยาลัยเทคนิคสกลนคร, 1st in the prototype class (combustion engine), Shell Eco-marathon Asia Pacific and Middle East 2023; ethanol, **1,867.8 km** equivalent on 1 litre | https://www.thairath.co.th/news/local/2711384 (2023-07-21) | A | Quote: "1 ลิตรสามารถวิ่งได้เทียบเท่าระยะทางไกลถึง 1,867.8 กิโลเมตร", "ด้วยน้ำมัน Ethanol". Copy says "วิ่งได้เทียบเท่า" (an extrapolated figure, not a distance driven) and "เอทานอล". The article gives no ages or ปวช./ปวส. level, so copy says "เด็กวิทยาลัยเทคนิค" / "นักศึกษา" only. Shell's own results pages are JavaScript-only and returned nothing to the fetcher. |
| 3 | `f.me-car-output` | dream: flip card 2; work: kinds facts | Thailand produced **1,455,569** cars in 2568 (ส.อ.ท.) | https://www.infoquest.co.th/?p=564712 (2026-01-28) | A | Quote: "ประเทศไทยสามารถผลิตรถยนต์ได้รวมทั้งสิ้น 1,455,569 คัน", spokesperson of the FTI automotive group. |
| 4 | `f.me-aircon-export` | dream: flip card 3; work: kinds facts | In 2567 Thailand exported **more than 21 million** wall-type air conditioners; **3rd** largest exporter after China and Mexico | https://www.thansettakij.com/business/marketing/633316 (2025-07-19) | A | Quote: "ในปี 2567 มียอดส่งออกเครื่องปรับอากาศแบบติดผนังมากกว่า 21 ล้านเครื่อง", "ไทยเป็นผู้ส่งออกเครื่องปรับอากาศรายใหญ่อันดับ 3 ของโลก รองจากจีนและเม็กซิโก". Search snippets of older pieces (Matichon, Marketeer, not opened) say 2nd in the world from 2022 and 2023 data; that is banned in `banned.ts`. `radar:check` warns on "21 ล้าน" as a spelled-out number; it is backed by this fact. |
| 5 | `sim.me-fan` | work: both sort games | The classroom fan brief and the prototype test results | (simulated) | sim | Invented for the game. Failure modes are textbook ones: cracks starting at a sharp corner (stress concentration), plastic going brittle in sunlight (UV), a stand that tips (base and centre of gravity), a finger-sized gap in the guard (appliance finger-probe tests), a steel grille that rusts. No digits in the game copy. |
| 6 | `f.me-excalidraw` | tonight: tool card, practice room | Excalidraw: free and open source (MIT), autosaves to the browser, exports PNG/SVG | https://github.com/excalidraw/excalidraw (README, read 2026-11-19) | A | Quote: "Free & open-source", "Local-first support (autosaves to the browser)", "Export to PNG, SVG & clipboard". The README does not say whether an account is needed, so copy never says ไม่ต้องสร้างบัญชี. Paper works just as well and the card says so. |
| 7 | `f.me-mytcas-fields` | round1 (Level 2): mytcas link | mytcas lists programmes under วิศวกรรมเครื่องกล, วิศวกรรมยานยนต์, วิศวกรรมหุ่นยนต์ and วิศวกรรมเมคคาทรอนิกส์ | https://course.mytcas.com/programs/10010121300701A and three more in `facts.ts`; feed https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas/courses.json | A | Read from the TCAS70 course feed on 2026-11-19: 92 programmes matched เครื่องกล (40 universities), 25 ยานยนต์ (20), 23 หุ่นยนต์ (19), 25 เมคคาทรอนิกส์ (17). Counts are not printed (they change during the cycle). course.mytcas.com has no search URL (its routes are `/`, `/programs/:id`, `/universities/...`), so the link opens its home page. |

## Not used, and why

| Claim | Where it lives | Grade | Reason |
|---|---|---|---|
| Thai salaries: median 30,500, P10 14,000, P90 50,000, new graduates 18,000 to 26,000, managers 70,000 to 100,000+ | research.metrics, salaryProgression@40, JobsDB salary page | B to C | Level 1 carries no salary numbers (brief). The ladder mixes JobsDB percentiles with unsourced bands. Banned in `banned.ts`; Level 2 deck only. |
| BLS +9% growth 2024 to 2034, 18,100 openings a year, US salaries | hook@0, global_metric_details | A (US only) | US data on a Thai Level 1. Banned (`9%`). |
| 618 (or 600 to 650) Thai job postings | marketThailand@80, Glassdoor | C | Undated platform snapshot, not reopened. Banned. |
| AI: predictive maintenance "43%", QC "95 to 99%" | aiImpact@70 | C | Vendor blog (Neural Concept). Banned. |
| "40% of the time is communication" | text@125 | C | No source. Banned. |
| "ต้องมีใบ กว. ถึงจะทำงานได้" | metric_details, risks@110 | C | Overstated: a COE licence is needed for controlled engineering work, not every job. Kept off Level 1 (banned). |
| CareerVillage "real person" (Senior ME at a Japanese OEM in Thailand) | realPeople@100 | C | Not reopened. An unnamed profile on a US Q&A site; Level 1 tells no personal story, so it is left out. |
| RMUTP Racing 892.5 km/l (2024, runner-up) | Motorival, 2024-07-12 | A | Verified, not needed: one eco-marathon card is enough. Good for a later reel. |
| ABU Robocon 2025 Thailand award | aburobocon2025.mnb.mn | X | The organiser's pages contradict each other on which country won the ROHM Award. |
| Shell Eco-marathon 2025 and 2026 Thai results | shellecomarathon.com | not found | Both events were in Qatar; no Thai result found in Thai or English press. |

## Kinds of mechanical engineer (work level)

The five tiles (cooling, cars and EV, factories, robots, energy) are qualitative and carry no numbers. Cars and cooling are the two biggest Thai examples (facts 3 and 4); automotive, robotics and mechatronics are real programme fields on mytcas (fact 7). Cooling is the kind the work game just played (the fan).

## Safety and tone notes

- Tonight is a teardown: only things with no plug and no battery (a click pen, a stapler, a clothes peg, a wind-up toy). A fan may only be looked at from outside, unplugged, never opened. Ask the owner first. The pinned safety block and the write-up's fixed line both say this.
- The write-up stays on the device. Excalidraw is optional.
- Students are minors: no 1:1 contact anywhere; the ending is follow and save, with SHIFT as one line (shared outro).
- Never "น้องๆ", no dashes, no prices, no admission promises (shared round 1 level).
