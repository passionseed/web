import { formatThaiDate } from "@/lib/content/shift-cohort";

/**
 * Facts the Elemental posters print. Source: passionseed/company-brain.
 * - Dates: 5 to 7 December 2026, 3 days over the long weekend (told by
 *   Angpao, 2026-11-19). This changes the 5 to 8 December in
 *   decisions/log.md, which needs a new entry there.
 * - Prices: ฿199 alone (told by Angpao, 2026-11-20; it replaces ฿190) and
 *   ฿149 a person with others (company-brain numbers.md).
 * - Elements and theme: private/hackathon-december-2026.md (PR #87) and
 *   Angpao, 2026-11-19 (Aether is the fifth element).
 * - Aether's Thai name and scope: ธาตุที่มองไม่เห็น, covering AI, social
 *   media and the harms of tech we don't notice (Big, 2026-11-21). It
 *   replaces ธาตุที่ 5 and อีเธอร์.
 * - Prize total: told by Angpao, 2026-11-19. The three prizes: Angpao,
 *   2026-11-21 (company-brain numbers.md).
 * - Who can join: M.3 to M.6, from anywhere in Thailand (Angpao, 2026-11-24;
 *   it replaces M.4 to M.6, Big, 2026-11-22; company-brain decisions/log.md).
 * - Online, on Discord; groups of up to 5 (Bunyasit, 2026-11-20).
 * - Sign-up closes Fri 4 Dec 2026 (Angpao, 2026-11-23; it replaces Thu 3 Dec
 *   in hackathon-ops registration.md); a group is 2 or more people (Big's
 *   draft there) and pays on one slip.
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
  priceBaht: 199,
  groupPriceBaht: 149,
  prizeTotalBaht: 20000,
  /** The three prizes: cash and Claude credit, in baht. They add up to prizeTotalBaht. */
  prizes: [
    { place: 1, cashBaht: 7000, creditBaht: 4000 },
    { place: 2, cashBaht: 3000, creditBaht: 3000 },
    { place: 3, cashBaht: 0, creditBaht: 3000 },
  ],
  /** Who can join: school years, from anywhere in Thailand. */
  gradesTh: "ม.3–ม.6",
  theme: "Environmental negligence",
  /** The permanent link. /hackathon redirects here while Elemental is current. */
  url: "passionseed.org/hackathon/elemental",
  /** Database key for registrations. */
  slug: "elemental-2026",
  /** Last day to sign up, Bangkok time (inclusive). */
  registrationClosesOn: "2026-12-04",
  /** Where it happens. */
  venueTh: "ออนไลน์ทาง Discord",
  /** Largest group on one sign-up. */
  maxGroupSize: 5,
  /**
   * Sponsor packages, paid in cash or in goods of the same value (Angpao,
   * 2026-11-20; company-brain numbers.md). What each one gets is in the
   * sponsor deck.
   */
  sponsorPackagesBaht: [10000, 5000, 1000],
  /** Team size: 2 to 5 (Angpao, 2026-11-20; company-brain numbers.md). */
  teamMin: 2,
  teamMax: 5,
  /**
   * The programme (Angpao, 2026-11-20; company-brain decisions/log.md).
   * kind: open = opening, workshop = live workshop, due = hand-in deadline.
   */
  schedule: [
    { date: "2026-12-04", time: "19:00", th: "เปิดงานและปฐมนิเทศ", kind: "open" },
    { date: "2026-12-05", time: "10:00–11:00", th: "เวิร์กช็อป: สัมภาษณ์และหากลุ่มลูกค้า", kind: "workshop" },
    { date: "2026-12-05", time: "19:00–20:00", th: "เวิร์กช็อป: สร้างผลงาน", kind: "workshop" },
    { date: "2026-12-06", time: "19:00–20:00", th: "เวิร์กช็อป: การนำเสนอ", kind: "workshop" },
    { date: "2026-12-07", time: "23:00", th: "ส่งคลิปผลงาน", kind: "due" },
  ],
  elements: [
    { key: "water", en: "Water", th: "น้ำ" },
    { key: "earth", en: "Earth", th: "ดิน" },
    { key: "air", en: "Air", th: "ลม" },
    { key: "fire", en: "Fire", th: "ไฟ" },
    { key: "aether", en: "Aether", th: "ธาตุที่มองไม่เห็น" },
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
