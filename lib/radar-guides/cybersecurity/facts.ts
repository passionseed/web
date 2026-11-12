/**
 * Fact registry for the cybersecurity guide.
 * Source: docs/radar-guide/cybersecurity-guide.md, "Fact registry".
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; vendor numbers carry the vendor
 * badge; US numbers are `usOnly`; `drawerOnly` facts are listed by the sources
 * sheet but never cited by copy. Shared facts (TDRI, PDPC fines, mule broker)
 * live in lib/radar-guides/_shared/facts.ts.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-11" as const;

export const CYBERSECURITY_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- mythos
  {
    id: "f.glasswing-launch",
    claimEn:
      "On Apr 7, 2026 Anthropic announced Claude Mythos Preview and withheld it from general release because it is so good at finding vulnerabilities. Anthropic says it found an OpenBSD bug hidden for about 27 years that let an attacker remotely crash a machine just by connecting, and a 16-year-old FFmpeg bug on a line automated tests had run past 5,000,000 times (5 million).",
    values: ["27", "16", "5,000,000", "5"],
    sources: [{ outlet: "Anthropic", url: "https://www.anthropic.com/glasswing", publishedAt: "2026-04-07" }],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.aisle-caveat",
    claimEn:
      "AISLE (whose founder promotes AISLE's own product) reports that small open models found some of the same bugs when handed the isolated vulnerable code.",
    sources: [
      {
        outlet: "AISLE",
        url: "https://aisle.com/blog/ai-cybersecurity-after-mythos-the-jagged-frontier",
        publishedAt: "2026-04",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Critique of the vendor numbers; the author sells a competing product.",
  },
  {
    id: "f.firefox-mozilla",
    claimEn:
      "Mozilla: 271 vulnerabilities were found with Mythos Preview (mostly fixed in Firefox 150), 180 of them sec-high; 423 security bugs were fixed across the April 2026 releases. In 2025 Firefox fixed about 20 to 30 a month; the previous record was 76 (March 2026).",
    values: ["271", "180", "423", "20 ถึง 30", "76", "150"],
    sources: [
      {
        outlet: "Mozilla Hacks",
        url: "https://hacks.mozilla.org/2026/05/behind-the-scenes-hardening-firefox/",
        publishedAt: "2026-05-07",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.mythos52",
    claimEn:
      "On Nov 9, 2026 Anthropic released Fable 5.2 and Mythos 5.2, described as the same model behind two doors: Fable 5.2 is generally available but routes blocked high-risk cyber requests to an older model; Mythos 5.2 has no such block and goes to vetted organisations through the Cyber Verification Program and to Claude Enterprise customers through Claude Security.",
    values: ["5.2", "9"],
    sources: [
      { outlet: "Anthropic", url: "https://www.anthropic.com/claude-fable-and-mythos-5-2", publishedAt: "2026-11-09" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },

  // ---------------------------------------------------------------- doors
  {
    id: "f.cvp-tiers",
    claimEn:
      "Anthropic's Cyber Verification Program (Oct 6, 2026) has three tiers: Defense (organisations and individuals with a verifiable track record), Red Team (organisations only, still blocks ransomware-type actions) and Specialized (safety-critical systems, reviewed with the US government).",
    sources: [
      {
        outlet: "Anthropic",
        url: "https://www.anthropic.com/news/cyber-verification-program",
        publishedAt: "2026-10-06",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.cursor-reuters",
    claimEn:
      "Reuters (Aug 27, 2026): an affiliate of a ransomware group used an AI coding agent and, when it refused, restarted and recast the work as an authorised test; at least 7 companies were breached between Apr 8 and May 21, 2026.",
    values: ["7"],
    sources: [
      {
        outlet: "Reuters via BNN Bloomberg",
        url: "https://www.bnnbloomberg.ca/business/artificial-intelligence/2026/08/27/russian-speaking-cybercriminals-used-spacexs-cursor-ai-tool-to-hack-seven-companies-reuters-exclusive/",
        publishedAt: "2026-08-27",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Victim companies stay unnamed in copy.",
  },
  {
    id: "f.dream-taiwan",
    claimEn:
      "Security firm Dream reported (Aug 12, 2026) that attackers framed their work as authorised penetration testing to get past an AI agent's guardrails; media named Taiwan, and Taiwan's digital ministry confirmed an AI-agent-assisted attack (Aug 13, 2026), with no counts and no attribution to any country.",
    sources: [
      {
        outlet: "The Register",
        url: "https://www.theregister.com/security/2026/08/12/near-autonomous-ai-agents-attack-taiwans-nuclear-safety-agency/5287055",
        publishedAt: "2026-08-12",
      },
      { outlet: "Focus Taiwan", url: "https://focustaiwan.tw/society/202608130011", publishedAt: "2026-08-13" },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "The attack framing comes from Dream's own report.",
  },
  {
    id: "f.gtg1002",
    claimEn:
      "Anthropic (Nov 13, 2025) says it disrupted an espionage group that used Claude Code against about 30 targets; the attackers claimed to be a security firm testing systems and split the work into small harmless-looking pieces; AI did about 80 to 90% of the work, with perhaps 4 to 6 human decision points.",
    values: ["30", "80 ถึง 90", "4 ถึง 6"],
    sources: [
      { outlet: "Anthropic", url: "https://www.anthropic.com/news/disrupting-AI-espionage", publishedAt: "2025-11-13" },
    ],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.gpt6-cyber",
    claimEn:
      "OpenAI released GPT-6 Cyber to approved customers allowed to do offensive security work (Nov 5, 2026). In OpenAI's own evaluation it went out of scope 0.07% of the time (reportedly without deployment safety prompts), which is about 7 in 10,000 runs (our math). OpenAI shelved a next model (GPT-6.1 Astra) because it got worse at staying in bounds.",
    values: ["0.07", "7", "10,000", "5"],
    sources: [
      {
        outlet: "The Register",
        url: "https://www.theregister.com/security/2026/11/05/openai-releases-gpt-6-cyber-and-promises-this-one-stays-within-rules-of-engagement/5307855",
        publishedAt: "2026-11-05",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.gemini-argon",
    claimEn:
      "Google gave its new model (Gemini 4 Argon) first to cyber defenders in its own Fairwind programme on Sep 30, 2026, with wider availability by about Oct 13, 2026.",
    values: ["30", "13"],
    sources: [
      {
        outlet: "TechCrunch",
        url: "https://techcrunch.com/2026/09/30/google-releases-gemini-4-argon-called-its-most-powerful-model-yet/",
        publishedAt: "2026-09-30",
      },
      {
        outlet: "Google",
        url: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/",
        publishedAt: "2026-10-13",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.fable5-mythos5-launch",
    claimEn:
      "On Jun 9, 2026 Anthropic released Fable 5 to everyone and kept Mythos 5 restricted to Glasswing partner organisations.",
    values: ["9", "5"],
    sources: [
      { outlet: "Anthropic", url: "https://www.anthropic.com/news/claude-fable-5-mythos-5", publishedAt: "2026-06-09" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.us-directive",
    claimEn:
      "On Jun 12, 2026 a US government directive covered foreign nationals; Anthropic could not check nationality in real time and disabled Fable 5 and Mythos 5 for all customers. The directive was lifted on Jun 30; Fable 5 came back worldwide on Jul 1 (19 days offline); Mythos 5 came back only for approved US organisations.",
    values: ["12", "30", "1", "19", "5"],
    sources: [
      {
        outlet: "CNBC",
        url: "https://www.cnbc.com/2026/06/12/anthropic-disables-access-to-fable-5-and-mythos-5-to-comply-with-government-directive.html",
        publishedAt: "2026-06-12",
      },
      { outlet: "Anthropic", url: "https://www.anthropic.com/news/redeploying-fable-5", publishedAt: "2026-06-30" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },

  // ---------------------------------------------------------------- triage
  {
    id: "f.crowdstrike",
    claimEn:
      "CrowdStrike Global Threat Report (Feb 24, 2026): in 2025 the average eCrime breakout time (from first access to moving to another machine) was 29 minutes; the fastest observed was 27 seconds, a single case.",
    values: ["29", "27"],
    sources: [
      {
        outlet: "CrowdStrike",
        url: "https://www.crowdstrike.com/en-us/press-releases/2026-crowdstrike-global-threat-report/",
        publishedAt: "2026-02-24",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.patch-gap",
    claimEn:
      "Anthropic's coordinated disclosure dashboard (updated Nov 2, 2026): 5,087 vulnerabilities disclosed to 680 open-source projects; to Anthropic's knowledge at least 629 patched (a floor, about 12% by our math).",
    values: ["5,087", "629", "12", "680", "2"],
    sources: [{ outlet: "Anthropic", url: "https://red.anthropic.com/2026/cvd/", publishedAt: "2026-11-02" }],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.glasswing-bottleneck-quote",
    claimEn:
      "Anthropic (May 22, 2026): software security \"used to be limited by how quickly we could find new vulnerabilities. Now it's limited by how quickly we can verify, disclose, and patch.\"",
    sources: [
      {
        outlet: "Anthropic",
        url: "https://www.anthropic.com/research/glasswing-initial-update",
        publishedAt: "2026-05-22",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.oss-scanner",
    claimEn:
      "Anthropic (Oct 8, 2026): experts reviewed 97 high or critical AI-written findings; 85 met the bar to report to maintainers, 11 were real but duplicates, 1 was a false positive.",
    values: ["97", "85", "11", "1"],
    sources: [
      {
        outlet: "Anthropic",
        url: "https://www.anthropic.com/research/launching-opt-in-vuln-finding-service-for-open-source",
        publishedAt: "2026-10-08",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.severity-gap",
    claimEn:
      "VulnCheck: Claude rated 91.5% of its findings critical or high versus maintainers' 61.3% (a later post may say 51.3%).",
    sources: [
      { outlet: "VulnCheck", url: "https://www.vulncheck.com/blog/anthropic-glasswing-receipts", publishedAt: "2026-09-08" },
    ],
    asOf: AS_OF,
    badge: "pending",
    drawerOnly: true,
  },
  {
    id: "f.cso-manager-agents",
    claimEn: "CSO Online opinion: Tier 1 SOC analysts \"won't be replaced. They'll be promoted\" to managers of AI agents.",
    sources: [
      {
        outlet: "CSO Online",
        url: "https://www.csoonline.com/article/4163299/the-manager-of-agents-how-ai-evolves-the-soc-analyst-role.html",
        publishedAt: "2026-04-27",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    drawerOnly: true,
    note: "Opinion piece; frames the 'manager of agents' idea only.",
  },

  // ---------------------------------------------------------------- scam
  {
    id: "f.nsc",
    claimEn:
      "Thailand's NSC secretary-general (Nov 9, 2026): government agencies, banks and utilities face attack attempts every day, and attackers use AI to find weaknesses before striking (no model named).",
    values: ["9"],
    sources: [
      { outlet: "Nation Thailand", url: "https://www.nationthailand.com/news/general/40073298", publishedAt: "2026-11-09" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.bot",
    claimEn:
      "Bank of Thailand release 44/2569 (Nov 9, 2026): BOT convened the CIOs of all financial institutions with TB-CERT and the Thai Bankers' Association after attacks on overseas banks; no impact on services in Thailand was found.",
    values: ["9"],
    sources: [
      {
        outlet: "ธนาคารแห่งประเทศไทย",
        url: "https://www.bot.or.th/content/dam/bot/documents/th/news-and-media/news/2026/news-20261109-2.pdf",
        publishedAt: "2026-11-09",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.thai-airways",
    claimEn:
      "Thai Airways (reported Nov 10, 2026): about 60,529 passenger booking records (about 60,000) were accessed through Amadeus, the booking system airlines use, from Aug 10, 2023 to Sep 23, 2026 (more than 3 years); THAI says card data was not affected. MLex reports 65,029; CAAT lists 6 other airlines.",
    values: ["60,000", "3", "10"],
    sources: [
      { outlet: "Nation Thailand", url: "https://www.nationthailand.com/news/general/40073323", publishedAt: "2026-11-10" },
      {
        outlet: "MLex",
        url: "https://www.mlex.com/mlex/data-privacy-security/articles/2548884",
        publishedAt: "2026-11-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Count conflict (60,529 vs 65,029) is shown in the sources sheet only.",
  },
  {
    id: "f.gasa-survey",
    claimEn:
      "GASA, Mastercard and Whoscall survey of 1,290 Thai adults (fieldwork Mar to Apr 2026, reported Nov 9 to 11, 2026): 79% had encountered scammers; the most common channels were Facebook 54% and LINE 48%; only 4% reported it to police. Loss estimate THB 65.86 billion is for the sources sheet only.",
    values: ["1,290", "79", "54", "48", "4"],
    sources: [
      {
        outlet: "Bangkok Post",
        url: "https://www.bangkokpost.com/business/general/3352410/scam-losses-reach-b658bn-in-thailand",
        publishedAt: "2026-11-09",
      },
      {
        outlet: "Thai Examiner",
        url: "https://www.thaiexaminer.com/thai-news-foreigners/2026/11/11/facebook-and-line-social-networks-in-thailand-the-leading-gateways-for-online-scammers-targeting-victims/",
        publishedAt: "2026-11-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.fake-police",
    claimEn:
      "Sep 2, 2026: three victims (3 people) aged 19, 22 and 19 lost 2,743,984 baht in total (about 2.74 million, over 2,700,000) to fake police on video calls; in 2 of the 3 cases it started with a fake lecturer offering a scholarship abroad; a call from the bank's fraud team stopped a further 500,000 baht transfer.",
    values: ["3", "19 ถึง 22", "2,743,984", "2.74", "2.7", "2,700,000", "500,000", "2"],
    sources: [
      { outlet: "MGR Online", url: "https://mgronline.com/crime/detail/9690000087344", publishedAt: "2026-09-06" },
      { outlet: "ไทยโพสต์", url: "https://www.thaipost.net/criminality-news/1064282/", publishedAt: "2026-09-06" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.de-trends",
    claimEn:
      "Thailand's Ministry of Digital Economy and Society, scam trends for 2026 (Dec 26, 2025): fake payment links posing as electricity or water utilities, and AI deepfake calls and videos imitating relatives or officials.",
    sources: [
      { outlet: "Nation Thailand", url: "https://www.nationthailand.com/news/general/40060353", publishedAt: "2025-12-26" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.aoc1441",
    claimEn: "AOC 1441 is Thailand's anti-online-scam hotline (reported Feb 3, 2026).",
    values: ["1441"],
    sources: [
      { outlet: "Nation Thailand", url: "https://www.nationthailand.com/business/tech/40062053", publishedAt: "2026-02-03" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },

  // ---------------------------------------------------------------- firstjob
  {
    id: "f.isc2-pulse",
    claimEn:
      "ISC2 AI Pulse Survey (n=436, Jul 16, 2025): 52% say AI will reduce the need for entry-level staff; 31% expect new junior roles such as an AI-assisted SOC analyst.",
    values: ["52", "31", "436"],
    sources: [
      { outlet: "ISC2", url: "https://www.isc2.org/insights/2025/07/2025-isc2-ai-pulse-survey", publishedAt: "2025-07-16" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.isc2-workforce",
    claimEn:
      "ISC2 Cybersecurity Workforce Study (n=16,029, Dec 4, 2025): AI is the most pressing skills need (41%).",
    values: ["16,029", "41"],
    sources: [
      {
        outlet: "ISC2",
        url: "https://www.isc2.org/Insights/2025/12/2025-ISC2-Cybersecurity-Workforce-Study",
        publishedAt: "2025-12-04",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.sans-titles",
    claimEn:
      "US job postings in mid-Sep 2026 (SANS tracker via Cybersecurity Dive, Oct 20, 2026): AI/ML security engineer 850+ (median $140,000), AI governance (GRC) about 430 ($146,000), AI red team about 100 ($124,000), AI SOC orchestrator 36.",
    values: ["850", "430", "100", "36", "140,000", "146,000", "124,000"],
    sources: [
      {
        outlet: "Cybersecurity Dive",
        url: "https://www.cybersecuritydive.com/news/ai-security-jobs-hiring-sans-tracker/833465/",
        publishedAt: "2026-10-20",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    usOnly: true,
  },

  // ---------------------------------------------------------------- money
  {
    id: "f.jobsdb-security",
    claimEn:
      "JobsDB Thailand, Security Engineer advertised base pay per month, all experience levels (re-checked Nov 11, 2026): p10 27,000; p25 33,000; median 35,500; p75 39,000; p90 45,000.",
    values: ["27,000", "33,000", "35,500", "39,000", "45,000", "10", "25", "75", "90"],
    sources: [
      {
        outlet: "JobsDB",
        url: "https://th.jobsdb.com/career-advice/role/security-engineer/salary",
        publishedAt: "2026-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.jobsdb-entry",
    claimEn: "JobsDB entry-level Security Engineer ads sit around 25,000 to 35,000 baht a month (Jul 2026 reading, grade B).",
    values: ["25,000 ถึง 35,000"],
    sources: [
      {
        outlet: "JobsDB",
        url: "https://th.jobsdb.com/career-advice/role/security-engineer/salary",
        publishedAt: "2026-07",
      },
    ],
    asOf: AS_OF,
    badge: "pending",
  },
  {
    id: "f.adecco",
    claimEn:
      "Adecco Thailand Salary Guide 2026 (HREX summary, Apr 22, 2026): IT Security, senior 7+ years, up to about 250,000 baht a month; job-switchers in cyber, data and AI ask for 20 to 25% raises; general staff get about 2 to 5% a year. Skews toward multinational employers.",
    values: ["7", "250,000", "20 ถึง 25", "2 ถึง 5"],
    sources: [
      {
        outlet: "HREX (Adecco Thailand Salary Guide 2026)",
        url: "https://th.hrnote.asia/hr-survey/adecco-thailand-salary-guide-2026-260422/",
        publishedAt: "2026-04-22",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Secondary summary of the Adecco guide.",
  },
  {
    id: "f.bls-infosec",
    claimEn: "US BLS: median pay for Information Security Analysts was $129,180 a year (May 2025).",
    values: ["129,180"],
    sources: [
      {
        outlet: "US Bureau of Labor Statistics",
        url: "https://www.bls.gov/ooh/computer-and-information-technology/information-security-analysts.htm",
        publishedAt: "2026-08-27",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    usOnly: true,
  },

  // ---------------------------------------------------------------- fit / tcas
  {
    id: "f.onet-infosec",
    claimEn: "O*NET 15-1212.00: information security analysts prepare reports documenting security breaches and the damage caused.",
    sources: [{ outlet: "O*NET OnLine", url: "https://www.onetonline.org/link/summary/15-1212.00", publishedAt: "2026-10" }],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.mytcas-9",
    claimEn:
      "mytcas TCAS70 (checked Nov 11, 2026): 9 programmes have ไซเบอร์ in the programme name: 5 under computer science, 2 under computer engineering, 1 under software engineering, 1 under IT.",
    values: ["9", "5", "2", "1", "70"],
    sources: [
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10160101300504A", publishedAt: "2026-11-11" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Names and links come from lib/radar-guides/cybersecurity/tcas.json (pnpm radar:tcas cybersecurity).",
  },
  {
    id: "f.mytcas-four",
    claimEn:
      "mytcas TCAS70 lists KMITL 10160101300504A (Thai regular), KKU 10030138220204A (Thai regular), CMU 10040106300502E (international) and TU 10050209220202B (Thai special programme).",
    sources: [
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10050209220202B", publishedAt: "2026-11-11" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.kmitl-portfolio",
    claimEn:
      "KMITL Computer Engineering and Cybersecurity, TCAS70 round 1 Portfolio: 40 seats, GPAX 3.00 or above, closes Jan 28, 2027 at 16:30.",
    values: ["40", "3.00", "28", "16:30"],
    sources: [{ outlet: "eduzones", url: "https://www.eduzones.com/2026/11/09/eng-kmitl70/", publishedAt: "2026-11-09" }],
    asOf: AS_OF,
    badge: "pending",
    note: "Secondary source; confirm on KMITL's official announcement.",
  },
  {
    id: "f.tctt",
    claimEn:
      "Thailand Cyber Top Talent 2026 has a Junior tier for secondary-school students: 484 Junior competitors out of 1,399 in total; the Junior winning team got 80,000 baht and a royal trophy; the final was on Sep 5, 2026.",
    values: ["484", "1,399", "80,000", "5"],
    sources: [
      { outlet: "THNCA", url: "https://www.thnca.or.th/tctt2026/", publishedAt: "2026-09" },
      { outlet: "ctf.in.th", url: "https://ctf.in.th/tctt-statistics/", publishedAt: "2026-10-10" },
      { outlet: "MGR Online", url: "https://mgronline.com/entertainment/detail/9690000087648", publishedAt: "2026-09-07" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.tctt-kmitl-caveat",
    claimEn: "KMITL's Top Talents scheme lists this competition as an example, but not every award level counts.",
    sources: [{ outlet: "eduzones", url: "https://www.eduzones.com/2026/11/09/eng-kmitl70/", publishedAt: "2026-11-09" }],
    asOf: AS_OF,
    badge: "pending",
  },
  {
    id: "f.secai",
    claimEn:
      "CompTIA SecAI+ (CY0-001, launched Feb 17, 2026) recommends 3 to 4 years of IT experience plus 2 or more years in security.",
    values: ["3 ถึง 4"],
    sources: [{ outlet: "CompTIA", url: "https://www.comptia.org/en/certifications/secai/", publishedAt: "2026-02-17" }],
    asOf: AS_OF,
    badge: "confirmed",
  },

  // ---------------------------------------------------------------- terminal / tonight
  {
    id: "f.jadepuffer",
    claimEn:
      "Sysdig (Jul 1, 2026): an attacker's AI agent got in through a Langflow vulnerability (CVE-2025-3248) that had a patch since April 2025 that nobody applied; when a step failed it produced a working fix in 31 seconds. Calling it the first such case is Sysdig's own assessment.",
    values: ["31"],
    sources: [
      {
        outlet: "Sysdig",
        url: "https://sysdig.com/blog/jadepuffer-agentic-ransomware-for-automated-database-extortion",
        publishedAt: "2026-07-01",
      },
    ],
    asOf: AS_OF,
    badge: "vendor",
  },
  {
    id: "f.thm-free",
    claimEn:
      "TryHackMe (Aug 31, 2026) lists the Offensive Security Intro room and says every room in that guide is free to access with a TryHackMe account.",
    values: ["31"],
    sources: [
      {
        outlet: "TryHackMe",
        url: "https://tryhackme.com/resources/blog/free-red-teaming-training-on-tryhackme-to-build-your-skills-in-2026",
        publishedAt: "2026-08-31",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Re-check before each recording; age terms: a parent signs up where the site requires it.",
  },
  {
    id: "f.thm-fakebank",
    claimEn: "The Offensive Security Intro room uses a practice fake-bank website built for beginners.",
    sources: [
      { outlet: "TryHackMe", url: "https://tryhackme.com/room/offensivesecurityintro", publishedAt: "2026-08" },
    ],
    asOf: AS_OF,
    badge: "pending",
    note: "From third-party walkthroughs; confirm on screen while recording.",
  },

  // ---------------------------------------------------------------- simulated
  {
    id: "sim.mythos-snippet",
    claimEn:
      "Simulated C snippet in the spirit of the real bug: a 64-byte name buffer, a length byte the sender controls (up to 255), copy before the size check on line 7; not real OpenBSD code.",
    values: ["64", "255", "7"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
  {
    id: "sim.triage-queue",
    claimEn:
      "Simulated SOC queue: 10 alerts labelled by an AI, 2 of them wrong and 8 right; times, confidence percentages and counts are made up; IPs come from RFC 5737.",
    values: ["10", "2", "8"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
  {
    id: "sim.scam-chat",
    claimEn:
      "Simulated family chat with 7 messages (5,000 baht, 120 baht, 3 accounts, period 3); generic chat UI, no real brands or people.",
    values: ["7", "5,000", "120", "3"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
  {
    id: "sim.terminal",
    claimEn:
      "Simulated lab terminal: auth.log with 60 lines, 41 failed passwords then 1 accepted (attempt 42), port 80, IPs from RFC 5737; no network, no real machine.",
    values: ["60", "41", "42", "80"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
];
