/**
 * The quest notice board in the plaza: the student's real next quests,
 * pinned as small notes. Pure and client-safe.
 *
 * Plan: docs/designs/shift-high-island-web.md, "Festival, notice board, voice
 * campfire, canvas link", section 2.
 */
import {
  mainTileStatus,
  openQuests,
  sideTileStatus,
  type BoardRef,
} from "@/lib/supabase/shift-quests/board";
import type { QuestBoard, TileStatus } from "@/lib/supabase/shift-quests/types";

/** Note colour: in progress (gold), an available main quest (cream), an available side quest (teal). */
export type NoticeKind = "active" | "main" | "side";

export interface NoticePin {
  ref: BoardRef;
  kind: NoticeKind;
  title: string;
}

/** Main and side tiles a student can start from their page: a declined one is a fresh attempt. */
const RETRYABLE: ReadonlySet<TileStatus> = new Set<TileStatus>(["available", "declined"]);

const refKey = (ref: BoardRef): string =>
  ref.kind === "main" ? `main:${ref.milestone}` : ref.kind === "side" ? `side:${ref.templateId}` : `proposed:${ref.instanceId}`;

/**
 * At most `limit` pins, in this order: the caller's own open quests (main,
 * side and proposed; clarification, active, paused, submitted, then appealed,
 * ties to the newest), then open main quests by milestone, then open side
 * quests by sort_order. "Open" is available or declined: a declined main or
 * side quest starts a fresh attempt from its page. Held, done and locked
 * quests, and declined proposed ones, are never pinned; each quest appears once.
 */
export function noticePins(board: QuestBoard | null, limit = 3): NoticePin[] {
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  if (!board || max === 0) return [];

  const pins: NoticePin[] = [];
  const seen = new Set<string>();
  const pin = (ref: BoardRef, kind: NoticeKind, title: string) => {
    const key = refKey(ref);
    if (pins.length >= max || seen.has(key)) return;
    seen.add(key);
    pins.push({ ref, kind, title });
  };

  for (const q of openQuests(board)) pin(q.ref, "active", q.title);

  const mains = board.main.filter((m) => RETRYABLE.has(mainTileStatus(m))).sort((a, b) => a.milestone - b.milestone);
  for (const m of mains) pin({ kind: "main", milestone: m.milestone }, "main", m.title);

  const sides = board.side.filter((s) => RETRYABLE.has(sideTileStatus(s))).sort((a, b) => a.sort_order - b.sort_order);
  for (const s of sides) pin({ kind: "side", templateId: s.template_id }, "side", s.title);

  return pins;
}
