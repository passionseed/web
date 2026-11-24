import type { ElementKey } from "@/components/hackathon/elemental/media";

/**
 * The Elemental quiz: "เธอคือธาตุอะไร". Eight questions, five answers each,
 * one answer per element, so every element can win equally often.
 *
 * The model is the Big Five, not MBTI (MBTI gives many people a different
 * type when they retake it). Each element stands for one trait, in the role it
 * plays on a hackathon team:
 * - Fire: extraversion. The one who speaks first and pitches.
 * - Earth: conscientiousness. The one who builds and finishes.
 * - Water: agreeableness. The one who listens and interviews real people.
 * - Air: openness to experience. Ideas and design.
 * - Aether: intellect, the curious side of openness. Sees the hidden cause.
 * Neuroticism is left out on purpose: nobody shares "anxious", and the users
 * are minors.
 *
 * Nothing here is stored against a person. The result lives in the URL.
 *
 * Copy: Claude's draft (2026-11-24) for SHIFT alumni to rewrite in their own
 * words before the push (AGENTS.md: Thai copy comes from real students).
 */

export const QUIZ_ELEMENTS = ["fire", "earth", "water", "air", "aether"] as const satisfies readonly ElementKey[];

export type QuizAnswer = { element: ElementKey; th: string };
export type QuizQuestion = { th: string; answers: readonly QuizAnswer[] };

/** Answer order is mixed per question so the first answer isn't always the same element. */
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    th: "งานกลุ่มเพิ่งเริ่ม ทุกคนเงียบ เธอ...",
    answers: [
      { element: "fire", th: "เปิดปากก่อน “เอาไงดี มาโหวตกัน”" },
      { element: "earth", th: "เปิดโน้ต แบ่งว่าใครทำอะไร ส่งวันไหน" },
      { element: "water", th: "ถามทีละคนว่าอยากทำส่วนไหน" },
      { element: "air", th: "โยนไอเดียแปลกๆ ไปสามอัน" },
      { element: "aether", th: "ถามว่า “โจทย์จริงๆ คืออะไรกันแน่”" },
    ],
  },
  {
    th: "ว่างๆ เปิดโทรศัพท์ เธอมักจะ...",
    answers: [
      { element: "air", th: "เซฟรูป เก็บไอเดีย ทำมู้ดบอร์ด" },
      { element: "aether", th: "สงสัยว่าทำไมฟีดป้อนคลิปนี้มาให้" },
      { element: "fire", th: "ทักแชทกลุ่ม ชวนเพื่อนออกไปไหนสักที่" },
      { element: "water", th: "ตอบแชทเพื่อนที่กำลังมีเรื่อง" },
      { element: "earth", th: "เคลียร์ลิสต์งาน จัดตารางพรุ่งนี้" },
    ],
  },
  {
    th: "เพื่อนชมเธอบ่อยที่สุดว่า...",
    answers: [
      { element: "water", th: "คุยด้วยแล้วสบายใจ" },
      { element: "earth", th: "ฝากอะไรไว้ ไม่เคยหลุด" },
      { element: "aether", th: "รู้เรื่องแปลกๆ เยอะมาก" },
      { element: "air", th: "คิดอะไรไม่เหมือนใคร" },
      { element: "fire", th: "อยู่ด้วยแล้วไม่เงียบ" },
    ],
  },
  {
    th: "คืนก่อนส่งงาน เธอคือคนที่...",
    answers: [
      { element: "earth", th: "ทำส่วนของตัวเองเสร็จตั้งแต่เมื่อวาน" },
      { element: "fire", th: "เปิดเพลง ปลุกใจทีม สั่งชาไข่มุก" },
      { element: "air", th: "ยังแก้สไลด์ให้สวยขึ้นอีกนิด" },
      { element: "aether", th: "เพิ่งเจอจุดที่ยังไม่มีใครคิดถึง" },
      { element: "water", th: "คอยดูว่าใครยังไหว ใครไม่ไหว" },
    ],
  },
  {
    th: "ต้องไปคุยกับป้าที่อยู่ริมแม่น้ำ เรื่องน้ำเสีย เธอ...",
    answers: [
      { element: "aether", th: "อยากรู้ว่าน้ำเสียมาจากไหน ใครปล่อย" },
      { element: "water", th: "นั่งฟังป้าเล่ายาวๆ ได้เป็นชั่วโมง" },
      { element: "earth", th: "เขียนคำถามไว้ 10 ข้อ เรียงลำดับแล้ว" },
      { element: "fire", th: "เดินเข้าไปทักก่อนเลย ไม่ต้องเตรียม" },
      { element: "air", th: "สังเกตรอบๆ คิดว่าจะทำอะไรให้ป้าใช้ง่าย" },
    ],
  },
  {
    th: "สิ่งที่เธอกลัวที่สุดในงานกลุ่ม...",
    answers: [
      { element: "fire", th: "พรีเซนต์แล้วทั้งห้องเงียบ" },
      { element: "aether", th: "ทำมาทั้งหมด แต่แก้ผิดปัญหา" },
      { element: "water", th: "ทำให้ใครในทีมรู้สึกแย่" },
      { element: "earth", th: "งานไม่เสร็จ" },
      { element: "air", th: "ได้ผลงานที่เหมือนของคนอื่น" },
    ],
  },
  {
    th: "วันหยุดในฝันของเธอ...",
    answers: [
      { element: "air", th: "ไปที่ใหม่ ถ่ายรูป วาดรูป" },
      { element: "earth", th: "ทำโปรเจกต์ของตัวเองให้จบ" },
      { element: "fire", th: "คอนเสิร์ต งานวัด ที่ที่คนเยอะ" },
      { element: "aether", th: "ดูสารคดีรวดเดียวจนเช้า" },
      { element: "water", th: "อยู่กับเพื่อนสนิทสองสามคน" },
    ],
  },
  {
    th: "ได้ 3 วันแก้ปัญหาสิ่งแวดล้อมหนึ่งเรื่อง เธออยากเป็นคน...",
    answers: [
      { element: "water", th: "ไปคุยกับคนที่เจอปัญหาจริงๆ" },
      { element: "air", th: "ออกแบบให้คนอยากใช้" },
      { element: "earth", th: "สร้างของที่ใช้ได้จริงให้เสร็จ" },
      { element: "aether", th: "ขุดหาต้นเหตุที่ไม่มีใครเห็น" },
      { element: "fire", th: "ขึ้นพูดให้คนทั้งประเทศฟัง" },
    ],
  },
];

