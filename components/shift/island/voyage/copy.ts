/**
 * Every user-facing string of the voyage: the crossing from the invite's
 * beach to the island, and the ticket's button that starts it.
 *
 * DRAFT COPY for the founder's multi-model Thai review (AGENTS.md). House
 * rules, checked by __tests__/copy.test.ts: Thai first, no em dashes, no
 * emoji, never น้อง, ลูก or เด็ก. The lines only name what is on screen (the
 * ship sets off, the sea, the island): the story that follows says what the
 * island is for.
 */
export const VOYAGE_COPY = {
  /** The dialog's accessible name. */
  dialog: "ล่องเรือไปเกาะ",
  /** Under the picture, one per beat: set off, the open sea, the island in sight. */
  lines: ["ออกเรือ", "ข้ามทะเลไปเกาะ", "SHIFT High Island"] as const,
  skip: "ข้าม",
  /** Reduced motion: one still frame alongside the jetty, and this to step off. */
  ashore: "ขึ้นฝั่ง",
  /** On the ticket, once the seal is pressed: the way onto the ship. */
  board: "ขึ้นเรือไปเกาะ",
  /** While the page leaves for the island. */
  boarding: "กำลังขึ้นเรือ...",
} as const;
