/**
 * Every user-facing string of the island story (the four-panel intro).
 *
 * DRAFT COPY for the founder's multi-model Thai review (AGENTS.md). Lines come
 * from the plan doc (docs/designs/shift-high-island-web.md, "Story").
 *
 * House rules, checked by __tests__/copy.test.ts: Thai first, about the
 * student and real work (never lore, never a lecture), no em dashes, no emoji,
 * no markdown, never น้อง, ลูก or เด็ก, no streak wording. The Demo Day date
 * always comes from the season (thaiShortDate), never from this file.
 */
import { thaiShortDate } from "../copy";

export const STORY = {
  /** The dialog's accessible name. */
  dialog: "เรื่องเล่าของเกาะ",
  /** The book button's aria-label. */
  reopen: "ดูเรื่องเล่าของเกาะอีกครั้ง",
  /** Each panel's accessible label. */
  panel: (n: number, total: number) => `ภาพ ${n} จาก ${total}`,
  /** Panels 1 to 3. */
  lines: ["เกาะนี้ยังว่าง", "ทุกโปรเจกต์คือต้นไม้หนึ่งต้น", "ต้นไม้โตจากงานจริง"] as const,
  /** Panel 4 with the season's Demo Day as a short Thai date (thaiShortDate). */
  festival: (date: string) => `${date} เทศกาล Demo Day`,
  /** Panel 4 when no season is loaded (the start screen). */
  festivalUndated: "คืนเทศกาล Demo Day",
  skip: "ข้าม",
  /** Only under reduced motion, where panels never advance by themselves. */
  next: "ต่อไป",
  /** The last panel's button, by where the student is. */
  cta: {
    start: "ไปที่เกาะ",
    claim: "จับจองที่ดิน",
    island: "ไปที่เกาะ",
  },
  /** StartCard: the island's rules, folded under one line. */
  rules: "กติกาของเกาะ",
};

export type StoryCta = keyof typeof STORY.cta;

/** The line under panel `index` (0..3). Panel 4 is dated only when the season's Demo Day parses. */
export function storyLine(index: number, demoDay: string | null): string {
  if (index < STORY.lines.length) return STORY.lines[Math.max(0, Math.trunc(index))];
  const date = thaiShortDate(demoDay);
  return date ? STORY.festival(date) : STORY.festivalUndated;
}
