/**
 * Facts reused by several careers (Thai labour market, Thai scam and privacy
 * enforcement cases). Ids must stay unique across _shared and every career
 * (lib/radar-guides/facts.ts mergeFacts, guides.test.ts).
 *
 * Every number a Thai sentence prints must appear in `claimEn` or `values`
 * (guide-lint rule 2). Dates are publication dates.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

export const SHARED_FACTS: readonly Fact[] = [
  {
    id: "f.tdri",
    claimEn:
      "TDRI estimates about 2.2 million Thai workers (5.6%) are at high risk of AI doing their work, and says new graduates are finding entry-level jobs harder to get (TDRI conference, reported around Oct 22, 2026).",
    values: ["2.2", "5.6"],
    sources: [
      {
        outlet: "กรุงเทพธุรกิจ (Bangkokbiznews)",
        url: "https://www.bangkokbiznews.com/economics/1258451",
        publishedAt: "2026-10",
      },
    ],
    asOf: "2026-11-11",
    badge: "confirmed",
  },
  {
    id: "f.pdpc-fines",
    claimEn:
      "On Aug 1, 2025 Thailand's PDPC fined a system developer (the data processor) THB 3 million (3,000,000) and its client THB 500,000 over the same leak.",
    values: ["3", "3,000,000", "500,000"],
    sources: [
      {
        outlet: "Nagashima Ohno & Tsunematsu",
        url: "https://www.nagashima.com/en/publications/publication20250822-1/",
        publishedAt: "2025-08-22",
      },
    ],
    asOf: "2026-11-11",
    badge: "confirmed",
  },
  {
    id: "f.mule-broker",
    claimEn:
      "On Oct 18, 2026 Thai cyber police arrested a 20-year-old broker who got a 15-year-old ม.2 student to open 3 bank accounts; the accounts were linked to 5 cases with 675,000 baht in losses.",
    values: ["20", "15", "3", "5", "675,000"],
    sources: [
      { outlet: "ไทยโพสต์", url: "https://www.thaipost.net/criminality-news/1090766/", publishedAt: "2026-10-18" },
      { outlet: "MGR Online", url: "https://mgronline.com/local/detail/9690000100761", publishedAt: "2026-10-18" },
    ],
    asOf: "2026-11-11",
    badge: "confirmed",
  },
  // ---------------------------------------------------------------- TCAS round 1 (Level 1, every career)
  {
    id: "f.tcas70-rounds",
    claimEn:
      "mytcas (official, CUPT/ทปอ.), TCAS70: there are 4 rounds (1 Portfolio, 2 Quota, 3 Admission, 4 Direct Admission). Round 1 Portfolio applications are set by each university from Aug 15, 2026 (15 ส.ค. 69) on; results in the system Mar 10, 2027 (10 มี.ค. 70).",
    values: ["4", "15", "10", "69", "70"],
    sources: [{ outlet: "mytcas", url: "https://www.mytcas.com/", publishedAt: "2026-11-16" }],
    asOf: "2026-11-17",
    badge: "confirmed",
    note: "mytcas homepage timeline, UPDATE 16/11/2026. Closing dates differ by university and programme.",
  },
  {
    id: "f.tcasfolio",
    claimEn:
      "PPTV (Jul 8, 2026): ทปอ. introduced TCASfolio, a portfolio system first used in TCAS70. A student can make up to 40 items. Items include an essay or reason for applying, projects (โครงการ/โครงงาน), activities, certificates or awards, and the university's extra questions.",
    values: ["40", "70"],
    sources: [
      {
        outlet: "PPTV",
        url: "https://www.pptvhd36.com/news/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1/279213",
        publishedAt: "2026-07-08",
      },
    ],
    asOf: "2026-11-17",
    badge: "confirmed",
    note: "News report, not the mytcas manual. Say \"ทำได้สูงสุด 40 รายการ\", not \"เก็บ\".",
  },
  {
    id: "f.ssru-r1",
    claimEn:
      "Eduzones (Nov 12, 2026): Suan Sunandha Rajabhat University's TCAS70 round 1 Portfolio is open Nov 3, 2026 to Feb 9, 2027 (9 ก.พ. 2570), 7,585 seats. Shows round 1 is still open at some universities in November.",
    values: ["7,585", "9", "2570"],
    sources: [{ outlet: "Eduzones", url: "https://www.eduzones.com/2026/11/12/ssru1-tcas70/", publishedAt: "2026-11-12" }],
    asOf: "2026-11-17",
    badge: "pending",
    note: "Secondary source; confirm on SSRU's own admissions site before printing the seat count.",
  },
];
