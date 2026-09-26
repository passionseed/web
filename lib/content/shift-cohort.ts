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
  /** Outside users each student names on Day 1 and asks directly. A target,
   *  not a promise: the last batch fell short when it relied on group posts. */
  testerTarget: number;
  schedule: ShiftDay[];
}

export interface ShiftSkillCard {
  title: string;
  detail: string;
}

export interface ShiftShowBeat {
  label: string;
  detail: string;
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
  seats: 15,
  priceBaht: 990,
  anchorPriceBaht: 1500,
  startDate: "2026-10-05",
  endDate: "2026-10-11",
  applyDeadline: "2026-10-03",
  applyUrl: "/shift/apply",
  squadSize: 3,
  testerTarget: 15,
  schedule: [
    {
      date: "2026-10-05",
      day: 1,
      label: "Scope Lock",
      title: "ตัดให้เหลือโจทย์เดียว",
      detail: "ตัดฟีเจอร์ที่ไม่จำเป็นออก 80% แล้วล็อกสโคปลงใน 1 หน้า พร้อมสมมติฐานว่าอะไรจะเวิร์ก",
    },
    {
      date: "2026-10-06",
      day: 2,
      label: "Reality Check",
      title: "คุยกับคนที่เจอปัญหาจริง 3 คน",
      detail: "จดคำตอบเป็นคำพูดของเขา ไม่ใช่บทสรุปของเรา ถ้าไม่มีใครเจอปัญหานี้ เปลี่ยนโจทย์วันนี้เลย",
    },
    {
      date: "2026-10-07",
      day: 3,
      label: "Build Fast",
      title: "สร้างของที่ใช้ได้ ไม่ต้องสวย",
      detail: "zero-code, hardware, หรือกระดาษก็ได้ ขอแค่คนนอกกดใช้ได้จริงภายในวันพรุ่งนี้",
    },
    {
      date: "2026-10-08",
      day: 4,
      label: "Ship to Strangers",
      title: "ปล่อยให้คนนอกใช้",
      detail: "ปล่อยของจริงให้คนที่ไม่ใช่เพื่อนสนิทใช้ แล้วจดว่าเขาติดตรงไหน",
    },
    {
      date: "2026-10-09",
      day: 5,
      label: "Pivot Check",
      title: "อะไรพัง และเราเปลี่ยนอะไร",
      detail: "บันทึก failure data ลง Pivot Log พร้อมวันที่ ของที่พังคือหลักฐานที่ลอกกันไม่ได้",
    },
    {
      date: "2026-10-10",
      day: 6,
      label: "Measure",
      title: "ตัวเลขก่อนและหลัง 1 ตัว",
      detail: "เลือกตัวเลขเดียวที่วัดซ้ำได้ เช่น กี่คนใช้จนจบ หรือติดอยู่กี่วินาที",
    },
    {
      date: "2026-10-11",
      day: 7,
      label: "Demo Day",
      title: "โชว์ให้ทุกคนดู แล้วเล่าว่าเราเรียนรู้อะไร",
      detail: "เดโมของจริงต่อหน้าทั้งรุ่น เล่าจุดพัง สิ่งที่เปลี่ยน และสิ่งที่ได้เรียนรู้ แล้วเรียบเรียงเป็น Case Study 1 หน้า",
    },
  ],
};

/** Squads pick one card a day based on what their projects need, then teach
 *  it back to the room. The menu keeps quality up; the choice stays theirs. */
export const SHIFT_SKILL_CARDS: ShiftSkillCard[] = [
  {
    title: "Customer Discovery",
    detail: "ถามยังไงให้คนเล่าปัญหาจริง ไม่ใช่ตอบให้เราสบายใจ",
  },
  {
    title: "Tester Hunt",
    detail: "หาคนนอกมาลองของ ทักตรงทีละคน ไม่ใช่โพสต์ลงสตอรี่เพื่อนสนิท",
  },
  {
    title: "AI Tools (OpenCode)",
    detail: "ใช้ AI ขึ้นโครงเว็บ วิจัย และทำเครื่องมือได้ในวันเดียว",
  },
  {
    title: "Anti Meat Proxy",
    detail: "ไม่เป็นแค่คนก๊อป AI ไปแปะ ฝึกตั้งคำถาม ตัดสิน และรับผิดชอบเอง",
  },
  {
    title: "Zero-Code Stack",
    detail: "Tally, Carrd, Notion ปล่อยของได้ในบ่ายเดียว",
  },
  {
    title: "Measure 1 Number",
    detail: "เลือกตัวเลขเดียวที่บอกว่าของเราเวิร์กหรือไม่",
  },
];

/** Why the week works, in Self-Determination Theory terms but said plainly. */
export interface ShiftSdtPillar {
  pillar: string;
  title: string;
  detail: string;
}

export const SHIFT_SDT: ShiftSdtPillar[] = [
  {
    pillar: "Autonomy",
    title: "เลือกเอง",
    detail: "โจทย์ สกิลที่เรียน และการ pivot เราเลือกเอง พี่เลี้ยงไม่คิดแทน",
  },
  {
    pillar: "Competence",
    title: "เก่งจากของจริง",
    detail: "ความมั่นใจมาจากของที่คนนอกใช้ได้และตัวเลขจริง ไม่ใช่เกรดหรือใบเซอร์",
  },
  {
    pillar: "Relatedness",
    title: "ไม่ได้สร้างคนเดียว",
    detail: "มีทีมและรุ่นพี่ที่มองว่าการลงมือสร้างของเป็นเรื่องปกติ ทุกเย็นโชว์ให้กันดู",
  },
];

/** Every evening each squad gets a few minutes, always in this order. */
export const SHIFT_DAILY_SHOW: ShiftShowBeat[] = [
  { label: "Shipped", detail: "วันนี้อะไรใช้ได้จริงแล้ว เปิดให้ดูเลย ไม่ต้องทำสไลด์" },
  { label: "Broke", detail: "อะไรพัง ใครติดตรงไหน จดลง Pivot Log" },
  { label: "Learned", detail: "สกิลที่ทีมเรียนวันนี้ สอนเพื่อนอีก 2 ทีมใน 1 นาที" },
];

export function cohortDayCount(cohort: ShiftCohort = SHIFT_COHORT): number {
  return cohort.schedule.length;
}

/** Seats are held by squads, so the number of squads is what caps the round. */
export function squadCount(cohort: ShiftCohort = SHIFT_COHORT): number {
  return Math.ceil(cohort.seats / cohort.squadSize);
}
