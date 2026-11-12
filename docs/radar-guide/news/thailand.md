# Career Radar news sweep: Thailand (as of 2026-11-11)

Scope: Thai cyber incidents and scams, Thai AI/cyber policy, data-centre investment, Thai tech hiring and pay, TCAS70 AI/cyber programmes, Thai tech employers.
Pilot careers: cybersecurity (CY), ai-engineer (AI), data-scientist (DS), software-engineer (SE).

Confidence key: **confirmed** = read in a primary or reputable source; **likely** = reputable secondary/press summary, not checked against the primary document, or minor conflicts in figures; **unconfirmed** = single weak source or not verified.

Rules for using this digest on student pages:
- Do not add loss figures from different periods together; each comes from a different scope (weekly, monthly, cumulative).
- Several Thai sources use the Buddhist calendar: 2569 = 2026, 2570 = 2027.
- Nothing found ties a Thai agency warning directly to Anthropic's Mythos model. Thai officials only say "AI". If a page mentions Mythos, present it as global context, not as a Thai claim.

---

## 1. Thailand's security council: AI-assisted cyberattacks every day (CY, AI)
- **Date:** 2026-11-09 | **Confidence:** confirmed
- **What happened:** After the NSC's 7th meeting of 2026, Secretary-General Gen Chaipruak Doungprapat said government agencies, banks and utilities face cyberattack attempts daily, with attackers using AI to find system weaknesses. He said critical systems are holding but he cannot guarantee complete protection. The PM ordered agencies to harden systems and update emergency plans. A three-level crisis framework puts NCSA and the DE Ministry in charge in normal times and the NSC in a crisis.
- **Why students care:** Defending a country's systems is now an AI-vs-AI job. This is the "now" hook for the cybersecurity guide.
- **Interactive idea:** "Who answers the call?" escalation ladder. The student drags an incident card (bank outage, defaced ministry site, airline leak) up three levels (NCSA/DE, then NSC) and sees which roles act at each level.
- **Sources:** https://www.thestar.com.my/aseanplus/aseanplus-news/2026/11/09/thailand-faces-daily-cyberattacks-as-ai-helps-hackers-exploit-system-weaknesses ; https://www.nationthailand.com/news/general/40073298 ; https://www.bangkokpost.com/thailand/general/3351599/nsc-secgen-thailand-faces-daily-cyber-threats

## 2. Bank of Thailand tells every bank: patch everything now (CY, SE)
- **Date:** 2026-11-09 | **Confidence:** confirmed
- **What happened:** The BOT called the CIOs of all financial institutions plus TB-CERT, instructed CEOs/CIOs to update all software and technology components to current versions, and ordered contingency drills for critical payment systems. The trigger was IT disruptions and cyberattacks at financial institutions overseas, and concern about external partners' connections to core systems. The BOT reported no impact on Thai services so far.
- **Global context (not a Thai claim):** In 2026, Anthropic's restricted Mythos model was reported to have surfaced large numbers of software vulnerabilities, and banks worldwide were reported to be scrambling to patch (CNBC, 2026-05-05). The Thai articles do not name Mythos.
- **Why students care:** "Update everything" sounds simple; doing it for a whole banking system without breaking payments is real engineering work (patch management, testing, rollback).
- **Interactive idea:** Patch-day simulator. A bank's systems map with 12 components; the student has 60 seconds and limited "maintenance windows" to choose what to patch first, trading off risk against downtime of payments.
- **Sources:** https://www.nationthailand.com/business/banking-finance/40073278 ; context: https://www.cnbc.com/2026/05/05/anthropic-ceo-cyber-moment-of-danger-mythos-vulnerabilities.html

