/**
 * PDPA consent for SeedStack telemetry.
 *
 * Nothing is stored until the student agrees to the current notice. Under 20
 * (Thai age of majority, PDPA s.20) a parent must agree too. While the parent
 * has not answered, the device may link, but events stay on the student's
 * computer. Bump NOTICE_VERSION whenever the notice text below changes in
 * substance: older consents then stop counting and both sides are asked again.
 */

export const SEEDSTACK_NOTICE_VERSION = "2026-10-09";
export const SEEDSTACK_RETENTION_DAYS = 365;
export const SEEDSTACK_ADULT_AGE = 20;

export interface SeedstackConsentRow {
  notice_version: string;
  student_consented_at: string | null;
  birth_date: string | null;
  parent_consented_at: string | null;
  parent_declined_at: string | null;
  withdrawn_at: string | null;
}

export type SeedstackConsentState =
  | "none"
  | "awaiting_parent"
  | "parent_declined"
  | "active"
  | "withdrawn";

/** Today's date in Thailand as YYYY-MM-DD, so ages flip at Thai midnight. */
function bangkokDate(now: number): string {
  return new Date(now + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Whole years between a YYYY-MM-DD birth date and today in Thailand. */
export function ageOn(birthDate: string, now = Date.now()): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = bangkokDate(now).split("-").map(Number);
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

/** A missing birth date counts as a minor: the safe default. */
export function needsParent(birthDate: string | null, now = Date.now()): boolean {
  return !birthDate || ageOn(birthDate, now) < SEEDSTACK_ADULT_AGE;
}

/** Accepts YYYY-MM-DD for someone aged 10 to 100. Returns it, or null. */
export function parseBirthDate(raw: string | null | undefined, now = Date.now()): string | null {
  const value = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  const age = ageOn(value, now);
  return age >= 10 && age <= 100 ? value : null;
}

export function seedstackConsentState(row: SeedstackConsentRow | null, now = Date.now()): SeedstackConsentState {
  if (!row || row.notice_version !== SEEDSTACK_NOTICE_VERSION) return "none";
  if (row.withdrawn_at) return "withdrawn";
  if (!row.student_consented_at) return "none";
  if (!needsParent(row.birth_date, now) || row.parent_consented_at) return "active";
  return row.parent_declined_at ? "parent_declined" : "awaiting_parent";
}

/** A device may link once the student agreed, even before the parent answers. */
export function canLinkDevice(state: SeedstackConsentState): boolean {
  return state === "active" || state === "awaiting_parent" || state === "parent_declined";
}

/**
 * One notice, read by both the student and the parent. Plain Thai, no legalese.
 * Each row is one emoji, a short bold lead, a one-line gist for the summary
 * card, and the full line (or a short list) behind "อ่านแบบละเอียด".
 * Rewording rows for length is fine; adding or dropping an element is a change
 * in substance and needs a new SEEDSTACK_NOTICE_VERSION.
 */
export interface SeedstackNoticeRow {
  emoji: string;
  lead: string;
  /** One-line gist for the summary card. Never the only place a point is said. */
  short: string;
  text?: string;
  items?: readonly string[];
}

export const SEEDSTACK_NOTICE: { title: string; rows: readonly SeedstackNoticeRow[] } = {
  title: "ตกลงกันก่อน: SeedStack เก็บอะไรบ้าง",
  rows: [
    {
      emoji: "🧭",
      lead: "เก็บไปทำไม",
      short: "ให้พี่ mentor เห็นว่าเราติดตรงไหน แล้วเข้ามาช่วยทัน",
      text: "AI แค่เป็นไกด์ชี้ทางและอธิบาย คนลงมือคือเรา คนสอนจริงคือพี่ mentor ข้อมูลนี้ทำให้พี่เห็นว่าเราติดตรงไหน แล้วเข้ามาช่วยถูกจังหวะ",
    },
    {
      emoji: "📍",
      lead: "สิ่งที่พี่เห็น",
      short: "ขั้นที่ทำ เวลาที่ใช้ จำนวนคนที่เทสต์ (ไม่มีชื่อ) ลิงก์เว็บ error ตอนติดตั้ง และวันเกิด",
      items: [
        "ขั้นที่ทำ (ติดตั้ง, ล็อก scope, ship, เทสต์กับคนจริง) และสถานะ: เริ่ม ติด เสร็จ",
        "จำนวนคนที่ทักไป ตอบกลับ และได้เทสต์ เป็นตัวเลข ไม่มีชื่อ",
        "ใช้เวลากี่นาทีในแต่ละขั้น",
        "เทสต์ถัดไปที่เราเขียนเองสั้นๆ และลิงก์เว็บที่เรา deploy",
        "error บรรทัดแรก ตอนติดตั้งไม่ผ่าน",
        "วันเกิด ไว้ดูว่าต้องให้ผู้ปกครองยินยอมด้วยไหม",
        "เชื่อมครั้งแรก บันทึกที่เก็บในเครื่องก่อนหน้านี้จะส่งขึ้นมาด้วย",
      ],
    },
    {
      emoji: "🙈",
      lead: "สิ่งที่ไม่เก็บเลย",
      short: "แชตกับ AI ไฟล์ โค้ด และข้อมูลของคนที่เราไปคุยด้วย",
      text: "บทสนทนากับ AI, ไฟล์และโค้ดในเครื่อง, ชื่อหรือข้อมูลติดต่อของคนที่เราไปสัมภาษณ์หรือให้ทดสอบ",
    },
    {
      emoji: "🤝",
      lead: "ต้องเชื่อมไหม",
      short: "ไม่เชื่อมก็เรียน SHIFT ได้ครบ แค่ไม่ได้ใช้ SeedStack",
      text: "การเชื่อมเป็นส่วนหนึ่งของการใช้ SeedStack ใน SHIFT เพราะพี่ต้องเห็นถึงจะช่วยได้ ไม่อยากเชื่อม ก็ยังเรียน SHIFT ได้ครบทุกอย่าง แค่ไม่ใช้ SeedStack",
    },
    {
      emoji: "👀",
      lead: "ใครเห็นบ้าง",
      short: "ทีม mentor ของ PassionSeed เท่านั้น ไม่ขาย ไม่ส่งต่อ",
      text: "ทีม mentor ของ PassionSeed เท่านั้น เพื่อนในรุ่นไม่เห็น ไม่ขาย ไม่ส่งต่อให้ใคร",
    },
    {
      emoji: "🗓️",
      lead: "เก็บนานแค่ไหน",
      short: `ไม่เกิน ${SEEDSTACK_RETENTION_DAYS} วัน แล้วลบอัตโนมัติ`,
      text: `ไม่เกิน ${SEEDSTACK_RETENTION_DAYS} วัน แล้วลบอัตโนมัติ`,
    },
    {
      emoji: "🗑️",
      lead: "เลิกได้ทุกเมื่อ",
      short: "ถอนที่หน้านี้ได้ ระบบหยุดเก็บและลบให้หมด",
      text: "ถอนได้ที่หน้านี้ ระบบหยุดเก็บทันที และลบข้อมูลที่เก็บไว้ทั้งหมด",
    },
    {
      emoji: "👪",
      lead: `อายุยังไม่ถึง ${SEEDSTACK_ADULT_AGE} ปี`,
      short: "ผู้ปกครองต้องยินยอมด้วย ระหว่างรอ ข้อมูลรออยู่ในเครื่องเรา",
      text: "ตามกฎหมาย PDPA ผู้ปกครองต้องยินยอมด้วย ระหว่างรอ SeedStack ใช้ได้ปกติ แต่ข้อมูลรออยู่ในเครื่องเรา ยังไม่ส่งจนกว่าผู้ปกครองตอบ ผู้ปกครองถอนหรือขอลบได้ทุกเมื่อจากลิงก์ของตัวเอง",
    },
    {
      emoji: "💬",
      lead: "สงสัยอะไร",
      short: "ทักพี่ใน LINE ของ SHIFT",
      text: "อยากขอดู แก้ หรือลบข้อมูล ทักพี่ใน LINE ของ SHIFT ได้เลย",
    },
  ],
};
