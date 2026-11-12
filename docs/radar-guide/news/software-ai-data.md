# News sweep: software engineering, AI engineering, data science (as of 2026-11-11)

Scope: Career Radar pilot careers `software-engineer`, `ai-engineer`, `data-scientist` (plus `cybersecurity` where it overlaps).
Confidence key: **confirmed** = read on a primary or reputable source page; **likely** = consistent reputable secondary coverage, primary not opened; **unconfirmed** = single or weak source, do not put on a page without re-checking.

## The story in one paragraph

AI now writes most new code at the frontier companies (Google says 75% of new code; agents start 40% of GitHub pull requests). Software job postings have come back, up about 15% since Claude Code launched, but the jobs that came back are senior and AI-titled, and postings are still about 27.5% below 2020. The people losing out are 22 to 25 year olds in AI-exposed jobs (19% employment gap, Stanford). Companies cited AI in about 121,000 US layoffs this year, yet some are rehiring the people they cut. The new roles are AI engineer (LinkedIn's #1 fastest-growing job) and forward-deployed engineer (postings up 7x). Data scientist work is shifting toward ML, evaluation and building AI tools, not disappearing. The skill gap that matters: checking AI's work. Only 7% of developers trust AI with important decisions, and 38% of AI-generated code still fails basic security tests.

---

## 1. "AI rebounding": about 1 in 5 US workers replaced by AI were asked back
- **Date:** 2026-11-09 (Fortune); survey fieldwork June to July 2026
- **What happened:** SHL surveyed US and UK workers. 19.1% of US respondents said AI replaced them and the same employer later asked them back (16% across US+UK; 24% for ages 18 to 24). 51% of returnees wanted a substantial raise first. Robert Half separately found 32% of US hiring managers whose firms cut jobs for AI later reinstated the same or similar roles.
- **Why it matters:** Replacing people with AI often fails on judgment, context and client relationships. Those are learnable human skills.
- **Careers:** software-engineer, data-scientist, ai-engineer
- **Interactive idea:** "Replace or rehire?" simulator: student is a manager, picks which tasks to hand to AI, then sees a 6-month outcome card (what broke, who had to be rehired, why).
- **Sources:** https://fortune.com/2026/11/09/ai-rebounding-20-us-workers-replaced-higher-pay-job-security ; https://www.cnbc.com/make-it/2026/10/30/ai-rebounding-employees.html
- **Confidence:** likely (self-reported survey, sample size not stated in article)

## 2. METR: Anthropic's AI progress is running about 2x faster, partly because AI helps build AI
- **Date:** 2026-11-05
- **What happened:** Independent evaluator METR estimated Anthropic is improving model capabilities at roughly twice its March 2024 to October 2025 rate (benchmark trend 1.9x, 95% CI 1.5 to 2.8x), and guessed ~80% of that acceleration comes from AI itself. Staff self-reported ~12x uplift from the newest internal model, which METR calls "only very loose evidence". Anthropic redacted most of the evidence METR found most informative.
- **Why it matters:** The tools students will use at university will change several times before they graduate. Learning how to learn tools matters more than any one tool.
- **Careers:** ai-engineer, software-engineer
- **Interactive idea:** "Self-report vs measured" slider: student guesses how much faster AI makes engineers, then reveals METR's measured numbers next to the self-reported 12x, teaching why evidence beats vibes.
- **Sources:** https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment/
- **Confidence:** confirmed (the report itself is heavily caveated)

## 3. Challenger: AI cited in ~121,000 US job cuts in 2026, but the AI wave peaked in May
- **Date:** early November 2026 (October report)
- **What happened:** Through October 2026, US employers cited AI for 121,401 announced cuts (~20% of all cuts), more than double all of 2025 (54,836). October alone: 1,265, the lowest month of the year (May peaked at 38,579). Tech had 171,501 cuts YTD (28% of all). "Market/economic conditions" overtook AI as the top reason. Microsoft's voluntary exit offers to 60,000 staff are not counted.
- **Why it matters:** "AI took the jobs" headlines are partly real and partly a label companies choose. Challenger counts the reason the company states.
- **Careers:** software-engineer, ai-engineer, data-scientist
- **Interactive idea:** Month-by-month bar chart students scrub through 2026, with a toggle "reason stated by company" vs "what else happened that month" (rates, economy) to practice reading headlines critically.
- **Sources:** https://www.challengergray.com/blog/october-layoffs-at-three-year-low-seasonal-hiring-plans-up-26/ ; https://www.challengergray.com/wp-content/uploads/2026/11/Challenger-Report-October-2026.pdf
- **Confidence:** confirmed

## 4. Data scientist postings are rising, and AI engineer postings faster
- **Date:** 2026-11-01 (Extern tracker, Adzuna data July to October 2026); BLS outlook current
- **What happened:** Live US "data scientist" postings rose from ~21.9K (July) to ~27.0K (October); "AI engineer" 51.1K to 69.9K; "ML engineer" 12.5K to 15.3K; "data analyst" 16.8K to 19.1K. BLS projects data scientist jobs to grow 35% from 2025 to 2035, median pay $120,230 (May 2025), ~24,800 openings a year. Posting analyses find ML/AI skills in most data scientist ads; work is shifting from manual wrangling toward problem framing, model evaluation and explaining results.
- **Why it matters:** Data science is not dying, it is absorbing AI. The analyst who only makes charts is most exposed; the one who frames questions and checks models is in demand.
- **Careers:** data-scientist, ai-engineer
- **Interactive idea:** "Data scientist's week, 2022 vs 2026": drag tasks (cleaning data, SQL, chart, prompt an AI analyst, check the AI's answer, explain to boss) into "AI does it" / "you do it", then compare to the real shift.
- **Sources:** https://www.extern.com/post/will-ai-replace-data-scientists-guide ; https://www.bls.gov/ooh/math/data-scientists.htm
- **Confidence:** likely (Extern is a tracker by a career company; BLS figures confirmed)

## 5. Veracode: AI-written code got safer for the first time, but 38% still fails security tests
- **Date:** 2026-10-29
- **What happened:** Veracode's October 2026 GenAI Code Security update tested 18 models on four languages. Average security pass rate rose from 56% to 62% (vulnerability rate 44% to 38%), the first meaningful gain since the series began in July 2025. Top models (Claude Opus 5.5, GPT-6-Sol) tied at 73%. Java pass rate only 31%. Veracode warns against "blindly trusting AI-generated code."
- **Why it matters:** Someone has to catch the other 27 to 38%. Code review and security sense are now core skills for every engineer.
- **Careers:** software-engineer, cybersecurity, ai-engineer
- **Interactive idea:** "Spot the bug": show a short AI-generated login snippet with a SQL injection flaw; student taps the risky line, then sees how often AI models make that exact mistake.
- **Sources:** https://www.veracode.com/?p=33104 ; https://veracode.com/resources/analyst-reports/2026-genai-code-security-report
- **Confidence:** confirmed

## 6. GitHub Octoverse 2026: agents start over 40% of pull requests
- **Date:** 2026-10-28 (updated 2026-11-06)
- **What happened:** By September 2026, more than 40% of pull requests on GitHub started with an agent's first draft (17% in March), about 110 million that month. Agent PRs merged within two weeks at 90% vs ~86% for others. 55% of Copilot monthly users use agentic features (35% a year earlier). TypeScript is #1, then Python. GitHub serves 225M+ developers; India added 10M+ this year.
- **Why it matters:** The job is shifting from typing code to directing, reviewing and merging AI's code.
- **Careers:** software-engineer, ai-engineer
- **Interactive idea:** "You are the reviewer": three agent-drafted pull requests appear; student approves, requests changes or rejects each, then sees what a senior engineer would have done and why.
- **Sources:** https://github.blog/news-insights/octoverse/octoverse-commits-pushes-reach-new-highs-in-2026-as-developers-build-with-agents/
- **Confidence:** confirmed

## 7. Microsoft offers voluntary buyouts to ~60,000 employees while spending big on AI
- **Date:** 2026-10-26
- **What happened:** Microsoft opened its first Voluntary Exit Offer to about 60,000 employees (~27% of its workforce) in the US, Canada, India and UK; reportedly includes Copilot and CoreAI teams. The memo does not cite AI; the AI link is press framing (AP: "as AI spending accelerates").
- **Why it matters:** Big tech is moving money from people to AI infrastructure. Even AI teams are not immune.
- **Careers:** software-engineer, ai-engineer
- **Interactive idea:** "Follow the money" split bar: where a big tech company's spending goes (people vs data centres), with a quiz on what that means for hiring.
- **Sources:** https://www.wdbj7.com/2026/10/26/microsoft-offers-60000-employees-voluntary-buyouts-ai-spending-accelerates/ ; https://www.computerworld.com/article/4163188/microsoft-to-offer-voluntary-retirement-buyouts-to-about-7-of-the-us-workforce.html
- **Confidence:** likely (AP syndication; acceptance numbers unknown)

## 8. Software developer job postings are back up, but the comeback is senior and AI-flavoured
- **Date:** 2026-07-08 (Indeed Hiring Lab); 2026-10-11 (CNBC follow-up); August 2026 snapshot
- **What happened:** US software development postings on Indeed grew almost 15% since Claude Code launched (late Feb 2025) while overall postings fell 7%. Still ~27.5% below February 2020 (index 74.4 in the August snapshot). 71% of the May 2025 to May 2026 increase came from senior roles; 37% from jobs with "AI" in the title. GitHub says 1 in 3 PRs now involve an AI agent (CNBC, before Octoverse). BLS projects software developer jobs +10% from 2025 to 2035.
- **Why it matters:** Demand exists, but the door for beginners is narrower. Students need proof they can already do senior-ish things: ship, review, work with AI.
- **Careers:** software-engineer, ai-engineer
- **Interactive idea:** Two-line chart "all jobs vs software jobs since Feb 2020" with a "zoom into who is being hired" button that splits the software line into junior vs senior.
- **Sources:** https://hiringlab.indeed.com/2026/07/08/ai-and-job-postings-from-destruction-to-creation/ ; https://www.cnbc.com/2026/10/11/ai-software-developer-jobs.html ; https://hiringlab.indeed.com/2026/08/24/us-labor-market-snapshot-august-2026/
- **Confidence:** confirmed

## 9. Stack Overflow 2026: 83% of developers use AI, only 7% trust it with important decisions
- **Date:** 2026-10-06
- **What happened:** 30,000+ developers from 169 countries. Only 17.2% use no AI tools; 66% use coding assistants or agents; 26.2% use automated agent workflows. Nearly half trust AI only when they can verify its work; 6.6% trust it with important decisions (4% among early-career devs). 78.7% say knowing the source of an AI answer matters.
- **Why it matters:** The pros use AI every day and still check everything. "Can you verify it?" is the core skill.
- **Careers:** software-engineer, ai-engineer, data-scientist
- **Interactive idea:** "Trust meter" poll: student says how much they'd trust AI for homework vs a bank app vs a hospital system, then sees how 30,000 developers answered.
- **Sources:** https://stackoverflow.co/company/press/archive/stack-overflow-annual-developer-survey-ai-trust-conditional ; https://survey.stackoverflow.co/2026/ai
- **Confidence:** confirmed

## 10. Thailand is short about 80,000 AI professionals (IFC)
- **Date:** 2026-09-10
- **What happened:** IFC East Asia director Arnaud Dupoizat told Krungthep Turakij (via The Nation) that Thailand lacks about 80,000 AI professionals and only ~12% of Thai companies use AI; he wants data-centre investment to turn into jobs and AI use beyond big firms.
- **Why it matters:** The local angle: Thailand needs AI builders, especially ones who can bring AI into ordinary companies (factories, SMEs), not only Silicon Valley.
- **Careers:** ai-engineer, data-scientist, software-engineer
- **Interactive idea:** "Fill the gap" map of Thailand: tap an industry (manufacturing, hospitals, agriculture, tourism) to see one AI job that needs doing there and which faculty path leads to it.
- **Sources:** https://www.nationthailand.com/business/economy/40070862
- **Confidence:** confirmed (single interview estimate; method not given)

## 11. Stanford "Canaries" update: AI-exposed jobs for 22 to 25 year olds now 19% below expected
- **Date:** 2026-08-12 (paper update); Stanford AI Index 2026 (April) for developers
- **What happened:** Using ADP payroll data through June 2026, Brynjolfsson, Chandar and Chen find employment for 22 to 25 year olds in the most AI-exposed occupations is ~19% below expected (15% a year earlier). Experienced workers show no comparable gap. It happens through fewer young hires, not firings, and mostly where AI automates rather than augments. "We do not see widespread, economy-wide job displacement." Separately, Stanford's 2026 AI Index (as reported by CNBC) says early-career software developers saw a ~20% employment decline.
- **Why it matters:** The first rung of the ladder is the one AI is shaking. Students should plan for getting experience before the first job (projects, portfolios).
- **Careers:** software-engineer, data-scientist, ai-engineer
- **Interactive idea:** "The ladder": animated career ladder where the bottom rungs fade as AI exposure rises; student adds portfolio projects to build their own bottom rung.
- **Sources:** https://digitaleconomy.stanford.edu/news/canariesaug26/ ; https://digitaleconomy.stanford.edu/project/indicators/canaries-dashboard/ ; https://www.cnbc.com/2026/10/11/ai-software-developer-jobs.html
- **Confidence:** confirmed (authors stress results are descriptive, not causal; paper does not break out software developers)

## 12. Google: 75% of new code is AI-generated; Anthropic says most of its code is written by Claude
- **Date:** 2026-04-22 (Google Cloud Next); Anthropic statements Jan to May 2026
- **What happened:** Sundar Pichai said 75% of Google's new code is AI-generated and approved by engineers (about 25% in Oct 2024, ~50% fall 2025), describing engineers supervising agentic workflows. Semafor reports Snap reached 65% in April 2026 and cut planned headcount. At Anthropic, Claude Code creator Boris Cherny says Claude writes 100% of his code; company-wide figures of 70 to 90% are reported.
- **Why it matters:** "Writing code" is becoming "deciding what to build and checking the AI built it right".
- **Careers:** software-engineer, ai-engineer
- **Interactive idea:** "Who wrote this line?" game: show 10 code lines, student guesses human or AI, then reveals the 75% stat and asks "so what is the human doing?".
- **Sources:** https://www.semafor.com/article/04/24/2026/google-ceo-says-75-of-companys-new-code-is-ai-generated ; https://devops.com/google-ceo-says-75-of-new-code-is-ai-generated/ ; https://www.entrepreneur.com/business-news/creator-of-anthropics-claude-code-hasnt-written-a-line-of-code-in-8-months
- **Confidence:** Google confirmed (company statement; "new code" only, Google's own definition). Anthropic figures likely (secondary).

## 13. Claude Mythos and Project Glasswing: AI finds bugs faster than humans can fix them
- **Date:** 2026-04-07 launch; updates May to October 2026; later model versions reported through 2026-11-09
- **What happened:** Anthropic withheld Claude Mythos Preview from public release because it is so good at finding software vulnerabilities, and gave it to launch partners (AWS, Apple, Google, Microsoft, Linux Foundation, etc.) plus 40+ organisations, with up to $100M in credits. Partners reported 10,000+ high/critical vulnerabilities by late May; Mozilla fixed 271 in Firefox. By early October, only 516 of 6,157 disclosed vulnerabilities were reported patched (SIG). Wikipedia lists later releases (Mythos 5, Fable 5, Mythos 5.2 on 2026-11-09) that need checking against Anthropic.
- **Why it matters:** AI can now find bugs at machine speed; fixing, testing and shipping the patch is human engineering work, and it is the bottleneck.
- **Careers:** cybersecurity, software-engineer, ai-engineer
- **Interactive idea:** "Bug pile vs patch pipe": a counter of bugs found piling up faster than a pipe of patches drains; student assigns engineers to review, test, ship and sees the backlog shrink.
- **Sources:** https://www.anthropic.com/project/glasswing ; https://www.helpnetsecurity.com/2026/05/26/anthropic-project-glasswing-update/ ; https://www.softwareimprovementgroup.com/blog/mythos-project-glasswing-security/ ; https://en.wikipedia.org/wiki/Claude_Mythos
- **Confidence:** launch confirmed; vulnerability counts likely; later model versions unconfirmed

## 14. Forward-deployed engineer postings up ~729% in a year
- **Date:** April 2026 (Indeed data shared with Business Insider)
- **What happened:** FDE postings on Indeed went from ~643 (April 2025) to ~5,330 (April 2026), average base salary ~$171,911. FDEs sit inside a customer's team and build AI into their real workflows (role popularised by Palantir; now at OpenAI, Anthropic, Google, Microsoft and others).
- **Why it matters:** A new engineering job that mixes coding with talking to people and understanding a business. Good fit for students who like both.
- **Careers:** ai-engineer, software-engineer, data-scientist
- **Interactive idea:** "Day as an FDE" choose-your-path: a hospital client wants AI to summarise patient notes; student chooses what to ask, what to build first, what to say no to.
- **Sources:** https://leaddev.com/career-development/the-rise-of-the-forward-deployed-engineer-fde ; https://www.kdnuggets.com/forward-deployed-engineer-ais-hottest-new-career-or-consulting-with-a-better-title
- **Confidence:** likely (BI original not opened; one job board)

## 15. LinkedIn: AI engineer is the #1 fastest-growing job in the US (again)
- **Date:** 2026-01-07
- **What happened:** LinkedIn Jobs on the Rise 2026 ranks AI engineers #1, AI consultants #2, data annotators #4, AI/ML researchers #5. Top AI engineer skills listed: LangChain, Retrieval-Augmented Generation (RAG), PyTorch.
- **Why it matters:** Ranks growth rate, not total jobs, but shows where new demand is.
- **Careers:** ai-engineer, data-scientist
- **Interactive idea:** "Build your AI engineer skill tree": nodes for Python, RAG, evaluation, PyTorch; each opens a 2-minute "what this is" demo and a matching university course.
- **Sources:** https://www.linkedin.com/pulse/linkedin-jobs-rise-2026-25-fastest-growing-roles-us-linkedin-news-dlb1c
- **Confidence:** confirmed

## 16. What employers now ask for: agents, evaluation, RAG
- **Date:** 2026 (Stanford AI Index, April 2026; posting analyses through mid-2026)
- **What happened:** Lightcast data in the Stanford AI Index: agentic-AI skills rose from 0.06% to 0.23% of US postings (2024 to 2025), ~90,000 postings, mostly engineering roles. A 390-posting analysis of AI engineer ads found 56% mention evaluation, 50% agents, 26% RAG. A 45,318-posting scan found "AI agents" in 9.7% of software engineer ads.
- **Why it matters:** "Can you test whether the AI is right?" (evaluation) is the most-asked new skill.
- **Careers:** ai-engineer, software-engineer, data-scientist
- **Interactive idea:** "Grade the chatbot": student writes 3 test questions for a school-FAQ bot, runs them, and scores answers, i.e. their first eval.
- **Sources:** https://lightcast.io/resources/blog/stanford-ai-2026 ; https://lightcast.io/blog/tracking-the-agentic-ai-explosion-in-jobs ; https://dev.to/ali_82f3409ed625e8ba8515b/ai-engineer-roadmap-2026-what-390-job-postings-actually-require-3jdo
- **Confidence:** likely for Lightcast; unconfirmed for the small blog samples

## 17. Amazon cut ~30,000 corporate jobs; CEO says it is not mainly about AI
- **Date:** 2025-10 (14,000) and 2026-01-28 (16,000)
- **What happened:** Amazon cut ~30,000 corporate roles across two rounds, nearly 10% of corporate staff. Andy Jassy said in June 2025 generative AI would shrink the corporate workforce, later said the cuts were about culture and bureaucracy, not AI or finances.
- **Why it matters:** Good case study in mixed messages: the same company says AI will reduce jobs and that its layoffs are not about AI.
- **Careers:** software-engineer
- **Interactive idea:** "Headline detective": two real quotes from the same CEO side by side; student decides what the evidence actually supports.
- **Sources:** https://wtop.com/national/2026/01/amazon-cuts-16000-jobs-in-the-latest-round-of-layoffs-2/ ; https://abc7news.com/post/amazon-layoffs-company-could-cut-many-30000-corporate-jobs-reports-say/18078414/
- **Confidence:** confirmed (AP)

## 18. AI pay premium is real but flat (~1.29x)
- **Date:** mid-to-late 2026
- **What happened:** Levels.fyi data shared with LetsDataScience: at the same level, ML/AI engineers earned ~1.34x non-AI peers in late 2024 and ~1.29x by mid-2026. Data skews to big tech and self-reported pay.
- **Why it matters:** AI skills pay more, but the premium is not growing forever; fundamentals still matter.
- **Careers:** ai-engineer, software-engineer, data-scientist
- **Interactive idea:** Pay slider comparing software vs AI engineer pay (US) with a Thai-baht toggle that clearly labels US vs Thai numbers.
- **Sources:** https://letsdatascience.com/news/levelsfyi-tells-lds-the-ai-pay-premium-has-stopped-growing-a893d96e
- **Confidence:** unconfirmed (secondary; re-check before use)

## 19. "Vibe coding" was Collins Word of the Year 2025
- **Date:** 2025-11-06
- **What happened:** Collins picked "vibe coding" (coined by Andrej Karpathy, February 2025): using natural-language prompts to have AI write code.
- **Why it matters:** Anyone can build a demo now. What separates professionals is making it secure, correct and maintainable.
- **Careers:** software-engineer, ai-engineer
- **Interactive idea:** "Vibe it, then fix it": student prompts a toy app into existence in a sandbox, then a checklist reveals what is missing (security, tests, edge cases).
- **Sources:** https://kvia.com/news/business-technology/cnn-business-consumer/2025/11/06/vibe-coding-named-collins-dictionarys-word-of-the-year/
- **Confidence:** confirmed

## 20. METR: developers think AI makes them faster than it measurably does
- **Date:** 2025-07 (RCT), 2026-02-24 (redesign), 2026-05-11 (survey)
- **What happened:** METR's 2025 trial found experienced open-source developers took 19% longer with AI tools while believing they were faster. A late-2025 follow-up suggested small speedups but was biased because developers refused to work without AI. A 2026 survey found a median self-reported 1.4 to 2x value gain and 3x speed gain; METR warns self-reports have overestimated before.
- **Why it matters:** Feeling productive and being productive are different. Measuring your own work is a professional skill.
- **Careers:** software-engineer, ai-engineer, data-scientist
- **Interactive idea:** Timed mini-challenge done twice (with and without an AI hint button); the page shows the student's guess vs their actual time.
- **Sources:** https://metr.org/blog/2026-02-24-uplift-update/ ; https://metr.org/blog/2026-05-11-ai-usage-survey/
- **Confidence:** confirmed

---

## Things NOT to claim (checked and weak)
- "205,000 AI layoffs" figures that circulate online do not match Challenger.
- FDE growth "1,000%+" (Lightcast) and "$9B FDE investment" claims: single secondary sources.
- New York Fed CS grad unemployment (7.0% CS, 7.8% computer engineering) is 2024 data from secondary summaries; check the Fed's own table before using.
- Microsoft "20 to 30% of code by AI" is from April 2025 and not updated.