## 3. Thai Airways passenger data exposed through supplier Amadeus (CY, SE)
- **Date:** 2026-11-09 (disclosure); ministry order reported 2026-11-11 | **Confidence:** likely (record count differs by source)
- **What happened:** THAI disclosed unauthorised access to passenger booking data via its reservation-system supplier Amadeus, part of a wider incident hitting several carriers. THAI says card data was not affected and passengers will be contacted individually. The Star reports about 60,529 records (plus ~376 with more details); MLex reports 65,029. The Transport Ministry ordered aviation bodies to tighten data protection and password practices; the PDPC is reported to be investigating.
- **Why students care:** Supply-chain risk: your company can do everything right and still leak through a vendor. Third-party risk is a whole cybersecurity specialty.
- **Interactive idea:** "Follow the booking" data-flow diagram. Tap each hop (app, airline, Amadeus, airport) to see who holds which fields; then pick where the breach happened and which fields an attacker gets.
- **Sources:** https://www.thaiairways.com/th-th/content/news-and-announcements/amadeus-reports-unauthorized-access-to-thai-passenger-data/ ; https://www.thestar.com.my/aseanplus/aseanplus-news/2026/11/11/thailand-orders-tighter-aviation-cyber-security-after-data-breaches-across-asia ; https://www.mlex.com/mlex/data-privacy-security/articles/2548884

## 4. University students lose 2.7m baht to "fake police + fake scholarship" scam (CY, DS)
- **Date:** 2026-09-06 (incidents 2026-09-02) | **Confidence:** confirmed
- **What happened:** The ACSC helped three young victims (aged 19, 22, 19). Scammers posed as phone-network staff ("your ID opened a mule SIM"), handed over to fake police on LINE video call, threatened them, banned them from telling family, and in one case added a fake lecturer offering an overseas scholarship. Losses: 1,249,985 + 995,000 + 498,999 baht (~2.74m). A bank's warning call stopped a further 500,000-baht transfer. A separate case (2026-09-12) involved a 22-year-old whose father was pushed to transfer 1.7m baht "for a US scholarship".
- **Why students care:** The victims are the reader's age, and the hook ("scholarship to study abroad") targets exactly TCAS-age students and their parents.
- **Interactive idea:** Chat-replay "spot the moment". A scripted LINE conversation plays message by message; the student taps the earliest red flag. Score reveals the five tells (official calling you, video interrogation, secrecy, urgency, transfer to "prove innocence").
- **Sources:** https://mgronline.com/crime/detail/9690000087344 ; https://mgronline.com/crime/detail/9690000089345 ; https://www.thaipost.net/criminality-news/1064282/ ; https://matichon.co.th/economy/news_5969393

## 5. Broker caught recruiting lower-secondary students to open mule accounts (CY)
- **Date:** 2026-10 | **Confidence:** unconfirmed (single source)
- **What happened:** Police arrested a broker who allegedly lured Mattayom-ton students into opening bank accounts used as mule accounts; dozens of victims suspected. Related: in the 2026-09-12 case, police found the victim had earlier sold a copy of her ID card, which was used to open a mule account.
- **Why students care:** Lending or selling your account or ID can make you a suspect. Fraud analysts at banks build detection for exactly these patterns.
- **Interactive idea:** "Is this account a mule?" Show 6 anonymised account activity timelines; the student flags the mule using simple features (new account, many inbound from strangers, instant outflow). Reveal how bank fraud models use the same features.
- **Sources:** https://www.siamnews.com/news/crime/55574 ; https://mgronline.com/crime/detail/9690000089345

## 6. Scam losses: weekly numbers from the Anti-Cyber Scam Centre (CY, DS)
- **Date:** 2026-07-06 (week of 28 Jun to 4 Jul 2026) | **Confidence:** confirmed
- **What happened:** 5,588 complaints and ~207.73m baht lost in one week. Goods/services fraud was the most common (4,400 cases, 78.7%); impersonation of police, DSI or AMLO caused the most damage (~71.75m baht). Earlier: ~177m baht in a late-July week; police estimated ~70m baht/day in March 2026. Separately, government figures relayed by Thai Post put AOC 1441 period losses at ~12,155.87m baht for Oct 2025 to May 2026, down 15.38% from Feb to Sep 2025 (likely; not checked against the primary AOC release). Cyber police reported 3.15bn baht lost by people aged 60+ in eight months (reported 2026-09-04).
- **Why students care:** Someone has to count, classify and chart this data every week. That is data-science work in the public interest.
- **Interactive idea:** Build-the-chart page. The student gets the raw weekly table and chooses the chart (count vs baht, by scam type) and sees how "most common" and "most damaging" tell different stories.
- **Sources:** https://www.nationthailand.com/news/general/40068316 ; https://www.bangkokpost.com/thailand/general/3292417/online-scammers-steal-b177m-in-one-week ; https://www.thaiexaminer.com/thai-news-foreigners/2026/03/19/scam-threat-again-on-the-rise-in-thailand-with-losses-of-70-million-baht-a-day-being-reported-by-police/ ; https://www.thaipost.net/general-news/1010043/ ; https://www.pressreader.com/thailand/bangkok-post/20260904/281543707795803

