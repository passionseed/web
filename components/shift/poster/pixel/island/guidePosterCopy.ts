/**
 * DRAFT for the multi-model Thai review (AGENTS.md "Thai copy review").
 *
 * Copy for the SHIFT Island guide poster (/shift/poster/island-guide): one
 * image for the test group in the SHIFT Discord, how to start and what to do
 * each day. Every line restates the web guide (lib/content/shift-island-guide.ts)
 * and the bot's own button labels (bot/src/quests/copy.ts,
 * bot/src/quests/island/copy.ts, bot/src/quests/rounds-copy.ts), so a student
 * who sees a button here finds the same words in Discord.
 *
 * House rules, checked by guidePosterCopy.test.ts: Thai first, speak to the
 * student as คุณ, no em dashes, never น้อง, ลูก or เด็ก, never ปลูก, no
 * prices, coin amounts or dates. Minutes come from rounds-rules.ts.
 */

import { CAMPFIRE_ROUND } from "@/lib/content/shift-island-guide";

/** A pixel icon drawn in place of the emoji on the bot's buttons (the render has no emoji font). */
export type GuideIcon = "seed" | "star" | "flame" | "wave" | "pencil";

/** One piece of a step's line: plain text, a slash command, a Discord button or a round's phase. */
export type GuidePart =
  | { text: string }
  | { command: string }
  | { button: string; icon: GuideIcon }
  | { phase: string; icon: GuideIcon; tone: "focus" | "rest" };

export interface GuideStep {
  n: number;
  title: string;
  /** Lines of the step; each line wraps on its own. */
  lines: readonly (readonly GuidePart[])[];
}

/** The bot's own button labels, without their emoji. */
export const GUIDE_POSTER_BUTTONS = {
  claim: "จับจองที่ดิน",
  milestone: "ถึงขั้นต่อไปแล้ว",
  close: "ปิดรอบ",
} as const;

export const ISLAND_GUIDE_POSTER = {
  /** `==word==` takes the accent colour. */
  headline: "หนึ่งโปรเจกต์\nคือ==ต้นไม้==หนึ่งต้น",
  /** Labels on the picture, next to their object; the numbers match the steps. */
  labels: {
    plot: "จับจองที่ดิน",
    tree: "ต้นไม้โต",
    fire: "นั่งที่กองไฟ",
    roots: "รากโต",
  },
  /** In the order a student meets them, left to right on the picture. */
  steps: [
    {
      n: 1,
      title: "จับจองที่ดิน",
      lines: [
        [
          { text: "พิมพ์" },
          { command: "/start" },
          { text: "ใน Discord อ่านเรื่องสั้นๆ แล้วกด" },
          { button: GUIDE_POSTER_BUTTONS.claim, icon: "seed" },
          { text: "ด้วยโปรเจกต์ SHIFT ของคุณ" },
        ],
      ],
    },
    {
      n: 2,
      title: "นั่งที่กองไฟ ทุกวัน",
      lines: [
        [{ text: "เข้าห้องเสียงกองไฟ ทำงานไปพร้อมกับคนอื่น" }],
        [
          { phase: `โฟกัส ${CAMPFIRE_ROUND.focusMinutes} นาที`, icon: "flame", tone: "focus" },
          { phase: `พัก ${CAMPFIRE_ROUND.restMinutes} นาที`, icon: "wave", tone: "rest" },
          { text: "แล้วกด" },
          { button: GUIDE_POSTER_BUTTONS.close, icon: "pencil" },
        ],
        [{ text: "เขียนว่าได้เรียนรู้อะไร รากจะโต ติดตรงไหน พี่เลี้ยงช่วยดูได้" }],
      ],
    },
    {
      n: 3,
      title: "ต้นไม้โต",
      lines: [
        [
          { text: "ทำงานถึงขั้นไหนแล้ว กด" },
          { button: GUIDE_POSTER_BUTTONS.milestone, icon: "star" },
          { text: "ส่งหลักฐานสั้นๆ พี่เลี้ยงดูงานแล้วยืนยัน ต้นไม้โตหนึ่งขั้น" },
        ],
      ],
    },
  ] satisfies readonly GuideStep[],
  coins: {
    line: "เหรียญได้จากงานที่พี่เลี้ยงยืนยัน และจากการช่วยคนอื่น ไม่ได้มาจากจำนวนชั่วโมง",
    commands: ["/coins", "/rewards"],
  },
  more: {
    label: "อ่านคู่มือเต็ม",
    link: "passionseed.org/shift/island/guide",
  },
  alt: "โปสเตอร์คู่มือเกาะ SHIFT: เกาะพิกเซลตอนรุ่งเช้า มีกองไฟ ที่ดินว่าง และต้นไม้ที่มีราก พร้อมสามขั้นตอนเริ่มต้น",
} as const;

function partText(part: GuidePart): string {
  if ("text" in part) return part.text;
  if ("command" in part) return part.command;
  if ("button" in part) return part.button;
  return part.phase;
}

/** Every user-facing string on the poster, for the copy test. */
export function guidePosterStrings(): string[] {
  const p = ISLAND_GUIDE_POSTER;
  const steps: readonly GuideStep[] = p.steps;
  const parts = steps.flatMap((s) => [s.title, ...s.lines.flatMap((line) => line.map(partText))]);
  return [p.headline, ...Object.values(p.labels), ...parts, p.coins.line, ...p.coins.commands, p.more.label, p.more.link, p.alt];
}
