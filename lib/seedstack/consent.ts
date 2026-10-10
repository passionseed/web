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

/** One notice, read by both the student and the parent. Plain Thai, no legalese. */
export const SEEDSTACK_NOTICE = {
  title: "SeedStack เก็บข้อมูลอะไรบ้าง",
  why:
    "SeedStack ไม่ได้ทำงานแทนเรา AI เป็นไกด์ส่วนตัวที่ชี้ทางและอธิบาย ส่วนคนลงมือคือเรา และคนที่สอนจริงคือพี่ mentor ข้อมูลด้านล่างทำให้พี่เห็นว่าเราติดตรงไหน แล้วเข้ามาช่วยถูกจังหวะ",
  collect: [
    "ขั้นที่ทำ (ติดตั้ง / ล็อก scope / ship / เทสต์กับคนจริง) และสถานะ เช่น เริ่ม ติด เสร็จ",
    "จำนวนคนที่ทักไป ตอบกลับ และได้เทสต์ (เป็นตัวเลข ไม่มีชื่อ)",
    "ใช้เวลากี่นาทีในแต่ละขั้น",
    "เทสต์ถัดไปที่เราเขียนเองสั้นๆ และลิงก์เว็บที่เรา deploy",
    "ข้อความ error บรรทัดแรก ตอนติดตั้งไม่ผ่าน",
    "วันเกิด เพื่อดูว่าต้องให้ผู้ปกครองยินยอมด้วยไหม",
    "ตอนเชื่อมครั้งแรก รวมบันทึกที่เก็บไว้ในเครื่องก่อนหน้านี้ด้วย",
  ],
  notCollect: [
    "ไม่เก็บบทสนทนากับ AI ไม่เก็บไฟล์หรือโค้ดในเครื่อง",
    "ไม่เก็บชื่อหรือข้อมูลติดต่อของคนที่เราไปสัมภาษณ์หรือให้ทดสอบ",
  ],
  basis:
    "การเชื่อมเป็นส่วนหนึ่งของการใช้ SeedStack ใน SHIFT เพราะพี่ mentor ต้องเห็นถึงจะช่วยได้ ถ้าไม่อยากเชื่อม ยังเรียน SHIFT ได้ครบทุกอย่าง แค่ไม่ใช้ SeedStack",
  who: "เห็นได้เฉพาะทีม mentor ของ PassionSeed ไม่แชร์ให้เพื่อนในรุ่น ไม่ขาย ไม่ส่งต่อให้ใคร",
  retention: `เก็บไว้ไม่เกิน ${SEEDSTACK_RETENTION_DAYS} วัน แล้วลบอัตโนมัติ`,
  rights: "ถอนได้ทุกเมื่อที่หน้านี้ ระบบหยุดเก็บทันทีและลบข้อมูลที่เก็บไว้ทั้งหมด",
  parents: `ถ้าอายุยังไม่ถึง ${SEEDSTACK_ADULT_AGE} ปี ผู้ปกครองต้องยินยอมด้วยตามกฎหมาย PDPA ระหว่างรอ SeedStack ใช้ได้ปกติ แต่ข้อมูลจะรออยู่ในเครื่องเรา ยังไม่ส่งจนกว่าผู้ปกครองตอบ ผู้ปกครองถอนหรือขอลบได้ทุกเมื่อจากลิงก์ของตัวเอง`,
  contact: "สงสัยหรืออยากขอดู แก้ หรือลบข้อมูล ทักพี่ใน LINE ของ SHIFT ได้เลย",
} as const;