## 7. DE Ministry's four scam trends for 2026, including AI deepfake calls (CY, AI)
- **Date:** 2025-12-26 | **Confidence:** confirmed
- **What happened:** The Ministry listed: (1) fake SMS/LINE payment links posing as water and electricity authorities; (2) AI deepfake calls and videos cloning relatives' voices or faking officials; (3) bogus crypto/"digital stock" investment; (4) fake profiles, shops and hotel pages. Channel data cited: Facebook 126,672 cases / 2.81bn baht; call centres 32,000 / 2.66bn; websites 10,000 / 1.71bn; TikTok 8,703 / 534m (period not stated, treat as dated). 223,300 cases were among ages 20 to 49.
- **Why students care:** Voice cloning is the same technology AI engineers build for good uses; detection is a live research and product problem.
- **Interactive idea:** "Real or cloned?" audio quiz using clearly labelled, consented sample voices (PassionSeed team) with an explanation of the artefacts detectors look for. No real victims or public figures.
- **Sources:** https://www.nationthailand.com/news/general/40060353 ; https://e.vnexpress.net/news/news/crime/thailand-warns-of-four-scam-trends-to-watch-in-2026-4998863.html

## 8. Deepfake investment ads and fact-checks; consumer losses near 9bn baht in H1 2026 (AI, CY)
- **Date:** 2026 (H1 figures) | **Confidence:** likely
- **What happened:** Thai PBS Verify debunked several AI deepfake clips in 2026, including a fake Thai PBS clip promoting gambling with impersonated celebrities and fake investment pitches using well-known businesspeople. A TikTok "ThaisAware" campaign report cites the Thailand Consumers Council: nearly 9bn baht lost to online scams in the first six months of 2026 across 170,000+ cases. Meta reported a joint operation with Royal Thai Police that disabled 150,000+ scam-linked accounts with 21 arrests (date not verified).
- **Why students care:** Trust-and-safety and content-integrity teams at platforms are a growing AI/ML job family.
- **Interactive idea:** Fact-checker workflow. Student gets a suspicious clip card and must order the verification steps (reverse image search, source channel, lip-sync check, contact the named person) like a Thai PBS Verify editor.
- **Sources:** https://www.thaipbs.or.th/verify/en/content/6033 ; https://www.thaipbs.or.th/verify/en/tag/3782 ; https://aseannow.com/thailand-news/tiktok-launches-new-anti-scam-campaign-in-thailand-r3414

## 9. Myanmar border scam compounds still running; 5,300+ people still held (CY)
- **Date:** 2026-06-23 (Al Jazeera); 2026-07-21 (ABC) | **Confidence:** confirmed (counts are estimates by rights groups)
- **What happened:** A Thai-based civil-society network told Thai police more than 5,300 people remain held in Myanmar scam centres near the border despite the 2025 crackdown. Thai officials told ABC that KK Park and nearby compounds were still standing and operating; operators appear to be relocating ("KK Park 2.0").
- **Why students care:** The scam calls Thai families receive are produced industrially across the border. Fighting them is about intelligence, finance tracing and platform data, not only police raids.
- **Interactive idea:** "Anatomy of a scam call" supply chain. Click through the pipeline (leaked data, script, SIM/mule accounts, money laundering) and see which career (threat intel analyst, fraud data scientist, telecom engineer) can break each link.
- **Sources:** https://www.aljazeera.com/news/2026/6/23/more-than-5300-people-still-held-in-myanmar-scam-centres-rights-group ; https://www.abc.net.au/news/2026-07-21/myanmar-scam-compounds-exponential-growth/106603324

