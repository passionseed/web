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
  /** Round number, also the URL segment: /shift/1, /shift/2. */
  round: number;
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
  /** People per project team. Solo builders are welcome, so min is 1. */
  teamSize: { min: number; max: number };
  /** Outside users each student names on Day 1 and asks directly. A target,
   *  not a promise: the last batch fell short when it relied on group posts. */
  testerTarget: number;
  /** Nightly live session on Discord, Bangkok time. */
  sessionTime: string;
  schedule: ShiftDay[];
  /** Set once a round has actually wrapped, when the dates alone would say
   *  otherwise (e.g. approximate dates for a pilot). */
  completed?: boolean;
  /** 1200x630 listing banner shown on the /shift gallery card. */
  bannerSrc?: string;
  /** Live projects the round shipped, shown once it is over. Titles only:
   *  students are minors, so no names or handles go on the public page. */
  showcase?: ShiftShowcaseProject[];
}

export interface ShiftShowcaseProject {
  title: string;
  url: string;
  /** One line: what it is and who it is for. */
  pitch?: string;
  /** How it works, concrete enough that a stranger can picture using it. */
  detail?: string;
  /** The evidence that makes it more than a build: users, feedback, a changed brief. */
  proof?: string;
  /** Shown on the marketing slides. Keep it to the strongest three. */
  featured?: boolean;
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
  round: 1,
  name: "SHIFT[1]",
  seats: 15,
  priceBaht: 670,
  anchorPriceBaht: 1500,
  startDate: "2026-10-05",
  endDate: "2026-10-11",
  applyDeadline: "2026-10-03",
  applyUrl: "/shift/apply?round=1",
  bannerSrc: "/shift/banners/shift-1.png",
  teamSize: { min: 1, max: 3 },
  testerTarget: 15,
  sessionTime: "19:00–21:00",
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
      label: "Fix Check",
      title: "อะไรพัง และเราเปลี่ยนอะไร",
      detail: "จดทุกจุดที่พังพร้อมวันที่ ว่าเจออะไรแล้วแก้ยังไง ของที่พังคือหลักฐานที่ลอกกันไม่ได้",
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
      detail: "เดโมของจริงต่อหน้าทั้งรุ่น เล่าจุดพัง สิ่งที่เปลี่ยน และสิ่งที่ได้เรียนรู้ แล้วสรุปเป็นพอร์ต 1 หน้า",
    },
  ],
};

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Every date in a round moved by `days` (negative moves it earlier). */
function shiftDates(prev: ShiftCohort, days: number): ShiftCohort {
  return {
    ...prev,
    startDate: addDays(prev.startDate, days),
    endDate: addDays(prev.endDate, days),
    applyDeadline: addDays(prev.applyDeadline, days),
    schedule: prev.schedule.map((d) => ({ ...d, date: addDays(d.date, days) })),
  };
}

/** A round `rounds` away from `prev`, running `days` later (or earlier). */
function sibling(prev: ShiftCohort, rounds: number, days: number): ShiftCohort {
  const round = prev.round + rounds;
  return {
    ...shiftDates(prev, days),
    round,
    name: `SHIFT[${round}]`,
    applyUrl: `/shift/apply?round=${round}`,
    bannerSrc: `/shift/banners/shift-${round}.png`,
    showcase: undefined,
  };
}

/**
 * SHIFT[0], the free pilot: 9 students, invite only, two weeks before
 * SHIFT[1]. Dates are approximate (the week the projects were posted).
 */
export const SHIFT_COHORT_0: ShiftCohort = {
  ...sibling(SHIFT_COHORT, -1, -14),
  seats: 9,
  priceBaht: 0,
  anchorPriceBaht: null,
  completed: true,
  showcase: [
    {
      title: "Magnified Lens",
      url: "https://magnified-lens-2uoi.vercel.app/",
      pitch: "แว่นขยายบนมือถือ สำหรับคนที่อ่านตัวหนังสือเล็กไม่ถนัด",
      detail: "แตะแถบข้างจอเพื่อหยุดภาพ ลากกรอบเหลืองไปส่องฉลากยา สัญญา หรือรหัสพัสดุ แล้วดูภาพขยายชัดๆ ด้านล่าง ใช้ได้ทั้งไทยและอังกฤษ",
      proof: "ฟีดแบ็กจากคนลองใช้จริงมากกว่า 15 คน",
      featured: true,
    },
    {
      title: "TradBid",
      url: "https://bi-ddi-n-gdot-c-omp.vercel.app/",
      pitch: "เว็บสอนเทรดหุ้น ผ่านมังงะเล่าเรื่องกับเกมจำลองการซื้อขาย",
      detail: "อ่านมังงะวาดมือตอนแรก \"Trading คืออะไร\" แล้วลองซื้อขายหุ้นสมมติด้วยเงินจำลอง ฿10,000 ดูราคาขยับขึ้นลงโดยไม่เสียเงินจริง",
      proof: "ปล่อยเวอร์ชันแรกแล้วอัปเกรดต่อเป็นเวอร์ชัน 2 ภายในรุ่น",
      featured: true,
    },
    {
      title: "ปฏิทิน กสพท70",
      url: "https://potter-wine.vercel.app/",
      pitch: "ปฏิทินนับถอยหลังสำหรับเด็กสายหมอ",
      detail: "รวม 11 กำหนดการ กสพท และ TCAS รอบ 3 เรียงตามเวลา นับถอยหลังถึงวินาที พร้อมคลังเกณฑ์คะแนน 10 คณะสายสุขภาพ",
      proof: "เริ่มจากเว็บเกณฑ์พอร์ต คุยกับคนใช้จริงแล้วเจอว่าเขาอยากรู้วันสอบมากกว่า เลยเปลี่ยนโจทย์",
      featured: true,
    },
    { title: "CRVC Academic Portal", url: "https://work-for-school-theta.vercel.app/" },
    { title: "Self-Learning", url: "https://learning-app-eight-flax.vercel.app/" },
  ],
};

