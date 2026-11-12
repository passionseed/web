/**
 * Quest 5 (ถือกุญแจเอง) and the practical-ownership checklist.
 *
 * Students tick the checklist in Discord (/project ownership). The quest page
 * shows the same five items read-only (shift_quest_ownership_get, migration
 * 20261111091200), lights quest 5's first "เสร็จเมื่อ" item as a hint when
 * every item is done, and the submit snapshots the states as text into the
 * evidence, so what a mentor reviews cannot change afterwards.
 *
 * Client-safe and pure. The labels repeat the bot's (bot/src/quests/copy.ts,
 * OWNERSHIP_ITEM and OWNERSHIP_STATE); a test keeps them equal. That file
 * imports discord.js, so it is not imported here.
 */

export const TAKE_THE_KEYS = "take-the-keys";
/** Its milestone (MAIN_SLUGS in quest-canvas.ts). */
export const MAIN_MILESTONE_TAKE_THE_KEYS = 5;

/** Where the checklist is ticked. */
export const OWNERSHIP_COMMAND = "/project ownership";

export const OWNERSHIP_ITEMS = ["access", "export", "team", "costs", "portability"] as const;
export type OwnershipItem = (typeof OWNERSHIP_ITEMS)[number];

export const OWNERSHIP_STATES = ["not_checked", "demonstrated", "needs_help", "not_applicable"] as const;
export type OwnershipState = (typeof OWNERSHIP_STATES)[number];

export interface OwnershipRow {
  item: OwnershipItem;
  state: OwnershipState;
  /** The work sits in an account a mentor holds. */
  mentorHeld: boolean;
}

/** The bot's item labels. */
export const OWNERSHIP_LABEL: Readonly<Record<OwnershipItem, string>> = {
  access: "เข้าถึงงานได้เอง",
  export: "สำรองหรือส่งออกได้",
  team: "ทีมตกลงกันแล้ว",
  costs: "ค่าใช้จ่ายและสิทธิ์",
  portability: "ย้ายไปทำที่อื่นได้",
};

/** The bot's state labels. */
export const OWNERSHIP_STATE_LABEL: Readonly<Record<OwnershipState, string>> = {
  not_checked: "ยังไม่ได้เช็ก",
  demonstrated: "ทำได้แล้ว",
  needs_help: "ต้องการความช่วยเหลือ",
  not_applicable: "ไม่เกี่ยว (มีเหตุผล)",
};

/** The bot's icons, for the stored snapshot (read by mentors in Discord). */
export const OWNERSHIP_ICON: Readonly<Record<OwnershipState, string>> = {
  not_checked: "⬜",
  demonstrated: "✅",
  needs_help: "🆘",
  not_applicable: "➖",
};

/** Appended to a snapshot line for work in an account a mentor holds (DRAFT copy). */
export const MENTOR_HELD = "งานอยู่ในบัญชีที่พี่เลี้ยงถือ";

const isItem = (v: unknown): v is OwnershipItem => typeof v === "string" && (OWNERSHIP_ITEMS as readonly string[]).includes(v);
const isState = (v: unknown): v is OwnershipState => typeof v === "string" && (OWNERSHIP_STATES as readonly string[]).includes(v);

/**
 * shift_quest_ownership_get's answer as rows in the bot's order: null without
 * a current project (the database's null), unknown items and states dropped.
 */
export function ownershipRows(raw: unknown): OwnershipRow[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return [];
  const byItem = new Map<OwnershipItem, OwnershipRow>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { item, state, mentor_held: mentorHeld } = entry as Record<string, unknown>;
    if (!isItem(item) || !isState(state) || byItem.has(item)) continue;
    byItem.set(item, { item, state, mentorHeld: mentorHeld === true });
  }
  return OWNERSHIP_ITEMS.flatMap((item) => (byItem.has(item) ? [byItem.get(item)!] : []));
}

/**
 * The item is done as a hint: shown working or ruled out with a reason, and
 * not resting on a mentor's account. A mentor still decides.
 */
export function ownershipLit(row: OwnershipRow): boolean {
  return (row.state === "demonstrated" || row.state === "not_applicable") && !row.mentorHeld;
}

/** Every item lit: quest 5's first "เสร็จเมื่อ" item lights up. */
export function ownershipAllLit(rows: readonly OwnershipRow[]): boolean {
  return rows.length > 0 && rows.every(ownershipLit);
}

/**
 * The checklist as stored in quest 5's evidence when it is sent: one heading
 * line, then one line per item. Deterministic; no notes or account details.
 */
export function ownershipSnapshot(rows: readonly OwnershipRow[]): string {
  const lines = rows.map((row) => {
    const held = row.mentorHeld ? ` (${MENTOR_HELD})` : "";
    return `${OWNERSHIP_ICON[row.state]} ${OWNERSHIP_LABEL[row.item]}: ${OWNERSHIP_STATE_LABEL[row.state]}${held}`;
  });
  return [`เช็กลิสต์ ${OWNERSHIP_COMMAND} ตอนส่ง`, ...lines].join("\n");
}

/**
 * The student's proof with the checklist snapshot after it, or null when the
 * two together pass `max` (the database's evidence cap): the caller refuses
 * rather than cut the student's own words.
 */
export function proofWithOwnership(proof: string, rows: readonly OwnershipRow[], max: number): string | null {
  if (rows.length === 0) return proof;
  const text = `${proof}\n\n${ownershipSnapshot(rows)}`;
  return text.length > max ? null : text;
}
