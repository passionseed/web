import { formatThaiDate } from "@/lib/content/shift-cohort";

/**
 * Facts the Elemental posters print. Source: passionseed/company-brain.
 * - Dates: 5 to 7 December 2026, 3 days over the long weekend (told by
 *   Angpao, 2026-11-19). This changes the 5 to 8 December in
 *   decisions/log.md, which needs a new entry there.
 * - Prices: told by Angpao on 2026-11-19 (company-brain PR #88). Big's
 *   draft in PR #87 says ฿199 alone; settle that before this ships.
 * - Elements and theme: private/hackathon-december-2026.md (PR #87) and
 *   Angpao, 2026-11-19 (Aether is the fifth element).
 * - Prize total: told by Angpao, 2026-11-19 (not yet in company-brain).
 * Change a fact here, never in a poster.
 */
export const ELEMENTAL = {
  series: "The Next Decade",
  edition: "Elemental",
  startDate: "2026-12-05",
  endDate: "2026-12-07",
  days: 3,
  /** The dates fall on a 3-day long weekend (Sat 5 to Mon 7 Dec). */
  longWeekend: true,
  priceBaht: 190,
  groupPriceBaht: 149,
  prizeTotalBaht: 20000,
  theme: "Environmental negligence",
  url: "passionseed.org/hackathon",
  elements: [
    { key: "water", en: "Water", th: "น้ำ" },
    { key: "earth", en: "Earth", th: "ดิน" },
    { key: "air", en: "Air", th: "ลม" },
    { key: "fire", en: "Fire", th: "ไฟ" },
    { key: "aether", en: "Aether", th: "ธาตุที่ 5" },
  ],
} as const;

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "5–8 ธ.ค.": the big date. */
export function thaiDayRange(): string {
  const s = parts(ELEMENTAL.startDate);
  return `${s.day}–${formatThaiDate(ELEMENTAL.endDate, false)}`;
}

/** "20,000". */
export function prizeTotal(): string {
  return ELEMENTAL.prizeTotalBaht.toLocaleString("en-US");
}

/** "5 ถึง 8 ธ.ค. 2569": month once, Buddhist-era year. */
export function thaiDateLine(): string {
  const s = parts(ELEMENTAL.startDate);
  const e = parts(ELEMENTAL.endDate);
  return `${s.day} ถึง ${formatThaiDate(ELEMENTAL.endDate, false)} ${e.year + 543}`;
}
