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

  /**
   * Encounters on some 🌊 rests (rounds.ts encounterAt): a moment from the
   * island's lore (docs/designs/shift-high-island-lore.md: the boat and the
   * people from outside, the shore and its bottles, the people who came
   * before) that leaves one side quest's note at the fire. Everyone at the
   * fire sees the same lines; the button shows the note privately
   * (handlers/rounds.ts rd_enc). DRAFT for the Thai review: no magic, no
   * names, nothing paid for being there.
   */
  encounters: [
    {
      key: "traveller",
      text: "⛵ เรือแวะเข้าฝั่ง คนจากข้างนอกเดินผ่านลานกลางเกาะ ถามว่าบนเกาะมีอะไรให้ลองบ้าง\nก่อนกลับขึ้นเรือ เขาวางโน้ตเควสต์เสริมไว้ข้างกองไฟหนึ่งใบ",
      button: "📜 ดูโน้ต",
      found: "⛵ โน้ตที่คนจากเรือวางไว้",
    },
    {
      key: "bottle",
      text: "🍾 ขวดใบหนึ่งลอยมาเกยชายหาด รอบนี้ข้างในไม่ใช่จดหมายเชิญ\nเป็นโน้ตเควสต์เสริมหนึ่งใบ ที่คนที่มาก่อนเขียนทิ้งไว้",
      button: "🍾 เปิดขวด",
      found: "🍾 โน้ตในขวด",
    },
    {
      key: "gull",
      text: "🪶 นกนางนวลตัวหนึ่งบินมาเกาะขอบกระดานเควสต์ แล้วคาบโน้ตใบหนึ่งมาวางไว้ข้างกองไฟ",
      button: "🪶 เก็บโน้ต",
      found: "🪶 โน้ตที่นกนางนวลคาบมา",
    },
    {
      key: "mentor",
      text: "🧭 พี่เลี้ยงคนหนึ่งเดินผ่านกองไฟ แวะปักโน้ตเควสต์เสริมไว้บนกระดานหนึ่งใบ\nพักให้เสร็จก่อน แล้วค่อยดูก็ได้",
      button: "📜 ดูโน้ต",
      found: "🧭 โน้ตที่พี่เลี้ยงปักไว้",
    },
  ],
  encounterFine: "ทุกคนรอบกองไฟเห็นเรื่องเดียวกัน · กดดูแล้วเห็นแค่คุณ · จะรับหรือไม่ก็ได้",
  /** The encounter's note when no side quest is open to the person who pressed. */
  encounterEmptyTitle: "📜 โน้ตใบนี้ยังไม่ใช่ของคุณ",
  encounterNoPlot: "เควสต์เสริมเป็นของโปรเจกต์ จับจองที่ดินก่อน แล้วโน้ตแบบนี้จะเปิดให้คุณ",
  encounterNone: "ตอนนี้ไม่มีเควสต์เสริมที่เปิดให้คุณ ทุกใบยังล็อก กำลังทำอยู่ หรือผ่านไปแล้ว ดูทั้งหมดได้บนกระดานเควสต์",
  encounterNoteFine: "เจอที่กองไฟรอบนี้ · การนั่งที่กองไฟไม่ได้นับเป็นเหรียญหรือขั้น เควสต์นี้ผ่านเมื่อพี่เลี้ยงดูงานแล้วเท่านั้น",
} as const;

export type Encounter = (typeof R.encounters)[number];

/** Fewest characters a reflection needs, as the roots count it. */
export const LEARNED_MIN = REFLECTION_MIN_CHARS;
