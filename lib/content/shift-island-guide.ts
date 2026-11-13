/**
 * DRAFT for the multi-model Thai review (AGENTS.md: Antigravity, Cursor and
 * Codex; lines two or more reviewers flag get rewritten).
 *
 * Every user-facing string of the SHIFT High Island guide (/shift/island/guide):
 * what the island is, how a tree grows, roots, campfire rounds, Passioncoin,
 * how to start and privacy. Audience: SHIFT High students (Thai high-school
 * students, minors), on phones.
 *
 * Facts come from the island's own copy (lib/content/shift-island.ts,
 * bot/src/quests/island/copy.ts, bot/src/quests/copy.ts) and the campfire
 * rounds and roots spec (docs/superpowers/specs/2026-11-13-shift-campfire-rounds-roots-design.md).
 *
 * House rules, checked by lib/content/__tests__/shift-island-guide.test.ts:
 * Thai first, short lines, speak to the student as คุณ, no em dashes, never
 * น้อง, ลูก or เด็ก, never ปลูก (say ลงแปลง), no streak wording. No prices,
 * coin amounts or dates here: amounts live in lib/content/shift-island-economy.ts
 * (DRAFT) and in /coins and /rewards on Discord. The stage count is read from
 * ISLAND_STAGES. The round and roots rules below must match the bot.
 */

import { FOCUS_MINUTES, REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY, REST_MINUTES, ROOT_LEVELS } from "@/lib/shift-island/rounds-rules";
import { ISLAND_STAGES } from "@/lib/content/shift-island";

/** Growth stages after the empty plot (ISLAND_STAGES[0] is the empty plot). */
export const GUIDE_STAGE_COUNT = ISLAND_STAGES.length - 1;

/** Campfire rounds, from the spec: the bot starts a round at :00 and :30 Bangkok time. */
export const CAMPFIRE_ROUND = { focusMinutes: FOCUS_MINUTES, restMinutes: REST_MINUTES, startsAt: [":00", ":30"] } as const;

/** Roots, from the spec: at most this many reflections count per person per day, over this many levels. */
export const ROOTS_RULE = { perDay: REFLECTIONS_PER_DAY, levels: ROOT_LEVELS } as const;

export interface GuideSectionHead {
  /** The anchor id, also used by the table of contents. */
  id: string;
  /** The short table-of-contents label. */
  toc: string;
  title: string;
  /** "ใหม่" on sections that describe something just launched. */
  badge?: string;
}

export const GUIDE_META = {
  title: "คู่มือเกาะ SHIFT High",
  description: "เกาะนี้คืออะไร ต้นไม้โตยังไง รากมาจากไหน รอบกองไฟเป็นยังไง และเหรียญได้มาจากอะไร",
} as const;

export const GUIDE_HERO = {
  eyebrow: "SHIFT HIGH ISLAND",
  heading: "คู่มือเกาะ",
  lede: "ทุกอย่างที่ควรรู้ก่อนขึ้นเกาะ อ่านจบได้ในไม่กี่นาที",
  toc: "ในหน้านี้",
  /** The pixel trees in the hero, decoration only. */
  treesAlt: "",
} as const;

const NEW = "ใหม่";

export const GUIDE_ISLAND = {
  id: "island",
  toc: "เกาะนี้คืออะไร",
  title: "เกาะนี้คืออะไร",
  lines: [
    "จบ 7 วันของ SHIFT แล้ว โปรเจกต์ของคุณยังไปต่อได้",
    "บนเกาะ SHIFT โปรเจกต์ค่อยๆ โตเป็นต้นไม้",
    "ทีมเดียวกันดูแลต้นไม้ต้นเดียวกัน",
  ],
  callout: "หนึ่งโปรเจกต์ คือต้นไม้หนึ่งต้น",
  imageAlt: "ภาพตัวอย่างเกาะ SHIFT High แบบพิกเซล ต้นไม้แต่ละต้นโตไม่เท่ากัน",
  caption: "ภาพตัวอย่าง: หนึ่งแปลงคือหนึ่งโปรเจกต์ ชื่อโปรเจกต์ขึ้นป้ายเมื่อทั้งทีมยินยอมเท่านั้น",
} as const;

