import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";

/** Words the student page, the teacher page and the pay-page card share. */

// copy: placeholder — Angpao rewrites
export const RECIPIENT_ERROR: Record<string, (who: string) => string> = {
  invalid: () => "รหัสมี 8 ตัว ตัวเลข 0-9 และ A-F",
  not_found: () => "ไม่เจอรหัสนี้ ลองเช็กอีกครั้ง",
  self: () => "นี่คือรหัสของคุณเอง",
  paid: (who) => `${who}คนนี้จ่ายแล้ว ให้คนที่ยังไม่จ่าย`,
  cancelled: () => "การสมัครของรหัสนี้ถูกยกเลิกแล้ว",
  ambiguous: () => `รหัสนี้ซ้ำกับอีกคน ทักไลน์ ${SHIFT_PAYMENT.lineId}`,
  taken: () => "รหัสนี้ได้ที่นั่งฟรีจากอีกลิงก์แล้ว",
  not_allowed: () => "ตอนนี้ยกที่นั่งไม่ได้ ลองรีเฟรชหน้านี้",
  closed: () => "ตอนนี้ปิดแล้ว",
};

export const recipientError = (code: string | undefined, who: string) =>
  (code && RECIPIENT_ERROR[code]?.(who)) || "ยังส่งไม่ได้ ลองอีกครั้ง";

export const lineHelp = `ทักไลน์ ${SHIFT_PAYMENT.lineId}`;
