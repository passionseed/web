/**
 * The live SHIFT cohort. Everything on /shift that changes between rounds
 * (dates, price, seats, deadline) lives here so a new round is a data edit,
 * not a page rewrite.
 */

export interface ShiftDay {
  /** ISO date, used for ordering and for the machine-readable schedule. */
  date: string;
  /** Day number inside the 7-day sprint. */
  day: number;
  label: string;
  title: string;
  detail: string;
}

export interface ShiftCohort {
  /** Wordmark shown on the page, e.g. "SHIFT[1]". */
  name: string;
  seats: number;
  priceBaht: number;
  /** Struck-through anchor price. Null hides the anchor. */
  anchorPriceBaht: number | null;
  startDate: string;
  endDate: string;
  applyDeadline: string;
  applyUrl: string;
  squadSize: number;
  schedule: ShiftDay[];
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const THAI_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/** "จ. 28 ก.ย." Year is omitted on purpose: the page only ever shows one
 *  round, so the year adds noise and invites a พ.ศ. / ค.ศ. mix-up. */
export function formatThaiDate(iso: string, withWeekday = true): string {
  const [year, month, day] = iso.split("-").map(Number);
  // Built from the parts rather than parsed as a timestamp: a plain `new
  // Date(iso)` is UTC midnight, which reads as the previous day in Bangkok.
  const body = `${day} ${THAI_MONTHS[month - 1]}`;
  if (!withWeekday) return body;

  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${THAI_WEEKDAYS[weekday]} ${body}`;
}

export function formatThaiDateRange(startIso: string, endIso: string): string {
  return `${formatThaiDate(startIso)} ถึง ${formatThaiDate(endIso)}`;
}

export const SHIFT_COHORT: ShiftCohort = {
  name: "SHIFT[1]",
  seats: 9,
  priceBaht: 990,
  anchorPriceBaht: 1500,
  startDate: "2026-09-28",
  endDate: "2026-10-04",
  applyDeadline: "2026-09-26",
  applyUrl: "https://forms.gle/3DaMNzuuFV4EHD2m7",
  squadSize: 3,
  schedule: [
    {
      date: "2026-09-28",
      day: 1,
      label: "Scope Lock",
      title: "ตัดให้เหลือโจทย์เดียว",
      detail: "ตัดฟีเจอร์ที่ไม่จำเป็นออก 80% แล้วล็อกสโคปลงใน 1 หน้า พร้อมสมมติฐานว่าอะไรจะเวิร์ก",
    },
    {
      date: "2026-09-29",
      day: 2,
      label: "Reality Check",
      title: "คุยกับคนที่เจอปัญหาจริง 3 คน",
      detail: "จดคำตอบเป็นคำพูดของเขา ไม่ใช่บทสรุปของเรา ถ้าไม่มีใครเจอปัญหานี้ เปลี่ยนโจทย์วันนี้เลย",
    },
    {
      date: "2026-09-30",
      day: 3,
      label: "Build Ugly",
      title: "สร้างของที่ใช้ได้ ไม่ต้องสวย",
      detail: "zero-code, hardware, หรือกระดาษก็ได้ ขอแค่คนนอกกดใช้ได้จริงภายในวันพรุ่งนี้",
    },
    {
      date: "2026-10-01",
      day: 4,
      label: "The Ugly Ship",
      title: "ปล่อยให้คนนอกใช้",
      detail: "ปล่อยของจริงให้คนที่ไม่ใช่เพื่อนสนิทใช้ แล้วจดว่าเขาติดตรงไหน",
    },
    {
      date: "2026-10-02",
      day: 5,
      label: "Pivot Check",
      title: "อะไรพัง และเราเปลี่ยนอะไร",
      detail: "บันทึก failure data ลง Pivot Log พร้อมวันที่ ของที่พังคือหลักฐานที่ลอกกันไม่ได้",
    },
    {
      date: "2026-10-03",
      day: 6,
      label: "Measure",
      title: "ตัวเลขก่อนและหลัง 1 ตัว",
      detail: "เลือกตัวเลขเดียวที่วัดซ้ำได้ เช่น กี่คนใช้จนจบ หรือติดอยู่กี่วินาที",
    },
    {
      date: "2026-10-04",
      day: 7,
      label: "Reality Collision",
      title: "Case Study 1 หน้า",
      detail: "สมมติฐาน จุดพัง การเปลี่ยน และตัวเลข รวมลงหน้าเดียวที่ใช้ตอบสัมภาษณ์ได้ทั้งห้อง",
    },
  ],
};

export function cohortDayCount(cohort: ShiftCohort = SHIFT_COHORT): number {
  return cohort.schedule.length;
}

/** Seats are held by squads, so the number of squads is what caps the round. */
export function squadCount(cohort: ShiftCohort = SHIFT_COHORT): number {
  return Math.ceil(cohort.seats / cohort.squadSize);
}
