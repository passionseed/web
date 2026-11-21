/**
 * Shared replies for the Elemental bot. Functional placeholders only: every
 * Thai line waits for a native review before the event ([TH-REVIEW]). No
 * marketing copy, no names, no contacts. Each feature keeps its own copy in
 * copy/<feature>.ts.
 */
export const COMMON = {
  // [TH-REVIEW] the guild has no elemental_settings row yet (staff setup step).
  notSetUp: "เซิร์ฟเวอร์นี้ยังไม่ได้ตั้งค่าสำหรับกิจกรรม แจ้งทีมงานได้เลย",
  // [TH-REVIEW] a role gate refused (Host, Helper, Mentor, Safety tools).
  staffOnly: "คำสั่งนี้สำหรับทีมงานเท่านั้น",
  // [TH-REVIEW] needs the Paid role (claimed with /join first).
  paidOnly: "ใช้ /join พร้อมรหัสของคุณก่อน แล้วค่อยลองอีกครั้ง",
  // [TH-REVIEW] the database is busy or a lock timed out: safe to retry.
  busy: "ระบบกำลังยุ่ง ลองอีกครั้งในอีกสักครู่",
  // [TH-REVIEW] anything unexpected; details only go to the log (fn + SQLSTATE).
  failed: "มีบางอย่างผิดพลาด ลองอีกครั้ง ถ้ายังไม่ได้ให้ใช้ /report หรือแจ้งทีมงาน",
  // [TH-REVIEW] a command or button that is registered but not live yet.
  notAvailable: "ฟีเจอร์นี้ยังไม่เปิดใช้",
} as const;

export type CommonKey = keyof typeof COMMON;
