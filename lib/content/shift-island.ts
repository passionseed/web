/**
 * Copy for the SHIFT High Island chapter of the home page: the game SHIFT
 * High members play to keep a real project going after the seven days.
 *
 * Source: the SHIFT High Island brief of 2026-11-11 (goal, quests, season
 * dates and prize tracks) and the bot's own words in
 * `bot/src/quests/island/copy.ts` on the island branch (stage names, button
 * labels). The island runs for SHIFT High members; this page only describes
 * it and never links into it.
 *
 * The home page shows a teaser only: the sample picture, the eight tree
 * sprites in a row (the empty plot, then seven stages of growth) and the
 * apply button. The quests, the daily loop and the rule text below are not
 * on the home page any more, and the prize tracks were removed from this
 * file: their amounts were typed in and would have outlived the season.
 *
 * The season dates live here once. `islandSeasonLine` gives the season in one
 * line that changes by itself on kickoff day and after the last day. The home
 * page does not show it: a visitor cannot join the season, so its dates do
 * not belong above the apply button. The line never says "Demo day": on the
 * home page a demo day is day 7 of SHIFT and nothing else.
 *
 * The island invitation (/shift/island, lib/content/shift-island-invite.ts)
 * and the game on the same page read the season and the stage names from
 * here too: the game's STAGE_NAMES (components/shift/island/copy.ts and
 * bot/src/quests/island/copy.ts) must equal ISLAND_STAGES, and the season the
 * staff create with /admin season uses ISLAND_SEASON's name and dates
 * (__tests__/shift-island.test.ts checks both).
 *
 * Thai reviewed by Codex, Antigravity and Cursor on 2026-11-11; lines two or
 * more of them flagged were rewritten. The stage names are the bot's and match
 * its sprites (fruit at stage 6, blossom at stage 7), so they stay as they are
 * even though all three reviewers wanted blossom before fruit.
 */

import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { formatThaiDate } from "@/lib/content/shift-cohort";

/** Tree stage names, index = number of confirmed quests. Same as the bot. */
export const ISLAND_STAGES = [
  "ที่ดินว่าง",
  "เมล็ด",
  "ต้นกล้า",
  "ต้นอ่อน",
  "ต้นไม้",
  "ต้นใหญ่",
  "ออกผล",
  "ผลิดอก",
] as const;

export const SHIFT_ISLAND = {
  eyebrow: "SHIFT HIGH ISLAND",
  heading: "หนึ่งโปรเจกต์ คือต้นไม้หนึ่งต้นบนเกาะ",
  lede: "เกาะพิกเซลที่ทุกคนใน SHIFT High อยู่ร่วมกัน ต้นไม้ของแต่ละโปรเจกต์โตทีละขั้น เมื่อพี่เลี้ยงยืนยันงานที่ทำจริงแล้วเท่านั้น",
  sample: {
    src: "/shift/island/island-sample.png",
    width: 1216,
    height: 704,
    alt: "ภาพตัวอย่างเกาะ SHIFT High แบบพิกเซล มีแปลงปลูก 12 แปลง ต้นไม้แต่ละต้นโตไม่เท่ากัน",
    caption: "ภาพตัวอย่าง: หนึ่งแปลงคือหนึ่งโปรเจกต์ ชื่อโปรเจกต์ขึ้นป้ายบนเกาะ ซ่อนได้ทุกเมื่อ",
  },
  /**
   * Under the row of sprites. The row has one sprite more than the tree has
   * stages of growth, because it starts at the empty plot: say so, and count
   * from the data.
   */
  stages: `เริ่มจากแปลงว่าง แล้วต้นไม้โตขึ้น ${ISLAND_STAGES.length - 1} ขั้นจนผลิดอก`,
  entry: "ทางขึ้นเกาะคือ SHIFT: จบ 7 วันแล้วได้เข้า SHIFT High",
  note: "พักได้ ต้นไม้ไม่เหี่ยว",
} as const;

export interface IslandQuest {
  title: string;
  body: string;
}

