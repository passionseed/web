/**
 * Fact registry for the software engineer Level 1 guide.
 * Research: docs/radar-guide/factsheets/software-engineer.md (2026-11-11),
 * re-read and extended on 2026-11-18.
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; vendor numbers carry the vendor
 * badge; US numbers are `usOnly`. Shared facts (TCAS round 1) live in
 * lib/radar-guides/_shared/facts.ts.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-18" as const;

export const SOFTWARE_ENGINEER_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.viabus-origin",
    claimEn:
      "ViaBus co-founder and CEO Intouch Marsvongpragorn built an app called Chula Pop Bus in his first year (ปี 1) at Chulalongkorn University's Faculty of Engineering, because he kept missing the campus Pop bus without knowing when it would reach the stop. ViaBus was founded by 3 friends from Chula Engineering (Intouch and 2 others), who tested a beta in their third year; the second beta (September 2017) covered more than 2,300 buses.",
    values: ["1", "2", "3", "2,300"],
    sources: [
      { outlet: "The Momentum", url: "https://themomentum.co/viabus-interview/", publishedAt: "2020-01-01" },
      {
        outlet: "Intania Magazine",
        url: "https://www.intaniamagazine.com/viabus-intouch-maswongpakorn/",
        publishedAt: "2023-11-14",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Interviews with the founder. Intania says he missed a bus at Siam on the way to a pre-first-year event; The Momentum says he often missed the Chula Pop bus. Both agree the first app was Chula Pop Bus, for his own problem.",
  },
  {
    id: "f.viabus-users",
    claimEn:
      "On Aug 6, 2026, when BTS launched real-time train tracking inside ViaBus, Nation Thailand and Bangkokbiznews reported that ViaBus has more than 10 million users (10,000,000).",
    values: ["10", "10,000,000"],
    sources: [
      {
        outlet: "Nation Thailand",
        url: "https://www.nationthailand.com/news/general/40069474",
        publishedAt: "2026-08-06",
      },
      { outlet: "กรุงเทพธุรกิจ (Bangkokbiznews)", url: "https://www.bangkokbiznews.com/economics/1246312", publishedAt: "2026-08-06" },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "The company's own user count as repeated by the press; no independent audit. Say กว่า 10 ล้านคน, not monthly users.",
  },
  {
    id: "f.viabus-reach",
    claimEn:
      "PPTV (Aug 6, 2026): ViaBus grew from a public bus tracking app into one app for buses, boats and trains. On Aug 6, 2026 BTS made the Green, Yellow and Pink lines trackable in real time in ViaBus. It also runs in provinces such as Phuket, Chiang Mai and Nakhon Ratchasima, and has expanded to 3 other countries: Malaysia, Laos and the Philippines.",
    values: ["3"],
    sources: [
      { outlet: "PPTV", url: "https://www.pptvhd36.com/wealth/economic/281019", publishedAt: "2026-08-06" },
      {
        outlet: "Nation Thailand",
        url: "https://www.nationthailand.com/news/general/40069474",
        publishedAt: "2026-08-06",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  // ---------------------------------------------------------------- work
  {
    id: "f.onet-swdev",
    claimEn:
      "O*NET (US Department of Labor occupational database, updated 2026), Software Developers 15-1252.00: the first listed task is \"Analyze user needs and software requirements\"; another is \"Modify existing software to correct errors\". In Work Context, 71% of US respondents rate working with or contributing to a team \"Extremely important\".",
    values: ["71"],
    sources: [{ outlet: "O*NET OnLine", url: "https://www.onetonline.org/link/details/15-1252.00", publishedAt: "2026-11" }],
    asOf: AS_OF,
    badge: "confirmed",
    usOnly: true,
    note: "Page shows \"Updated 2026\" with no day; publishedAt is the read month. Say สำคัญอย่างยิ่ง, not สำคัญที่สุด.",
  },
  {
    id: "f.so2026-ai-daily",
    claimEn:
      "Stack Overflow Developer Survey 2026, AI section: \"The overwhelming majority of respondents now use coding assistants and agents daily (73%)\". The base is respondents (students and other technologists included), not only professional developers.",
    values: ["73", "2026"],
    sources: [{ outlet: "Stack Overflow Developer Survey 2026", url: "https://survey.stackoverflow.co/2026/ai", publishedAt: "2026-11" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Global survey, not Thailand. Say คนตอบ, not นักพัฒนาทุกคน. The page shows no publication month; publishedAt is the read month.",
  },
  {
    id: "f.so2026-trust",
    claimEn:
      "Stack Overflow Developer Survey 2026: \"48% indicate they trust AI when they can easily validate the answers and only 16% extend that trust to most tasks that are not important work decisions.\"",
    values: ["48", "16", "2026"],
    sources: [{ outlet: "Stack Overflow Developer Survey 2026", url: "https://survey.stackoverflow.co/2026/ai", publishedAt: "2026-11" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "One condition among several: say เมื่อ, not ก็ต่อเมื่อ.",
  },
  // ---------------------------------------------------------------- tonight
  {
    id: "f.gh-pages",
    claimEn:
      "GitHub Docs (read Nov 18, 2026): with GitHub Free the repository behind a GitHub Pages site must be public, and Pages sites are public on the internet; a user site is limited to 1 Pages site per account, at <username>.github.io, and changes can take up to 10 minutes to publish. The GitHub Terms of Service say \"You must be age 13 or older\", and a country's minimum age may be older.",
    values: ["1", "10", "13", "18", "2026"],
    sources: [
      { outlet: "GitHub Docs", url: "https://docs.github.com/en/pages/quickstart", publishedAt: "2026-11" },
      {
        outlet: "GitHub Docs",
        url: "https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site",
        publishedAt: "2026-11",
      },
      {
        outlet: "GitHub Terms of Service",
        url: "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
        publishedAt: "2026-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Docs pages carry no publication date; publishedAt is the read month. Free plans make the repo public: nothing personal goes on the page.",
  },
  {
    id: "f.mdn-first-site",
    claimEn:
      "MDN Web Docs (Mozilla), \"Your first website\": a beginner module that assumes no prior knowledge of web technologies; free to read with no account. English only.",
    sources: [
      {
        outlet: "MDN Web Docs",
        url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website",
        publishedAt: "2026-11",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
  },
  // ---------------------------------------------------------------- simulated
  {
    id: "sim.school-bugs",
    claimEn:
      "Simulated support inbox for a made-up school app: 7 messages from students and a teacher (class ม.5/2 and ม.5/3, a quiz leaderboard where a score of 100 sorts below 95 and 80, a feature an AI wrote yesterday). No real school, app or person.",
    values: ["7", "100", "95", "80", "5/2", "5/3"],
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },
];