## 10. PDPC moves to multi-million-baht fines for data protection failures (CY, SE)
- **Date:** fine wave 2025, reporting through 2026 | **Confidence:** likely
- **What happened:** Law-firm reporting describes the PDPC fining a technology retailer 7m baht (weak security, no breach report, no DPO) and a cosmetics firm 2.5m baht, plus a government agency and its software developer 153,120 baht each after ~200,000 records leaked (no privacy-by-design). Cumulative fines reported at ~21.5m baht by mid-2026. Controllers must notify within 72 hours where feasible.
- **Why students care:** The software developer was fined too. Writing secure code is a legal duty, not just good practice.
- **Interactive idea:** Privacy-by-design code review. Show a short signup form + database schema; student taps the fields that should not be stored, logged or shown, and sees which PDPA principle each fix satisfies.
- **Sources:** https://www.legal500.com/intelligence/thailand/privacy/thailand's-pdpc-signals-tougher-enforcement-with-multi-million-baht-fines ; https://www.nagashima.com/en/publications/publication20250822-1/ ; https://www.hlc.com/en/publications/thailand-ramps-up-data-protection-enforcement

## 11. Thailand's draft AI Act goes to public consultation (AI, DS, SE)
- **Date:** consultation opened July 2026 (ETDA); reported 2026-08-03; still being processed as of late September 2026 | **Confidence:** confirmed (exact release date varies by source: 2 or 9 July)
- **What happened:** The DE Ministry and ETDA released a risk-based draft AI Act: bans on covert manipulation and unfair large-scale discrimination; duties for high-risk systems (secure, transparent, auditable); risk assessments for deployers; ethical impact assessments for government AI; a four-tier synthetic-content transparency regime; foreign providers without a Thai office must appoint a local coordinator. Sector regulators would oversee their industries under a national AI committee. Next steps: Council of State, Cabinet, Parliament. The September target for the House appears to have slipped.
- **Why students care:** Future AI engineers in Thailand will ship under this law. "Is my system high-risk?" becomes a design question.
- **Interactive idea:** Risk sorter. Drag 8 AI products (exam proctoring, playlist recommender, loan approval, homework chatbot, CCTV face search...) into prohibited / high-risk / low-risk buckets; reveal the draft's reasoning and which regulator would oversee it.
- **Sources:** https://healthtechasia.co/thailand-opens-public-consultation-on-draft-ai-act/ ; https://www.bakermckenzie.com/-/media/files/insight/publications/2026/07/thailand-draft-ai-act--seven-key-implications.pdf ; https://techforgoodinstitute.org/insights/country-spotlights/thailands-ai-policy-keeping-pace-with-adoption/

## 12. Thailand is first country in Microsoft's "Elevate AI and Jobs" national coalition (AI, DS, SE)
- **Date:** 2026-10-15 | **Confidence:** confirmed
- **What happened:** Government, Microsoft and partners (MHESI, vocational and employment agencies, Federation of Thai Industries, Digital Council of Thailand) launched a coalition; phase one runs Oct 2026 to Jun 2027 and targets recent graduates, career starters and job seekers, with a workforce transformation framework and skills credentials. Background: Microsoft's >US$1bn cloud/AI infrastructure plan for Thailand 2026 to 2028, and a Ministry of Labour partnership to upskill 150,000 workers (announced 2025-11-25).
- **Why students care:** The national plan explicitly names first-jobbers. Credentials and portfolios will matter as much as degrees.
- **Interactive idea:** "Skills passport" builder: student picks a target role and sees the 5 skills employers in the coalition say they need, ticking off which they could prove today with a project.
- **Sources:** https://news.microsoft.com/source/asia/2026/10/15/thailand-becomes-first-country-to-launch-microsoft-elevate-ai-and-jobs-national-coalition/ ; https://news.microsoft.com/source/asia/2025/11/25/ministry-of-labour-and-microsoft-join-forces-to-accelerate-ai-skill-development-for-150000-thai-workers-driving-thailand-towards-becoming-creator-nation-in-digital-economy/ ; https://cmotech.asia/story/microsoft-pledges-usd-1-billion-for-thailand-ai-hub