export type QuizResult = {
  key: ElementKey;
  /** Thai name as it reads on the card: "ไฟ". */
  th: string;
  en: string;
  /** The role this element plays on a team. */
  roleTh: string;
  /** One self-roasting line: the part people share. */
  roastTh: string;
  /** What the team gets from this element. */
  strengthTh: string;
  /** The element this one needs on its team, and why. Every element is needed by exactly one other. */
  needs: ElementKey;
  needsWhyTh: string;
};

/**
 * The results. `needs` runs in one circle (fire, water, earth, air, aether,
 * back to fire), so every element is somebody's missing piece.
 */
export const QUIZ_RESULTS: Record<ElementKey, QuizResult> = {
  fire: {
    key: "fire",
    th: "ไฟ",
    en: "Fire",
    roleTh: "คนพูด คนพรีเซนต์ คนจุดไฟให้ทีม",
    roastTh: "ไมค์อยู่ไหน เธออยู่นั่น",
    strengthTh: "ทีมเงียบเมื่อไหร่ เธอคือคนที่ทำให้มันเดินต่อ และคนที่ทำให้กรรมการจำทีมได้",
    needs: "water",
    needsWhyTh: "ไฟพูดเก่ง แต่น้ำคือคนที่ไปฟังคนที่เจอปัญหาจริง ไม่มีน้ำ ไฟก็พูดเรื่องที่ไม่มีใครเจอ",
  },
  water: {
    key: "water",
    th: "น้ำ",
    en: "Water",
    roleTh: "คนฟัง คนไปคุยกับคนที่เจอปัญหาจริง",
    roastTh: "นักจิตวิทยาประจำกลุ่ม ที่ไม่เคยได้เงินเดือน",
    strengthTh: "เธอได้เรื่องจริงจากคนจริง ซึ่งเป็นส่วนที่ทีมส่วนใหญ่ข้าม และเป็นหลักฐานที่กรรมการให้คะแนน",
    needs: "earth",
    needsWhyTh: "น้ำรู้ว่าคนเจอปัญหาอะไร แต่ดินคือคนที่สร้างของให้เขาใช้ได้จริง",
  },
  earth: {
    key: "earth",
    th: "ดิน",
    en: "Earth",
    roleTh: "คนสร้าง คนทำให้เสร็จ",
    roastTh: "แชทกลุ่มเงียบ แต่ไฟล์ของเธอเสร็จแล้ว",
    strengthTh: "ไอเดียไม่มีค่าถ้าไม่มีใครทำให้มันเกิด เธอคือคนนั้น",
    needs: "air",
    needsWhyTh: "ดินสร้างได้ทุกอย่าง แต่ลมคือคนที่ทำให้คนอยากใช้มัน",
  },
  air: {
    key: "air",
    th: "ลม",
    en: "Air",
    roleTh: "คนคิดไอเดีย คนออกแบบ",
    roastTh: "มีไอเดีย 47 อัน ทำจริงครึ่งอัน",
    strengthTh: "ในขณะที่ทุกทีมทำแบบเดียวกัน เธอคือคนที่ทำให้ทีมไม่เหมือนใคร",
    needs: "aether",
    needsWhyTh: "ลมคิดได้ไกล แต่ธาตุที่มองไม่เห็นคือคนที่เช็กว่าเรากำลังแก้ต้นเหตุจริงๆ",
  },
  aether: {
    key: "aether",
    th: "ธาตุที่มองไม่เห็น",
    en: "Aether",
    roleTh: "คนขุด คนเห็นสิ่งที่คนอื่นมองข้าม",
    roastTh: "เปิดคลิปเดียว จบที่บทความเรื่องเหมืองตอนตีสาม",
    strengthTh: "เธอถามว่า “ทำไม” จนเจอต้นเหตุ ทีมที่มีเธอจะไม่แก้ผิดปัญหา",
    needs: "fire",
    needsWhyTh: "ธาตุที่มองไม่เห็นรู้ความจริง แต่ไฟคือคนที่ทำให้คนอื่นฟังมัน",
  },
};