export const GUIDE_GROWTH = {
  id: "growth",
  toc: "ต้นไม้โตยังไง",
  title: "ต้นไม้โตยังไง",
  lines: [
    `ต้นไม้มี ${GUIDE_STAGE_COUNT} ขั้น ตั้งแต่เมล็ดจนผลิดอก`,
    "ทำงานหลักข้อไหนได้แล้ว ก็กด 🌟 แล้วส่งหลักฐานสั้นๆ",
    "งานหลักแต่ละข้อที่พี่เลี้ยงยืนยัน ทำให้ต้นไม้โตขึ้นหนึ่งขั้น ทำข้อไหนก่อนก็ได้",
  ],
  rule: "ต้นไม้โตจากงานที่ยืนยันแล้วเท่านั้น ไม่ได้โตจากจำนวนครั้งที่กด หรือความเร็ว",
  rest: "พักได้นานเท่าที่ต้องการ ต้นไม้ไม่เหี่ยว และไม่เล็กลง",
  /** Under each stage sprite: "ขั้น 3" and the stage name from ISLAND_STAGES. */
  stageLabel: (n: number) => `ขั้น ${n}`,
  stagesLabel: `${GUIDE_STAGE_COUNT} ขั้นของต้นไม้`,
} as const;

export const GUIDE_ROOTS = {
  id: "roots",
  toc: "ราก",
  title: "ราก",
  badge: NEW,
  callout: "สิ่งที่คุณสร้าง โตให้เห็นเหนือดิน สิ่งที่คุณได้เรียนรู้ โตอยู่ใต้ดิน",
  lines: [
    `เขียนว่าได้เรียนรู้อะไร อย่างน้อย ${REFLECTION_MIN_CHARS} ตัวอักษร แล้วรากของต้นไม้จะหยั่งลึกลงไป`,
    // DRAFT for the Thai review
    "พิมพ์ /island แล้วกด ✍️ ได้เรียนรู้อะไร หรือกด ✍️ ปิดรอบ ที่กองไฟก็ได้ ประโยคสั้นๆ ก็นับ ขอแค่บอกว่าได้เรียนรู้อะไร",
    `รากนับได้คนละไม่เกิน ${ROOTS_RULE.perDay} บันทึกต่อวัน`,
    "บันทึกของทุกคนในทีม นับรวมเป็นรากของต้นไม้ต้นเดียวกัน",
  ],
  levelsTitle: `รากมี ${ROOTS_RULE.levels} ระดับ`,
  level: (n: number) => `ระดับ ${n}`,
  rule: "รากไม่ทำให้ขั้นของต้นไม้เปลี่ยน และไม่ใช้ปลดล็อกของใน /rewards ขั้นยังมาจากงานที่พี่เลี้ยงยืนยันเท่านั้น",
  pictureLabel: `ต้นไม้ต้นเดียวกัน กับราก ${ROOTS_RULE.levels} ระดับ`,
} as const;

export const GUIDE_CAMPFIRE = {
  id: "campfire",
  toc: "รอบกองไฟ",
  title: "รอบกองไฟ",
  badge: NEW,
  lines: [
    "เข้าห้องเสียงกองไฟใน Discord ของ SHIFT แล้วทำงานไปพร้อมกับเพื่อนๆ",
    `บอทเปิดรอบให้ทุกคนพร้อมกัน ชั่วโมงละสองรอบ เริ่มนาทีที่ ${CAMPFIRE_ROUND.startsAt.join(" และ ")}`,
    "มีคนนั่งที่กองไฟเมื่อไหร่ รอบก็เริ่ม แม้มีแค่คนเดียว",
  ],
  rhythmLabel: "หนึ่งชั่วโมงของกองไฟ",
  focus: `🔥 โฟกัส ${CAMPFIRE_ROUND.focusMinutes} นาที`,
  rest: `🌊 พัก ${CAMPFIRE_ROUND.restMinutes} นาที`,
  steps: [
    { label: "🎯 ตั้งเป้ารอบนี้", button: true, body: "ตอนเริ่มรอบ กดแล้วเขียนว่ารอบนี้จะทำอะไร" },
    { label: "✍️ ปิดรอบ", button: true, body: "ตอนพัก กดแล้วเขียนว่าได้เรียนรู้อะไร ถ้าติดตรงไหนก็เขียนเพิ่มได้" },
    { label: "ถ้าติด", button: false, body: "ส่งเรื่องที่ติดให้พี่เลี้ยงช่วยดูได้" },
  ],
  diffuseTitle: "ถึงเวลาพัก (diffuse mode)",
  diffuse: [
    "ลุกขึ้นยืดตัว ดื่มน้ำ มองไกลๆ หรือเดินสักหน่อย",
    "พักจากงานตรงหน้า สมองอาจยังคิดต่ออยู่เงียบๆ กับเรื่องที่ค้างไว้ แล้วค่อยกลับมาต่อในรอบใหม่",
  ],
  privacyTitle: "ที่กองไฟ",
  privacy: [
    "ไม่มีใครนับหรือเห็นว่าคุณนั่งไปกี่นาที",
    // DRAFT for the Thai review
    "บันทึกสิ่งที่ได้เรียนรู้เป็นส่วนตัวตั้งแต่แรก และเลือกแชร์กับทีมได้ การขอให้พี่เลี้ยงช่วยเป็นอีกทางเลือก กด 🆘 เมื่อต้องการส่งเรื่องที่ติด",
    "รอบกองไฟไม่ส่ง DM: บอทโพสต์แค่ในห้องกองไฟ และตอบแบบที่คุณเห็นคนเดียว",
  ],
  pictureLabel: "กองไฟบนเกาะ มีคนนั่งรอบๆ",
} as const;