## 13. Hyperscale cloud lands in Thailand: Google Bangkok region live, AWS region, BOI data-centre approvals (SE, AI, CY)
- **Date:** Google region 2026-01-21; AWS region Jan 2025; BOI approvals 2025 to May 2026 | **Confidence:** confirmed (Google, AWS); likely (BOI totals, figures differ by source)
- **What happened:** Google Cloud opened a Bangkok region with three availability zones (part of a US$1bn pledge from Sept 2024), aimed at data residency for regulated sectors like banking. AWS opened its Thailand region in Jan 2025 under a >US$5bn, 15-year plan. The BOI approved many data-centre projects (e.g. four projects worth US$3.1bn in Nov 2025; reported ~THB 746bn approved in 2025, largely TikTok). Cabinet set up a Data Centre Business Policy Committee in Aug 2026 (likely).
- **Why students care:** Cloud engineers, SREs and security engineers will be hired locally to run these regions and the companies moving onto them.
- **Interactive idea:** "Where does your data live?" map. Student sends a LINE photo / bank transfer / ChatGPT prompt and watches the route light up to a Thai or overseas region, with latency and PDPA notes.
- **Sources:** https://www.googlecloudpresscorner.com/2026-01-21-Google-Cloud-Launches-New-Cloud-Region-in-Thailand,-Bolstering-its-Commitment-to-Advancing-the-Countrys-AI-Driven-Digital-Economy ; https://www.computerweekly.com/news/366637529/Google-Cloud-opens-Bangkok-region-to-support-Thailands-AI-economy ; https://developingtelecoms.com/telecom-business/telecom-investment-mergers/19375-thailands-boi-approves-massive-data-centre-investments.html ; https://asiatimes.com/2026/06/thailands-big-money-bid-to-become-aseans-data-center-capital/

## 14. TDRI: 2.2m Thai workers at risk from AI; AI-skill job ads up ~4x; first-jobbers hit first (AI, DS, SE, CY)
- **Date:** TDRI annual conference coverage, Nov 2026 (exact publication date not shown) | **Confidence:** confirmed (press coverage of TDRI presentation)
- **What happened:** TDRI's Dr Putthiphan Hirunyatrakul: ~2.2m workers (5.6% of the workforce, 50+ occupations) at high risk, 3rd highest share in ASEAN after Singapore and the Philippines. Between Q2 2024 and Q2 2026, total job ads grew ~6% but ads requiring AI skills grew ~4x (3.9x), spreading into admin, finance and management. Most exposed: office clerks, data entry, accountants, translators, marketers, advertising creatives. First-jobbers find entry-level roles harder. Worst case for 2030: unemployment 3.66% (from under 1%), wages down 1%. NESDC's separate estimate: 8.7m exposed, 2.2m high risk.
- **Why students care:** The best-known Thai think tank says entry-level work is what AI eats first. Choosing a faculty in 2026 means choosing one where you learn to direct AI, not compete with it.
- **Interactive idea:** Task slider. Pick a job (accountant, translator, data analyst, security analyst, software engineer); its daily tasks appear as chips; drag each into "AI does it", "AI + human", "human only", then compare with the TDRI exposure list.
- **Sources:** https://www.bangkokbiznews.com/economics/1258451 ; https://www.bangkokpost.com/business/general/3346889/betting-big-on-small-ai ; https://tdri.or.th/2026/02/ai-job-market-disruption-and-impact/ ; https://www.bangkokpost.com/business/general/3260964/ai-growth-puts-87m-thai-jobs-at-risk

## 15. Adecco Thailand Salary Guide 2026: AI engineers from 30k to 170k baht; senior security up to 250k (AI, DS, CY)
- **Date:** 2026-04-22 (HREX summary of Adecco guide) | **Confidence:** likely (secondary summary; original PDF not read)
- **What happened:** AI Engineer: from 30,000 THB/month at 0 to 3 years, up to 170,000 at 7+ years. Data Scientist/Data Engineer: up to ~150,000 at expert level. Senior IT security analyst/engineer (7+ years): up to ~250,000. People with practical AI skills earn up to ~20% more than peers; job-switchers in cybersecurity, data science and AI/ML can ask 20 to 25% raises vs 2 to 5% for general staff. 21% of organisations plan to cut headcount, yet IT keeps hiring. Cross-check: JobsDB data-scientist median ~62,500 THB (band ~50k to 82k); page date unclear.
- **Why students care:** Real Thai salary ladders, not US figures. The starting number is ordinary; the curve is steep for people who keep proving skills.
- **Interactive idea:** Salary ladder climber. Pick a career, move a "years of experience" slider and watch the range bar grow, with notes on what you had to be able to do at each rung. Clearly label as Adecco ranges, monthly THB.
- **Sources:** https://th.hrnote.asia/hr-survey/adecco-thailand-salary-guide-2026-260422/ ; https://th.jobsdb.com/career-advice/role/data-scientist/salary

