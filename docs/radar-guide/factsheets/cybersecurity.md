# Cybersecurity: script fact sheet

Script: `docs/radar-guide/scripts/cybersecurity.json` (version 1, as_of 2026-11-11, all 7 chapters).
Session 1 records `money`, `ai`, `start`. The rest are written so the page has full transcripts.

Grades: **A** = primary source checked on 2026-11-11, or a primary page with an exact figure.
**B** = dated secondary source or platform snapshot. **C** = our estimate, blog, course seller or no source.
**X** = do not say. Only A and B appear in the script.

`ref` = `radar_sources.ref` for this field. "new" means the source is not in `radar_sources` yet (see
`content-fixes/cybersecurity.md`).

## Claims used in the script

| # | Claim (as used) | Chapter.beat | Source URL | ref | Grade | as_of | Verification note (2026-11-11) |
|---|---|---|---|---|---|---|---|
| 1 | Cybersecurity is protecting information by preventing, detecting and responding to attacks | hook.0 | https://csrc.nist.gov/glossary/term/cybersecurity | new (replaces [1]) | A | 2026-11-11 | The stored ref [1] `https://www.nist.gov/cybersecurity/what-cybersecurity` now returns **404**. The CSRC glossary entry carries this definition. |
| 2 | O*NET task list: monitor data files and access; review security violations; risk assessments and tests of systems; document security policies, procedures and tests; train users and promote security awareness; monitor reports of viruses to decide when to update protection | hook.0, reality.1-3, day.0-3 | https://www.onetonline.org/link/summary/15-1212.00 | 13 | A | 2026-10-06 (page updated date) | Fetched. O*NET does **not** list penetration testing or "reports" by name. The script frames testing as "ทดสอบเจาะระบบ ... เฉพาะระบบที่ได้รับอนุญาต", backed by "execute tests of data processing system". These are US task types, not one Thai person's day; `day.0` says so on screen. |
| 3 | US BLS: information security analysts **+21% from 2025 to 2035**, "much faster than the average for all occupations"; the all-occupation average is **3%** | hook.1 | https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm | 12 | A | 2026-08-27 (page last modified) | Fetched. Also on the page: about **14,100 openings a year**, **192,900 jobs (2025)**, median pay **$129,180 (May 2025)**. US only, so the line starts "ในอเมริกา". The DB still says 29% (2024-34) and 16,000 a year: outdated. |
| 4 | JobsDB Thailand, Security Engineer: **average ฿35,500/month**, title dated **November 2026**, "based on full-time salary ranges disclosed by employers on Jobsdb job ads" | money.0-1, money reel variant 3 | https://th.jobsdb.com/career-advice/role/security-engineer/salary | 2 | A | 2026-11 | Fetched. The page shows **one average and no range or levels**, and every province shows the same ฿35,500, so it is effectively a national figure. It also says "some disclosed salaries include superannuation and other salary benefits, while others don't", so the script does not call it "รายได้รวม" or a starting salary. The money claims use `level: "average"`, and the hook avoids จบใหม่/เริ่ม so the entry-level rule does not apply. |
| 5 | Most Thai cyber listings ask for experience (said without numbers) | money.2 | https://th.linkedin.com/jobs/cyber-security-jobs | 14 | B | 2026-07-21 | The July snapshot on the marketThailand card (222 results, 34 low-experience, 133 mid-senior) **could not be re-checked**: logged out, the page now shows **405** jobs and no experience breakdown. The script states the direction only, with no numbers. |
| 6 | ISC2 2025 (global, **16,029** respondents): **59%** cite critical or significant skills needs (44% in 2024) | money.3 | https://www.isc2.org/Insights/2025/12/2025-ISC2-Cybersecurity-Workforce-Study | new | A | 2025-12-04 | Fetched. ISC2 **stopped publishing the workforce-gap estimate** in this study: "ISC2 has not included an estimate of the cybersecurity workforce gap this year." |
| 7 | ISC2 2025: **73%** say AI will create more specialized cybersecurity skills; people expect "roles to emerge and evolve" rather than be replaced | ai.2 | same as 6 | new | A | 2025-12-04 | Fetched. "กว่า 16,000 คน" rounds 16,029 down. |
| 8 | ISC2 2025: AI is the most pressing skills need, cited by **41%** | ai.3 | same as 6 | new | A | 2025-12-04 | Fetched. |
| 9 | ISC2 2024: AI may take over some tasks but won't replace the human skill set; two-thirds are confident their expertise will complement AI (one-third are concerned) | ai.0-1 | https://www.isc2.org/Insights/2024/10/ISC2-2024-Cybersecurity-Workforce-Study | 7 | B | 2024-10-31 | Fetched. The quote is accurate, but it is the 2024 survey and the examples of automated tasks (log monitoring, basic scanning) are our card's reading of it. Graded B; no number spoken. |
| 10 | Cyber bachelor programs sit under computer engineering, computer science and IT fields; examples: KMITL (วศ.บ. วิศวกรรมคอมพิวเตอร์และความปลอดภัยไซเบอร์, 10160101300504A), KKU (วท.บ. ความมั่นคงปลอดภัยไซเบอร์, 10030138220204A), CMU (วศ.บ. ระบบสารสนเทศและความมั่นคงปลอดภัยไซเบอร์, 10040106300502E), TU (วท.บ. คอมพิวเตอร์เครือข่ายและความปลอดภัยทางไซเบอร์, โครงการพิเศษ, 10050209220202B) | study.0-1 | https://course.mytcas.com/programs/10160101300504A (and the other program ids) | new | B | 2026-03-11 | Read from our `tcas_programs` table (scraped from mytcas on 2026-03-11, so TCAS69). course.mytcas.com now serves **TCAS70** and renders client-side, so the program pages could not be re-read. "TCAS69" is on screen. **Before recording `study`, confirm these four programs are listed in TCAS70.** Other matches in the table: SWU (international), Ubon Ratchathani (IT major), Suan Dusit, UTCC. |
| 11 | Fees vary widely, some are special programs (TU 366,460 THB total, CMU 400,000 THB, KMITL 50,000 THB per semester, as stored) | study.2 | https://course.mytcas.com/programs/10050209220202B | new | B | 2026-03-11 | `tcas_programs.cost` as scraped. No fee is spoken; the line only says fees vary. |
| 12 | TryHackMe "Intro to Offensive Security": "Hack your first website (legally in a safe environment) and experience an ethical hacker's job", listed in TryHackMe's free-training guide | start.0-1, `first_step` | https://tryhackme.com/resources/blog/free-offensive-security-training | new | B | 2023-11-28 | Fetched (vendor's own page). It is the first room of the Pre Security path. The room page itself (https://tryhackme.com/room/offensivesecurityintro) sits behind a bot checkpoint and could not be read. The fake-bank practice site and the ~15 minute length come from third-party walkthroughs (C) and are **not spoken as numbers**. **Before recording `start`: open the room on a free account and confirm it is free and finishes in under an hour, including a short write-up.** |
| 13 | Fallback first step, if the offensive room is gated: TryHackMe "Defensive Security Intro" ("Every room below is 100% free"; "Most beginner rooms take 30 minutes to 2 hours") | not in script | https://tryhackme.com/resources/blog/free-tryhackme-training-to-learn-cyber-security-in-2026 | new | B | 2026-08-19 | Fetched. Use this if claim 12 fails the check. |

Lines with no number carry no claim when they are opinion or framing: the safety lines, "ชอบสืบ ชอบเก็บรายละเอียด", "คนที่มีหลักฐานว่าทำได้จริง", the risks line on `day` (from the risks card, no source), and the "ลองแล็บก่อนเลือกคณะ" advice.

## Safety (spec 7.1)

Every chapter that mentions testing or attacking systems (hook, reality, day, start) has a beat with `"safety": true`
whose `say_th` contains "ระบบที่ได้รับอนุญาต". `start` uses the suggested line almost verbatim:
"ฝึกเฉพาะในแล็บหรือระบบที่ได้รับอนุญาตเท่านั้น ห้ามลองกับระบบที่ไม่ได้รับอนุญาตเด็ดขาด ผิดกฎหมาย".
Keep the founder's face on screen for that line; do not cut it from any reel made from `start`.

## Lint result (2026-11-11)

`lintCareerScriptFile` passes with no errors. Spoken length at 13 chars/s: hook 23.2s, reality 28.8s, money 32.5s,
ai 29.8s, day 27.9s, study 24.5s, start 30.5s. Hooks are 26 to 39 characters; all hook variants are 40 characters or fewer.

## Figures checked and deliberately left out

| Figure | Where it lives | Why it is out |
|---|---|---|
| Entry 25k-35k, mid 35k-55k, senior 70k+ THB (salaryProgression ladder) | card salaryProgression@40, `research.metrics` | JobsDB now shows a single average (35,500), so the ladder **cannot be re-verified**. Mid and senior were editorial estimates; ref [4] is the generic LinkedIn jobs homepage. Not spoken. |
| ISC2 2024 gap of 4,763,963 people (+19.1%) | `metric_details.saturation_level`, `grad_employment_pct` | Accurate for 2024, but ISC2 **dropped the gap estimate in its 2025 study**, so it is no longer the latest figure. The script uses ISC2 2025's skills-gap finding (59%) instead. |
| ISC2 2024 "67% have a staffing shortage" | card marketThailand@80 | Accurate for 2024, superseded by the 2025 study. Not spoken. |
| BLS 29% (2024-2034), 16,000 a year | `metric_details.demand_growth`, `global_metric_details.demand_growth` | Outdated. BLS now says 21% (2025-35), 14,100 a year. |
| BLS $69,660 (P10), $124,910 mean | `global_metric_details` | Outdated wage year. Current median is $129,180 (May 2025). Not used: US pay misleads a Thai audience without context. |
| "401+ ตำแหน่งบน JobsDB กรุงเทพฯ" | `metric_details.demand_growth` | No date, no source. X. |
| "มากกว่า 1,000 ตำแหน่งในอีก 1-2 ปี" | card marketThailand@80 `openings` | No source. X. |
| job_access 63, ai_risk_score 3, grad_employment_pct 88 | marketThailand, aiImpact, metrics | Our own scores. Allowed only as "ทีมเราประเมิน" and only with an A/B claim, which they cannot have. Not spoken. |
| "CISSP adds ~25%", "5-10 years adds 30-40%" | `metric_details.progression_difficulty` | Nucamp blog (course seller). X. |
| Junior pay ฿40K-65K and other aggregator numbers (Payscale, Secondtalent, Lifeindexed) | web search | Aggregators with no clear method. C. Never used. |
| "ตลาดไทยขาดคนสายนี้มาก" | hook@0 body | No Thai shortage figure exists in the data. Not spoken as fact. |
| Hidden cards (jobs@930, growthCompare@950, etc.) | hidden | Unsourced. Not rendered and not used. |
