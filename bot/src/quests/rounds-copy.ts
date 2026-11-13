/**
 * Thai copy for the campfire rounds (rounds.ts, handlers/rounds.ts).
 * DRAFT for the multi-model Thai review (AGENTS.md). No em dashes, never
 * น้องๆ, no streak wording, nothing that counts or shows anyone's minutes.
 */
import { FOCUS_MINUTES, REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

export const R = {
  focusTitle: `🔥 รอบโฟกัส ${FOCUS_MINUTES} นาที`,
  focus: (end: number) => `ตั้งใจไว้หนึ่งอย่าง แล้วลงมือ\nพักตอน <t:${end}:t> (<t:${end}:R>)`,
  focusFine: "ทำพร้อมกันรอบกองไฟ · ไม่มีใครนับเวลาของคุณ · ทุกอย่างที่เขียนเห็นแค่คุณ",
  restTitle: `🌊 พัก ${REST_MINUTES} นาที`,
  rest: (tip: string, next: number) => `สลับเป็นโหมดกระจาย: ${tip}\nรอบใหม่เริ่ม <t:${next}:t>`,
  restFine: "ตอนพัก สมองยังคิดเรื่องที่ติดอยู่ต่อเบื้องหลัง · ปิดรอบสั้นๆ แล้วรากต้นไม้จะงอก",
  /** Diffuse-mode prompts, one per rest, in turn. */
  tips: [
    "ลุกขึ้นยืน ยืดตัว",
    "ดื่มน้ำสักแก้ว",
    "มองไกลๆ นอกหน้าต่าง",
    "หลับตา หายใจช้าๆ 5 ครั้ง",
    "เดินรอบห้องหนึ่งรอบ",
    "ล้างหน้า ล้างมือ",
  ],
  btnAim: "🎯 ตั้งใจ",
  btnClose: "✍️ ปิดรอบ",

  aimTitle: "🎯 รอบนี้จะทำอะไร",
  aimLabel: "ตั้งใจจะทำอะไรในรอบนี้",
  aimPlaceholder: "เช่น ทำหน้า login ให้เสร็จ",
  aimedTitle: "🎯 ตั้งใจไว้แล้ว",
  aimed: "ถึงเวลาพัก กด ✍️ ปิดรอบ เขียนสั้นๆ ว่าได้อะไร",

  closeTitle: "✍️ ปิดรอบ",
  closeLearned: "ได้อะไรจากรอบนี้",
  closeLearnedHint: "สิ่งที่ทำได้ หรือสิ่งที่เพิ่งเข้าใจ อย่างน้อยหนึ่งประโยค",
  closeStuck: "ติดตรงไหน (ไม่บังคับ)",
  closeStuckHint: "เขียนไว้ก่อน ส่งให้พี่เลี้ยงช่วยดูได้",
  /** The journal entry's "what changed" when no intention was set this round. */
  changedDefault: "รอบกองไฟ",
  closedTitle: "🌱 บันทึกแล้ว",
  closed: "เขียนสิ่งที่ได้เรียนรู้ทีไร รากต้นไม้ของคุณก็งอกลึกขึ้น",
  closedFine: `นับเข้ารากได้วันละ ${REFLECTIONS_PER_DAY} รอบ · บันทึกนี้อยู่ในสมุดของคุณ (/progress) เห็นแค่คุณ`,
} as const;

/** Fewest characters a reflection needs, as the roots count it. */
export const LEARNED_MIN = REFLECTION_MIN_CHARS;