/** SHIFT[2] starts the Monday after SHIFT[1] ends. */
export const SHIFT_COHORT_2: ShiftCohort = {
  ...sibling(SHIFT_COHORT, 1, 7),
  seats: 21,
  priceBaht: 990,
};

/** The round the printed posters are promoting right now. */
export const POSTER_COHORT = SHIFT_COHORT_2;

/** Every round, oldest first. /shift lists these; /shift/[round] renders one. */
export const SHIFT_COHORTS: ShiftCohort[] = [SHIFT_COHORT_0, SHIFT_COHORT, SHIFT_COHORT_2];

export function getShiftCohort(round: number): ShiftCohort | undefined {
  return SHIFT_COHORTS.find((c) => c.round === round);
}

/** Off each person's price when two friends apply together. */
export const PAIR_DISCOUNT_BAHT = 100;

/** Per-person price for a pair of friends, or null for a free round. */
export function pairPriceBaht(cohort: ShiftCohort): number | null {
  return cohort.priceBaht > 0 ? cohort.priceBaht - PAIR_DISCOUNT_BAHT : null;
}

/**
 * How people pay: scan the PromptPay QR, then send the slip to PassionSeed's
 * LINE Official Account, where a human confirms the seat.
 */
export const SHIFT_PAYMENT = {
  /** Full bank QR slip, offered as a download for bank apps. */
  qrSrc: "/shift/pay/promptpay-qr.jpg",
  /** Just the QR, cropped from the slip so it scans off a laptop screen. */
  qrCardSrc: "/shift/pay/promptpay-qr-card.jpg",
  lineId: "@passionseed",
  lineUrl: "https://line.me/R/ti/p/@passionseed",
} as const;

/** "฿670", or "ฟรี" for a free round. */
export function priceLabel(cohort: ShiftCohort): string {
  return cohort.priceBaht === 0 ? "ฟรี" : `฿${cohort.priceBaht.toLocaleString("en-US")}`;
}

export function cohortPath(cohort: ShiftCohort): string {
  return `/shift/${cohort.round}`;
}

export type CohortStatus = "open" | "closed" | "running" | "done";

/** Today as YYYY-MM-DD in Bangkok, the only calendar the cohorts run on. */
export function bangkokToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

/**
 * Where a round is in its life, from Bangkok's calendar date. ISO dates
 * compare correctly as strings, so no Date maths is needed.
 */
export function cohortStatus(cohort: ShiftCohort, today: string = bangkokToday()): CohortStatus {
  if (cohort.completed || today > cohort.endDate) return "done";
  if (today >= cohort.startDate) return "running";
  if (today > cohort.applyDeadline) return "closed";
  return "open";
}

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
    detail: "ลองใช้เครื่องมือ AI สร้างต้นแบบที่ใช้ได้จริง ไม่ต้องมีพื้นฐาน",
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
    detail: "โจทย์ สกิลที่เรียน และจะเปลี่ยนทางเมื่อไหร่ เราเลือกเอง พี่เลี้ยงไม่คิดแทน",
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
  { label: "Broke", detail: "อะไรพัง ใครติดตรงไหน จดไว้แล้วแก้" },
  { label: "Learned", detail: "สกิลที่ทีมเรียนวันนี้ สอนเพื่อนอีก 2 ทีมใน 1 นาที" },
];

export function cohortDayCount(cohort: ShiftCohort = SHIFT_COHORT): number {
  return cohort.schedule.length;
}

/** "1-3 คน": how many people can build one project together. */
export function teamSizeLabel(cohort: ShiftCohort = SHIFT_COHORT): string {
  return `${cohort.teamSize.min}-${cohort.teamSize.max} คน`;
}

/** Who SHIFT fits: the fields, and faculty programs students aim for. */
export const SHIFT_TRACKS = {
  fields: ["Tech", "Business", "Innovation"],
  programs: ["CEDT", "CS", "CE", "BBA", "BAScii"],
} as const;