export const GUIDE_COINS = {
  id: "coins",
  toc: "เหรียญ",
  title: "เหรียญ Passioncoin",
  lines: [
    "ได้เหรียญจากเควสต์ที่พี่เลี้ยงตรวจผ่าน และจากการช่วยชุมชน",
    "เหรียญไม่ได้มาจากจำนวนชั่วโมงที่คุณนั่งทำงาน",
  ],
  commands: [
    { command: "/coins", body: "ดูกติกาและยอดเหรียญของคุณ" },
    { command: "/rewards", body: "ดูของที่แลกได้" },
  ],
  note: "จำนวนเหรียญและของรางวัลอาจมีการปรับ ดูตัวเลขล่าสุดได้ใน Discord",
} as const;

export const GUIDE_START = {
  id: "start",
  toc: "เริ่มยังไง",
  title: "เริ่มยังไง",
  steps: [
    { label: "/start", body: "พิมพ์ใน Discord ของ SHIFT" },
    { label: "🌱 จับจองที่ดิน", body: "สร้างโปรเจกต์ของคุณบนเกาะ หรือให้เพื่อนชวนเข้าโปรเจกต์ของเขา" },
  ],
  or: "หรือเปิดเกาะบนเว็บได้เลย",
  island: "เปิดเกาะบนเว็บ",
  discord: "เปิด Discord ของ SHIFT",
} as const;

export const GUIDE_PRIVACY = {
  id: "privacy",
  toc: "ความเป็นส่วนตัว",
  title: "ความเป็นส่วนตัว",
  lines: [
    "ขึ้นเกาะเมื่ออยากขึ้น ไม่มีใครบังคับ",
    "ทุกอย่างเป็นส่วนตัวตั้งแต่แรก ชื่อโปรเจกต์ขึ้นป้ายเมื่อทั้งทีมยินยอมเท่านั้น",
    "ไม่มีการอัดเสียง และไม่มีการอัดหน้าจอ",
    "กองไฟเก็บแค่ว่าตอนนี้ใครอยู่ในห้อง และลบทันทีเมื่อคุณออก",
  ],
} as const;

export const GUIDE_FOOTER = {
  question: "สงสัยตรงไหน ถามในห้องกลุ่มของ SHIFT ได้เลย",
  back: "กลับไปที่เกาะ",
} as const;

/** The sections in page order, for the table of contents. */
export const GUIDE_SECTIONS: readonly GuideSectionHead[] = [
  GUIDE_ISLAND,
  GUIDE_GROWTH,
  GUIDE_ROOTS,
  GUIDE_CAMPFIRE,
  GUIDE_COINS,
  GUIDE_START,
  GUIDE_PRIVACY,
];

/** Every exported value of this file, for the copy test. */
export const GUIDE_ALL = {
  GUIDE_META,
  GUIDE_HERO,
  GUIDE_ISLAND,
  GUIDE_GROWTH,
  GUIDE_ROOTS,
  GUIDE_CAMPFIRE,
  GUIDE_COINS,
  GUIDE_START,
  GUIDE_PRIVACY,
  GUIDE_FOOTER,
} as const;
