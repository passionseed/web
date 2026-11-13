/**
 * Thai copy for the campfire rounds (rounds.ts, handlers/rounds.ts).
 * Reviewed by several models (#284, and the encounters on 2026-11-14). No em dashes, never
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
  // Thai reviewed (agy, Codex, Cursor), 2026-11-14
  closedFine: `รากนับได้คนละไม่เกิน ${REFLECTIONS_PER_DAY} บันทึกต่อวัน · บันทึกนี้เป็นส่วนตัว`,

  /**
   * Encounters on some 🌊 rests (rounds.ts encounterAt): a moment from the
   * island's lore (docs/designs/shift-high-island-lore.md: the boat and the
   * people from outside, the shore and its bottles, the people who came
   * before) that leaves one side quest's note at the fire. Everyone at the
   * fire sees the same lines; the button shows the note privately
   * (handlers/rounds.ts rd_enc). Reviewed (agy, Codex, Cursor, 2026-11-14): no magic, no
   * names, nothing paid for being there.
   */
  encounters: [
    {
      key: "traveller",
      text: "⛵ เรือแวะเข้าฝั่ง คนจากข้างนอกเดินผ่านลานกลางเกาะ ถามว่าบนเกาะมีอะไรให้ลองบ้าง\nก่อนกลับขึ้นเรือ เขาวางโน้ตเควสต์เสริมทิ้งไว้ข้างกองไฟ",
      button: "📜 ดูโน้ต",
      found: "⛵ โน้ตที่คนจากเรือวางไว้",
    },
    {
      key: "bottle",
      text: "🍾 ขวดใบหนึ่งลอยมาเกยชายหาด รอบนี้ข้างในไม่ใช่จดหมายเชิญ\nแต่เป็นโน้ตเควสต์เสริมที่คนที่มาก่อนเขียนทิ้งไว้",
      button: "🍾 เปิดขวด",
      found: "🍾 โน้ตในขวด",
    },
    {
      key: "gull",
      text: "🪶 นกนางนวลบินมาเกาะขอบกระดานเควสต์ แล้วคาบโน้ตเควสต์เสริมมาวางไว้ข้างกองไฟ",
      button: "🪶 ดูโน้ต",
      found: "🪶 โน้ตที่นกนางนวลคาบมา",
    },
    {
      key: "mentor",
      text: "🧭 พี่เลี้ยงคนหนึ่งเดินผ่านกองไฟ แวะปักโน้ตเควสต์เสริมไว้บนกระดาน\nพักให้เต็มที่ก่อน แล้วค่อยดูก็ได้",
      button: "📜 ดูโน้ต",
      found: "🧭 โน้ตที่พี่เลี้ยงปักไว้",
    },
  ],
  encounterFine: "ทุกคนรอบกองไฟเห็นเรื่องเดียวกัน · โน้ตที่กดดูเห็นแค่คุณ · จะรับเควสต์หรือไม่ก็ได้",
  /** The encounter's note when no side quest is open to the person who pressed. */
  encounterEmptyTitle: "📜 ยังไม่มีเควสต์เสริมให้คุณรับ",
  encounterNoPlot: "เควสต์เสริมผูกกับโปรเจกต์ จับจองที่ดินก่อน แล้วมาดูว่ามีเควสต์ไหนเปิดให้รับบ้าง",
  encounterNone: "ดูสถานะของเควสต์ทุกใบได้บนกระดานเควสต์ 📜",
  encounterNoteFine: "เจอที่กองไฟรอบนี้ · นั่งที่กองไฟไม่ได้เหรียญ และไม่ได้ทำให้เควสต์ผ่าน · เควสต์ผ่านเมื่อพี่เลี้ยงยืนยันแล้วเท่านั้น",
} as const;

export type Encounter = (typeof R.encounters)[number];

/** Fewest characters a reflection needs, as the roots count it. */
export const LEARNED_MIN = REFLECTION_MIN_CHARS;
