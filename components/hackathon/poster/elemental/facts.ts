import { formatThaiDate } from "@/lib/content/shift-cohort";

/** A kind of programme slot: opening, a live workshop, building, a deadline, or Demo Day. */
export type ElementalSlotKind = "open" | "workshop" | "build" | "due" | "demo";

/** One line of the programme. `time` is null when only the day is set. */
export type ElementalSlot = {
  date: string;
  time: string | null;
  th: string;
  en: string;
  kind: ElementalSlotKind;
};

/**
 * The programme (Big, 2026-11-26; company-brain decisions/log.md, PR #134).
 * Only the times below are decided. Which of the old workshop times
 * (Sat 5 Dec 10:00 and 19:00, Sun 6 Dec 19:00) still hold is (fill in), so
 * they are not listed: add them back here once they are confirmed.
 */
const SCHEDULE: readonly ElementalSlot[] = [
  { date: "2026-12-04", time: "19:00", th: "เปิดงาน (ออนไลน์)", en: "Opening (online)", kind: "open" },
  { date: "2026-12-04", time: "23:59", th: "ปิดรับสมัคร", en: "Sign-up closes", kind: "due" },
  { date: "2026-12-05", time: null, th: "เริ่มช่วงสร้างผลงาน (ออนไลน์ทาง Discord)", en: "Build sprint starts (online, Discord)", kind: "build" },
  { date: "2026-12-07", time: null, th: "จบช่วงสร้างผลงาน ประกาศทีมที่เข้ารอบ", en: "Sprint ends. Finalists announced", kind: "build" },
  { date: "2026-12-08", time: null, th: "สัปดาห์ทดสอบ: หาผู้ใช้จริง เก็บหลักฐาน", en: "Test week: get real users, log evidence", kind: "build" },
  { date: "2026-12-10", time: null, th: "วันรัฐธรรมนูญ (วันหยุด): ได้วันสร้างงานเพิ่มอีกวัน", en: "Constitution Day (holiday): extra build day", kind: "build" },
  { date: "2026-12-10", time: "23:00", th: "ส่งผลงานรอบสุดท้าย", en: "Final hand-in", kind: "due" },
  { date: "2026-12-12", time: null, th: "Demo Day และมอบรางวัล ที่ BAScii จุฬาฯ", en: "Demo Day and awards, onsite at BAScii, Chula", kind: "demo" },
];

/**
 * Facts the Elemental posters print. Source: passionseed/company-brain.
 * - Dates: Fri 4 to Sat 12 December 2026 (Big, 2026-11-26; company-brain
 *   decisions/log.md, PR #134). Online on Discord until Demo Day, which is
 *   onsite at BAScii, Chula, on Sat 12 Dec. BAScii is closed on Sat 5 Dec.
 *   This replaces 5 to 7 December, 3 days over the long weekend (Angpao,
 *   2026-11-19), and the video hand-in on Mon 7 Dec at 23:00. CSII said OK to
 *   BAScii for 12 Dec (told by Big, 2026-11-26; Linear HAC-74). Hours: (fill in).
 * - The final hand-in is Thu 10 Dec at 23:00 (Big, 2026-11-27). It replaces
 *   Fri 11 Dec at 23:59, so Constitution Day is the last build day.
 * - Sponsor logos are locked on Mon 7 Dec (Big, 2026-11-26).
 * - Prices: ฿199 alone (told by Angpao, 2026-11-20; it replaces ฿190) and
 *   ฿149 a person with others (company-brain numbers.md).
 * - Elements and theme: private/hackathon-december-2026.md (PR #87) and
 *   Angpao, 2026-11-19 (Aether is the fifth element).
 * - Aether's Thai name: อีเธอร์, always (Angpao, 2026-11-24; it replaces
 *   ธาตุที่มองไม่เห็น, Big, 2026-11-21). Its scope is unchanged: AI, social
 *   media and the harms of tech we don't notice (Big, 2026-11-21).
 * - Prize total: told by Angpao, 2026-11-19. The three prizes: Angpao,
 *   2026-11-21 (company-brain numbers.md). Changed by Angpao, 2026-11-24:
 *   the Claude credit drops to 3,000 / 2,500 / 2,000, and the winner of
 *   each track gets 500 of Claude credit. A track is one of the five
 *   elements (confirmed by Angpao the same day), so the total stays 20,000.
 * - Who can join: M.3 to M.6, from anywhere in Thailand (Angpao, 2026-11-24;
 *   it replaces M.4 to M.6, Big, 2026-11-22; company-brain decisions/log.md).
 * - Online, on Discord; groups of up to 5 (Bunyasit, 2026-11-20). Demo Day
 *   on 12 Dec is the only onsite day (Big, 2026-11-26).
 * - Sign-up closes Fri 4 Dec 2026 at 23:59 (the one-day extension from
 *   Thu 3 Dec, announced 2026-11-26; unchanged by the 12 Dec extension).
 *   A group is 2 or more people (Big's draft in hackathon-ops
 *   registration.md) and pays on one slip.
 * Change a fact here, never in a poster.
 */
