/**
 * PDPA consent for SeedStack telemetry.
 *
 * Nothing is collected until the student agrees to the current notice.
 * Parents are told through SHIFT and can ask to see, delete or stop the data
 * at any time (see SEEDSTACK_NOTICE.parents). Bump NOTICE_VERSION whenever the notice
 * text below changes in substance: older consents then stop counting and both
 * sides are asked again.
 */

export const SEEDSTACK_NOTICE_VERSION = "2026-10-08";
export const SEEDSTACK_RETENTION_DAYS = 365;

export interface SeedstackConsentRow {
  notice_version: string;
  student_consented_at: string | null;
  withdrawn_at: string | null;
}

export type SeedstackConsentState = "none" | "active" | "withdrawn";

export function seedstackConsentState(row: SeedstackConsentRow | null): SeedstackConsentState {
  if (!row || row.notice_version !== SEEDSTACK_NOTICE_VERSION) return "none";
  if (row.withdrawn_at) return "withdrawn";
  if (!row.student_consented_at) return "none";
  return "active";
}

/** One notice, read by both the student and the parent. Plain Thai, no legalese. */
export const SEEDSTACK_NOTICE = {
  title: "SeedStack เก็บข้อมูลอะไรบ้าง",
  collect: [
    "ขั้นที่ทำ (ติดตั้ง / ล็อก scope / ship / เทสต์กับคนจริง) และสถานะ เช่น เริ่ม ติด เสร็จ",
    "จำนวนคนที่ทักไป ตอบกลับ และได้เทสต์ (เป็นตัวเลข ไม่มีชื่อ)",
    "ใช้เวลากี่นาทีในแต่ละขั้น",
    "เทสต์ถัดไปที่น้องเขียนเองสั้นๆ และลิงก์เว็บที่น้อง deploy",
    "ข้อความ error บรรทัดแรก ตอนติดตั้งไม่ผ่าน",
  ],
  notCollect: [
    "ไม่เก็บบทสนทนากับ AI ไม่เก็บไฟล์หรือโค้ดในเครื่อง",
    "ไม่เก็บชื่อหรือข้อมูลติดต่อของคนที่น้องไปสัมภาษณ์หรือให้ทดสอบ",
  ],
  purpose:
    "ให้พี่ mentor ของ SHIFT เห็นว่าใครติดตรงไหน จะได้เข้าไปช่วยถูกคน โดยไม่ต้องไล่ถามทุกคนใน Discord",
  who: "เห็นได้เฉพาะทีม mentor ของ PassionSeed ไม่แชร์ให้เพื่อนในรุ่น ไม่ขาย ไม่ส่งต่อให้ใคร",
  retention: `เก็บไว้ไม่เกิน ${SEEDSTACK_RETENTION_DAYS} วัน แล้วลบอัตโนมัติ`,
  rights:
    "ถอนความยินยอมได้ทุกเมื่อที่หน้านี้ ระบบหยุดเก็บทันทีและลบข้อมูลที่เก็บไว้ทั้งหมด ไม่ยินยอมก็ยังเรียน SHIFT และใช้ SeedStack ได้ตามปกติ แค่ข้อมูลจะอยู่ในเครื่องน้องอย่างเดียว",
  parents: "ผู้ปกครองขอดู ลบ หรือให้หยุดเก็บข้อมูลของน้องได้ทุกเมื่อ ทาง LINE ของ SHIFT",
  contact: "สงสัยหรืออยากขอดู แก้ หรือลบข้อมูล ทักพี่ใน LINE ของ SHIFT ได้เลย",
} as const;
