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
];
