/**
 * The peer check (schema 15, 20261115140000_shift_quest_peer_check), shared
 * by the browser and the server: its limits, and the "เสร็จเมื่อ" items a peer
 * can tick. Feedback only: a mentor still decides, and only a mentor's
 * approval grows the tree.
 */
import { questGuide } from "./quest-canvas";

/** The quest schema with the peer check. */
export const PEER_SCHEMA = 15;
/** One line of feedback, as the database caps it. */
export const PEER_LINE_MAX = 280;
/** Checks one peer may send in a Bangkok day (the database's cap). */
export const PEER_DAILY = 10;
/** Item ids the database accepts: 1 to 40 of a-z, 0-9 and '-', at most 10. */
export const PEER_ITEM_ID = /^[a-z0-9-]{1,40}$/;
export const PEER_MAX_ITEMS = 10;

export interface PeerItem {
  id: string;
  label: string;
}

/**
 * What a peer can tick on a quest: the guide's checklist for the quest's
 * slug (main quests, at most 3, the same items the quest page shows), else
 * the quest's own criteria, one item per line (at most 5, ids c1..c5).
 */
export function peerChecklist(quest: { kind: "main" | "side" | "proposed"; slug: string | null; criteria: string }): PeerItem[] {
  const guide = questGuide({ kind: quest.kind, slug: quest.slug });
  if (guide.checklist.length > 0) {
    return guide.checklist.slice(0, 3).filter((item) => PEER_ITEM_ID.test(item.id));
  }
  return quest.criteria
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((label, index) => ({ id: `c${index + 1}`, label }));
}

/** The labels of the ticked ids that are on the list, in the list's order. */
export function tickedLabels(items: PeerItem[], ticked: readonly string[]): string[] {
  const set = new Set(ticked);
  return items.filter((item) => set.has(item.id)).map((item) => item.label);
}
