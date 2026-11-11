/**
 * Copy for the SHIFT Island invite page: the bottle on the shore, the letter
 * inside it, the seal that RSVPs and the ticket that follows. Season name,
 * dates and stage names come from `shift-island.ts`, never typed here.
 */

import { formatThaiDate } from "@/lib/content/shift-cohort";
import {
  ISLAND_SEASON,
  ISLAND_STAGES,
  islandSeasonPhase,
} from "@/lib/content/shift-island";

export const PROLOGUE = [
  "7 วันของ SHIFT จบลง โปรเจกต์จริงหนึ่งชิ้นอยู่ในมือเรา",
  "หลายโปรเจกต์หยุดอยู่ตรงนั้น ไม่ใช่เพราะไม่ดี แต่เพราะไม่มีใครสร้างต่อไปด้วยกัน",
  "เลยมีเกาะแห่งหนึ่ง ที่ทุกโปรเจกต์คือต้นไม้ และต้นไม้ยังโตต่อหลังวันที่ 7",
  "ทุกแปลงคือโปรเจกต์ของใครสักคน ต้นไม้โตเมื่อพี่เลี้ยงเห็นงานที่ทำจริง",
  "ซีซันนี้ เกาะเปิดด้วยเทศกาล และมีขวดใบหนึ่งลอยมาเกยฝั่งถึงเรา",
] as const;

/** Tag on the prologue's island picture: a sample, never a real island map. */
export const PROLOGUE_SAMPLE_TAG = "ภาพตัวอย่าง";

export const SHORE = {
  hint: "แตะขวดเพื่อเปิด",
  skip: "ข้าม",
  next: "ต่อ",
} as const;

export const LETTER_CHAPTERS: readonly {
  id: "island" | "tree" | "festival" | "rules";
  title: string;
  body: string;
}[] = [
  {
    id: "island",
    title: "ถึงคนที่เคยผ่าน SHIFT",
    body: "เกาะนี้มีไว้ให้โปรเจกต์ที่ยังไม่อยากหยุด หนึ่งโปรเจกต์คือต้นไม้หนึ่งต้น และมันโตเมื่อพี่เลี้ยงยืนยันงานที่ทำจริงเท่านั้น",
  },
  {
    id: "tree",
    title: "ต้นไม้ของเรา",
    body: `เริ่มจากแปลงว่าง แล้วโตขึ้นทีละขั้น ${ISLAND_STAGES.length - 1} ขั้นจนผลิดอก ทำเควสต์ไหนก่อนก็ได้`,
  },
  {
    id: "festival",
    title: `เทศกาลเปิดเกาะ ${ISLAND_SEASON.name}`,
    body: "สองสัปดาห์แรกของเกาะ ทุกคนลงแปลงพร้อมกัน ช่วยกัน และดูต้นไม้ของกันและกันโต",
  },
  {
    id: "rules",
    title: "กติกาบนเกาะ",
    body: "พักได้ ต้นไม้ไม่เหี่ยว ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ",
  },
];

export const SEAL = {
  press: "กดตราประทับเพื่อตอบรับ",
  signIn: "เข้าสู่ระบบเพื่อตอบรับ",
  notAlumni:
    "การตอบรับเปิดให้คนที่จบ SHIFT แล้ว ถ้ายังไม่เคยเข้า SHIFT เริ่มได้ที่นี่",
  applyCta: "สมัคร SHIFT",
  pending: "กำลังประทับ...",
  error: "ประทับไม่ติด ลองกดอีกครั้ง",
  closed: "ซีซันนี้ปิดรับแล้ว ต้นไม้ทุกต้นยังอยู่บนเกาะ",
} as const;

export const TICKET = {
  heading: "เจอกันบนเกาะ",
  discordCta: "เข้าห้องเกาะใน Discord",
  noDiscord: "ลิงก์ห้องเกาะจะส่งในกลุ่มรุ่นของเรา",
} as const;

const DAY_MS = 24 * 3600 * 1000;

/**
 * Whole days from today (Bangkok) to kickoff. Zero on kickoff day, negative
 * after it. Same Bangkok day as `islandSeasonPhase`.
 */
export function daysUntilKickoff(now: Date = new Date()): number {
  const today = new Date(now.getTime() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  return Math.round(
    (Date.parse(ISLAND_SEASON.kickoff) - Date.parse(today)) / DAY_MS,
  );
}

/** The festival in one line, true on the day it is read. */
export function festivalLine(now: Date = new Date()): string {
  const kickoff = formatThaiDate(ISLAND_SEASON.kickoff, false);
  const lastDay = formatThaiDate(ISLAND_SEASON.lastDay, false);
  const phase = islandSeasonPhase(now);
  if (phase === "after") {
    return `${ISLAND_SEASON.name} จบแล้ว ต้นไม้ทุกต้นยังอยู่บนเกาะ`;
  }
  const days = daysUntilKickoff(now);
  // islandSeasonPhase says "running" on kickoff day itself.
  if (days === 0) return `เทศกาลเปิดเกาะเริ่มวันนี้ ถึง ${lastDay}`;
  if (phase === "before") {
    return `เทศกาลเปิดเกาะเริ่มในอีก ${days} วัน ${kickoff} ถึง ${lastDay}`;
  }
  return `เทศกาลเปิดอยู่ตอนนี้ ถึง ${lastDay}`;
}
