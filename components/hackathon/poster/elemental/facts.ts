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
 * - Prize total: told by Angpao, 2026-11-19 (not yet in company-brain).
 * - Online, on Discord; groups of up to 5 (Bunyasit, 2026-11-20).
 * - Sign-up closes Thu 3 Dec 2026 (hackathon-ops registration.md); a group
 *   is 2 or more people (Big's draft there) and pays on one slip.
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
  theme: "Environmental negligence",
  url: "passionseed.org/hackathon",
  /** Database key for registrations. */
  slug: "elemental-2026",
  /** Last day to sign up, Bangkok time (inclusive). */
  registrationClosesOn: "2026-12-03",
  /** Where it happens. */
  venueTh: "ออนไลน์ทาง Discord",
  /** Largest group on one sign-up. */
  maxGroupSize: 5,
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
  /**
   * The five elements. `problem` and `examples` are the broad descriptions
   * Angpao asked for in the sponsor deck (2026-11-20): each element covers
   * any problem of its kind.
   */
  elements: [
    { key: "water", en: "Water", th: "น้ำ", problem: "ภัยในแหล่งน้ำ", examples: "เช่น น้ำเสียจากโรงงาน สารปนเปื้อนในแม่น้ำ ไมโครพลาสติก น้ำที่คนใช้ดื่มและทำเกษตร" },
    { key: "earth", en: "Earth", th: "ดิน", problem: "ภัยจากขยะ ดิน และสารพิษ", examples: "เช่น ขยะอิเล็กทรอนิกส์ การลักลอบทิ้งหรือฝังกลบขยะ สารเคมีตกค้างในพื้นที่เกษตร ขยะที่ไม่ได้คัดแยก" },
    { key: "air", en: "Air", th: "ลม", problem: "ภัยในอากาศที่เราหายใจ", examples: "เช่น ฝุ่น PM2.5 ควันจากการเผาในที่โล่ง ไอเสียจากโรงงานใกล้บ้าน การปล่อยคาร์บอน" },
    { key: "fire", en: "Fire", th: "ไฟ", problem: "ภัยจากไฟและความร้อน", examples: "เช่น อัคคีภัยในโรงงาน ผับบาร์ หรืออาคาร โกดังเก็บสารเคมี การเผาไร่และป่า" },
    { key: "aether", en: "Aether", th: "ธาตุที่ 5", problem: "ภัยที่มองไม่เห็น", examples: "เช่น ข่าวปลอม การอ้างว่ารักษ์โลกเกินจริง ขยะที่ไม่มีใครบันทึกว่าไปที่ไหน พลังงานที่แอปและ AI ใช้" },
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