## 16. KBTG: 10 AI agents across the software lifecycle; AI-written code doubles to 41m lines (SE, AI)
- **Date:** 2026-06-19 | **Confidence:** confirmed
- **What happened:** KASIKORN Business-Technology Group built 10 cooperating AI agents for requirements, design, architecture and testing. AI-generated code rose from 21m lines (2025) to 41m lines in the first five months of 2026, about 15% of the code KBTG's engineers write. Target: +15% IT delivery efficiency in 2026. AI training is mandatory for KBank staff; KBTG runs a Cyber Bootcamp. Leadership says the aim is to reshape workflows, not cut headcount.
- **Why students care:** This is what software engineering at a big Thai bank looks like right now: engineers orchestrating agents and owning the result.
- **Interactive idea:** "Pass the ticket" relay. A feature request moves through the 10-agent pipeline; at each stage the student decides whether to approve the agent's output or send it back, learning where human judgement is required.
- **Sources:** https://www.thestorythailand.com/en/kbtg-regional-ai/ ; https://www.bangkokpost.com/business/general/3271816/kbtg-doubles-down-on-ai-transformation

## 17. Agoda and OpenAI run Tech Camp Day for 420+ Thai university students (AI, SE)
- **Date:** 2026-11-05 to 06 | **Confidence:** confirmed
- **What happened:** Agoda's 12th Tech Camp Day, with OpenAI, hosted 420+ students from Sripatum, RMUTP, RMUTT and Suan Sunandha Rajabhat. Students used ChatGPT agents for multi-step tasks, turned spreadsheet data into a presentation and a web app, published apps and packaged workflows into reusable "skills". Cumulative reach 4,100+ students since 2023. Agoda's Bangkok careers site lists AI roles (AI Assistant, Generative AI engineering managers). Agoda's AI Developer Report 2026: juniors ~3x as likely as seniors to cite a skills gap blocking AI-agent adoption (17% vs 6%).
- **Why students care:** A Bangkok-based global tech employer is training first-years to build with agents. That is the new baseline skill.
- **Interactive idea:** "Ship a mini app in 5 steps" walkthrough: student turns a small dataset (e.g. TCAS seat counts) into a chart page by choosing prompts, and sees how a reusable skill is packaged.
- **Sources:** https://www.manilatimes.net/2026/11/06/tmt-newswire/pr-newswire/agoda-and-openai-bring-ai-learning-to-life-at-agodas-12th-tech-camp-day-in-thailand/2463824 ; https://careersatagoda.com/department/technology/

## 18. Thailand Cyber Top Talent 2026: high-school teams win royal trophy (CY)
- **Date:** 2026-09-05 (final); online qualifier 2026-08-15 | **Confidence:** confirmed
- **What happened:** NCSA with Huawei ran the national CTF in three tiers (Junior = secondary school, Senior = university, Open). Junior winner: team "อดีตเบต้าเทสเตอร์" (80,000 baht + royal trophy); 2nd "คนมันติสห์ ก็ต้องสตาร์ทติดเป็นธรรมดา" (30,000); 3rd GuetHack (18,000). Some winners go on to prepare for Cyber SEA Game 2026. KMITL's TCAS70 "Engineering Top Talents" track accepts awards from cyber-talent competitions.
- **Why students care:** You can compete in real cybersecurity now, as a Mattayom student, and it counts toward TCAS portfolios.
- **Interactive idea:** Mini CTF on the page: three beginner flags (hidden text in page source, Caesar cipher, a weak-password hash lookup), each unlocking a short note on the real skill and where to practise (ctf.in.th).
- **Sources:** https://www.thnca.or.th/tctt2026/ ; https://mgronline.com/entertainment/detail/9690000087648 ; https://ctf.in.th/tctt-statistics/