export function isQuizElement(v: string): v is ElementKey {
  return (QUIZ_ELEMENTS as readonly string[]).includes(v);
}

/**
 * The element with the most answers. A tie goes to whichever tied element was
 * picked last, so the final questions break it.
 */
export function scoreQuiz(picks: readonly ElementKey[]): ElementKey {
  const counts = new Map<ElementKey, number>();
  const lastSeen = new Map<ElementKey, number>();
  picks.forEach((el, i) => {
    counts.set(el, (counts.get(el) ?? 0) + 1);
    lastSeen.set(el, i);
  });
  let best: ElementKey = QUIZ_ELEMENTS[0];
  let bestCount = -1;
  let bestLast = -1;
  for (const el of QUIZ_ELEMENTS) {
    const c = counts.get(el) ?? 0;
    const last = lastSeen.get(el) ?? -1;
    if (c > bestCount || (c === bestCount && last > bestLast)) {
      best = el;
      bestCount = c;
      bestLast = last;
    }
  }
  return best;
}

/** The sign-up link from a result: tracked as source "quiz", with the element in utm_content. */
export function quizJoinHref(el: ElementKey): string {
  return `/hackathon/join?src=quiz&utm_campaign=quiz&utm_content=${el}`;
}

/** Bangkok calendar days from today until the last sign-up day, counting today (0 once closed). */
export function daysLeftToSignUp(closesOn: string, now: Date = new Date()): number {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
  const ms = Date.parse(`${closesOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}