export const ELEMENTAL = {
  series: "The Next Decade",
  edition: "Elemental",
  /** Opening night, online. */
  startDate: "2026-12-04",
  /** Demo Day, onsite. */
  endDate: "2026-12-12",
  /** 4 to 12 December, counting both ends. */
  days: 9,
  /** No longer only a long weekend: it runs into the week after (it was Sat 5 to Mon 7 Dec). */
  longWeekend: false,
  priceBaht: 199,
  groupPriceBaht: 149,
  /** One friend invited by a paid solo (฿199) payer: 199 + 99 = 2 × 149 (Big, 2026-11-26). */
  buddyPriceBaht: 99,
  prizeTotalBaht: 20000,
  /**
   * The three prizes: cash and Claude credit, in baht. With the five element
   * prizes below they add up to prizeTotalBaht.
   */
  prizes: [
    { place: 1, cashBaht: 7000, creditBaht: 3000 },
    { place: 2, cashBaht: 3000, creditBaht: 2500 },
    { place: 3, cashBaht: 0, creditBaht: 2000 },
  ],
  /** Claude credit for the winner of each element ("each track"), in baht. */
  elementPrizeCreditBaht: 500,
  /** Who can join: school years, from anywhere in Thailand. */
  gradesTh: "ม.3–ม.6",
  /**
   * The theme, as printed. The hackathon is about fixing the environment,
   * not about who made it worse (Angpao, 2026-11-24; it replaces
   * "Environmental negligence").
   */
  theme: "แก้ปัญหาสิ่งแวดล้อม",
  /** The key poster's line (PR #378), in its two printed halves. Also opens the sign-up for invited friends. */
  taglineTh: ["งานแข่งหาทางออกให้ธรรมชาติ", "ก่อนธรรมชาติจะให้เราออก"],
  /** The permanent link. /hackathon redirects here while Elemental is current. */
  url: "passionseed.org/hackathon/elemental",
  /** Database key for registrations. */
  slug: "elemental-2026",
  /** Last day to sign up, Bangkok time (inclusive). */
  registrationClosesOn: "2026-12-04",
  /** Where it happens: online until Demo Day, then onsite. */
  venueTh: "ออนไลน์ทาง Discord, Demo Day ที่ BAScii จุฬาฯ",
  /** The same, short enough for a ticket stub. */
  venueShort: "Discord + BAScii",
  /** The format in a poster's facts row: online, then the one onsite day. */
  formatShortTh: "ออนไลน์ + Demo Day ที่จุฬาฯ",
  /** The one onsite day. */
  demoDay: {
    date: "2026-12-12",
    venueTh: "BAScii จุฬาฯ",
    /** For search engines: no street address is on record, so only the city. */
    venueEn: "BAScii, Chulalongkorn University",
    city: "Bangkok",
    country: "TH",
  },
  /** Sponsor logos are final on this day. */
  sponsorLogosLockedOn: "2026-12-07",
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
  /** The programme, day by day. See SCHEDULE above. */
  schedule: SCHEDULE,
  elements: [
    { key: "water", en: "Water", th: "น้ำ" },
    { key: "earth", en: "Earth", th: "ดิน" },
    { key: "air", en: "Air", th: "ลม" },
    { key: "fire", en: "Fire", th: "ไฟ" },
    { key: "aether", en: "Aether", th: "อีเธอร์" },
  ],
} as const;

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "4–12 ธ.ค.": the big date. */
export function thaiDayRange(): string {
  const s = parts(ELEMENTAL.startDate);
  return `${s.day}–${formatThaiDate(ELEMENTAL.endDate, false)}`;
}

/** "20,000". */
export function prizeTotal(): string {
  return ELEMENTAL.prizeTotalBaht.toLocaleString("en-US");
}

/** "4 ถึง 12 ธ.ค.": the date line without the year, for tight spots like the ticket stub. */
export function thaiDateShort(): string {
  return `${parts(ELEMENTAL.startDate).day} ถึง ${formatThaiDate(ELEMENTAL.endDate, false)}`;
}

/** "4 ถึง 12 ธ.ค. 2569": month once, Buddhist-era year. */
export function thaiDateLine(): string {
  const s = parts(ELEMENTAL.startDate);
  const e = parts(ELEMENTAL.endDate);
  return `${s.day} ถึง ${formatThaiDate(ELEMENTAL.endDate, false)} ${e.year + 543}`;
}

/** "Demo Day 12 ธ.ค. ที่ BAScii จุฬาฯ": the one onsite day. */
export function demoDayLine(): string {
  return `Demo Day ${formatThaiDate(ELEMENTAL.demoDay.date, false)} ที่ ${ELEMENTAL.demoDay.venueTh}`;
}