/** The seven main quests. Each one a mentor confirms grows the tree a stage. */
export const ISLAND_QUESTS: IslandQuest[] = [
  { title: "หาปัญหาที่คุ้มค่าจะแก้", body: "เลือกปัญหาจริงที่เราใส่ใจ ก่อนลงมือสร้าง" },
  { title: "ทำให้มันมีอยู่จริง", body: "สร้างชิ้นเล็กที่สุดที่คนอื่นลองใช้ได้" },
  { title: "ให้คนจริงลองใช้", body: "ดูว่าเกิดอะไรขึ้น ผลที่ไม่เป็นไปตามคาดก็นับ" },
  { title: "ทำให้เขาอยากกลับมา", body: "ปรับหนึ่งอย่าง แล้วดูว่าใครกลับมาใช้อีก" },
  { title: "ถือกุญแจเอง", body: "เข้าถึงและสำรองไฟล์โปรเจกต์ได้เอง ทำต่อได้ด้วยตัวเอง" },
  { title: "ช่วยเพื่อนให้ไปต่อ", body: "ช่วยเพื่อนผ่านจุดที่ติด โดยไม่ทำแทน" },
  { title: "ทำให้ชุมชนดีขึ้น", body: "ปรับของที่ทุกคนใช้ร่วมกันให้ดีกว่าเดิม" },
];

/** Sprite for a tree stage, 32x40 pixels, drawn by the island's own generator. */
export const islandStageSprite = (stage: number) =>
  `/shift/island/stage_${Math.min(Math.max(stage, 0), ISLAND_STAGES.length - 1)}.png`;

export const ISLAND_TREE = {
  label: "7 เควสต์หลัก",
  title: "ทำเควสต์ไหนก่อนก็ได้",
  hint: "ลองกดเควสต์ดู ต้นไม้โตตามจำนวนที่ผ่าน",
  rule: "บนเกาะจริง ต้นไม้โตเมื่อพี่เลี้ยงมาดูงานแล้วยืนยัน ไม่ได้โตจากจำนวนครั้งที่กดหรือความเร็ว",
  board: "นอกจากเควสต์หลัก ยังมีเควสต์เสริมตามประเภทโปรเจกต์ และเสนอเควสต์ของตัวเองได้",
  /** Quests ticked when the demo first shows, so the tree is already alive. */
  startDone: [0, 1, 2],
} as const;

export interface IslandAction {
  icon: RisoIconName;
  title: string;
  body: string;
}

/** The daily loop: the four buttons a member has every day. */
export const ISLAND_DAILY = {
  label: "ทุกวันบนเกาะ",
  actions: [
    { icon: "hammer", title: "วันนี้ทำต่อ", body: "แตะครั้งเดียว บอกว่าวันนี้ลงมือแล้ว" },
    { icon: "chat", title: "ติด", body: "ขอให้พี่เลี้ยงช่วยในห้องที่ทุกคนเห็น" },
    { icon: "calendar", title: "ขอพัก", body: "พักนานแค่ไหนก็ได้ ไม่มีอะไรหาย" },
    { icon: "people", title: "ชวนเพื่อน", body: "ชวนเพื่อนเข้ามาทำโปรเจกต์เดียวกัน" },
  ] satisfies IslandAction[],
} as const;

/** Season 1: two weeks, first day to last day. ISO dates, Bangkok. */
export const ISLAND_SEASON = {
  name: "Season 1",
  kickoff: "2026-11-14",
  lastDay: "2026-11-28",
} as const;

export type IslandSeasonPhase = "before" | "running" | "after";

/** Today's date in Bangkok as YYYY-MM-DD, so it compares with the ISO dates. */
function bangkokDay(now: Date): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function islandSeasonPhase(now: Date = new Date()): IslandSeasonPhase {
  const today = bangkokDay(now);
  if (today < ISLAND_SEASON.kickoff) return "before";
  return today <= ISLAND_SEASON.lastDay ? "running" : "after";
}

/** The season in one line, true on the day it is read. */
export function islandSeasonLine(now: Date = new Date()): string {
  const { name } = ISLAND_SEASON;
  // No weekday: "ส. 14 พ.ย." reads as a typo inside a sentence.
  const kickoff = formatThaiDate(ISLAND_SEASON.kickoff, false);
  const lastDay = formatThaiDate(ISLAND_SEASON.lastDay, false);
  const phase = islandSeasonPhase(now);
  if (phase === "before") return `${name} ของเกาะเริ่ม ${kickoff} ถึง ${lastDay}`;
  if (phase === "running") return `${name} ของเกาะเปิดอยู่ตอนนี้ ถึง ${lastDay}`;
  return `${name} ของเกาะจบเมื่อ ${lastDay} ต้นไม้ทุกต้นยังอยู่บนเกาะ`;
}