## 19. TCAS70: new and expanded AI and cybersecurity programmes (all four careers)
- **Date:** announcements Oct to Nov 2026 | **Confidence:** confirmed (KMITL, Silpakorn via education press); likely (others)
- **What happened:**
  - **KMITL Engineering, Portfolio round (announced 2026-11-08/09):** 905 seats across 35 programmes. Computing-related: Computer Engineering (40), Computer Engineering and Cybersecurity (40), IoT and Information Engineering (30), international Software Engineering (10), Robotics and AI Engineering (10), AI and Entrepreneurship Engineering (10). GPAX >= 3.00. Apply by **28 Jan 2027, 16:30**.
  - **Silpakorn ICT, new AiDEX programme** (AI for Digital Experience Technology): 245 seats in TCAS70 (Portfolio 50, Quota 135, Admission 60). Portfolio round open **20 Oct to 16 Nov 2026** (closes in days), interview 20 Dec 2026. Covers AI and data, UX, digital media and business; 480-hour internship.
  - **KMUTT Ratchaburi, AI Systems Engineering (AISE):** TCAS70 round 1 open; GPAX >= 2.75 (likely).
  - **Burapha:** BSc Applied AI and Smart Technology (likely). **Walailak:** engineering and technology Portfolio round, 370 seats, includes computer/AI (likely).
- **Why students care:** Directly actionable: names, seats and deadlines for the exact year our readers apply. Always link to mytcas.com and the university page.
- **Interactive idea:** Deadline countdown + "which programme fits you" filter: student sets GPAX, interest (AI / cyber / software / data) and round; cards show matching programmes with seats, deadline countdown and official link.
- **Sources:** https://www.eduzones.com/2026/11/09/eng-kmitl70/ ; https://www.smartmathpro.com/article/ict-aidex-su ; https://ratchaburi.kmutt.ac.th/recruitment-news/tcas70-1/ ; https://dreamnesthub.com/tcas70-wu-engineering-technology-portfolio-criteria ; https://course.mytcas.com/universities/019/faculties/10/fields/22_03

## 20. SCB 10X keeps shipping open Thai AI models (Typhoon OCR, real-time Thai speech) (AI, DS)
- **Date:** Typhoon ASR Real-time paper Jan 2026; Typhoon OCR v1.5 2026-06-22 | **Confidence:** likely
- **What happened:** SCB 10X's Typhoon family now spans chat, reasoning, Thai speech recognition (including an Isan ASR model), Thai document OCR and Thai-English translation, released as open models that can run locally. Typhoon OCR v1.5 is a 2B-parameter open vision-language model for Thai documents. No national "ThaiLLM" release was confirmed in this sweep.
- **Why students care:** Thai-language AI is built in Bangkok by Thai teams. AI engineers and data scientists who understand Thai data have an edge global models lack.
- **Interactive idea:** "Teach the model Thai" page: show three tricky Thai inputs (no spaces between words, Isan dialect, a handwritten form) and let the student guess how a model segments or reads them, then reveal what a Thai-tuned model gets right.
- **Sources:** https://www.scbx.com/en/research/human-intelligence-en/typhoon-ocr/ ; https://arxiv.org/html/2601.13044v1 ; https://www.scbx.com/en/news/scb-10x-unveils-typhoon-isan/ ; https://huggingface.co/collections/scb10x/typhoon-2-multimodal

---

## Gaps and things not confirmed
- No Thai agency statement naming Anthropic's Mythos was found. Use Mythos only as global context.
- No Robert Walters Thailand 2026 salary guide or primary JobsDB 2026 demand report was found.
- No 2026 hiring/layoff news specific to LINE MAN Wongnai or SCB 10X hiring was found.
- Thai Airways record count conflicts (60,529 vs 65,029).
- BOI data-centre totals differ by source; check BOI releases before quoting a number.
- Item 5 (mule-account broker targeting lower-secondary students) is single-source.
