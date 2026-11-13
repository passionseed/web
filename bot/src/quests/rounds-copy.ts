/**
 * Thai copy for the campfire rounds (rounds.ts, handlers/rounds.ts).
 * DRAFT for the multi-model Thai review (AGENTS.md). No em dashes, never
 * น้องๆ, no streak wording, nothing that counts or shows anyone's minutes.
 */
import { FOCUS_MINUTES, REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

export const R = {
  focusTitle: `🔥 รอบโฟกัส ${FOCUS_MINUTES} นาที`,
  focus: (end: number) => `ตั้งเป้าไว้หนึ่งอย่าง แล้วลงมือเลย\nพักตอน <t:${end}:t> (<t:${end}:R>)`,
  focusFine: "ทำพร้อมกันรอบกองไฟ · ไม่มีใครนับเวลาของคุณ · ทุกอย่างที่เขียนเห็นแค่คุณ",
  restTitle: `🌊 พัก ${REST_MINUTES} นาที`,
  rest: (tip: string, next: number) => `พักสมองสักครู่ (diffuse mode): ${tip}\nรอบใหม่เริ่ม <t:${next}:t>`,
  restFine: "ตอนพัก สมองอาจยังคิดต่ออยู่เงียบๆ กับเรื่องที่ค้างไว้ · กด ✍️ ปิดรอบ เพื่อบันทึกสิ่งที่ได้เรียนรู้",
  /** Diffuse-mode prompts, one per rest, in turn. */
  tips: [
    "ลุกขึ้นยืน ยืดตัว",
    "ดื่มน้ำสักแก้ว",
    "มองไกลๆ นอกหน้าต่าง",
    "หลับตา หายใจช้าๆ 5 ครั้ง",
    "เดินรอบห้องหนึ่งรอบ",
    "ล้างหน้า ล้างมือ",
  ],
  btnAim: "🎯 ตั้งเป้ารอบนี้",
  btnClose: "✍️ ปิดรอบ",

  aimTitle: "🎯 รอบนี้จะทำอะไร",
  aimLabel: "ตั้งใจจะทำอะไรในรอบนี้",
  aimPlaceholder: "เช่น ทำหน้า login ให้เสร็จ",
  aimedTitle: "🎯 ตั้งเป้าแล้ว",
  aimed: "พอถึงเวลาพัก กด ✍️ ปิดรอบ แล้วเขียนสั้นๆ ว่าได้เรียนรู้อะไร",

  closeTitle: "✍️ ปิดรอบ",
  closeLearned: "ได้เรียนรู้อะไรจากรอบนี้",
  closeLearnedHint: `ลองอะไรแล้วพบอะไร หรือเพิ่งเข้าใจอะไร อย่างน้อย ${REFLECTION_MIN_CHARS} ตัวอักษร`,
  closeStuck: "ติดตรงไหน (ไม่บังคับ)",
  closeStuckHint: "เขียนไว้ก่อน แล้วค่อยส่งให้พี่เลี้ยงช่วยดูได้",
  /** The journal entry's "what changed" when no intention was set this round. */
  changedDefault: "รอบกองไฟ",
  closedTitle: "🌱 บันทึกแล้ว",
  closed: "เก็บสิ่งที่คุณได้เรียนรู้ไว้แล้ว",
  closedFine: `รากนับได้คนละไม่เกิน ${REFLECTIONS_PER_DAY} บันทึกต่อวัน · บันทึกนี้อยู่ใน /progress เห็นแค่คุณ`,
} as const;

/** Fewest characters a reflection needs, as the roots count it. */
export const LEARNED_MIN = REFLECTION_MIN_CHARS;
