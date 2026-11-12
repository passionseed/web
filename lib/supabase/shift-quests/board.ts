/**
 * Pure derivations over the quest board (shift_quest_board). Client-safe:
 * the UI uses these to pick a tile's look and the one keynote quest.
 */
import type {
  BoardHelp,
  BoardMain,
  BoardProposed,
  BoardSide,
  QuestBoard,
  QuestMine,
  QuestState,
  TileStatus,
} from "./types";

/** States in which the caller still has work (or a wait) on a quest. */
const OPEN_STATES = new Set<QuestState>(["active", "paused", "submitted", "clarification", "appealed"]);

function openStatus(state: QuestState | undefined): TileStatus | null {
  return state && OPEN_STATES.has(state) ? (state as TileStatus) : null;
}

/**
 * A main quest tile: a teammate holding the milestone shows "held"; the
 * caller's own in-flight instance shows its state; then done, declined, or
 * available.
 */
export function mainTileStatus(m: BoardMain): TileStatus {
  if (m.in_flight) {
    if (!m.in_flight.mine) return "held";
    const open = openStatus(m.in_flight.state);
    if (open) return open;
  }
  if (m.done) return "done";
  if (m.mine?.state === "declined") return "declined";
  return "available";
}

/** A side quest tile: locked first, then the caller's open instance, approved, declined, available. */
export function sideTileStatus(s: BoardSide): TileStatus {
  if (s.locked) return "locked";
  const open = openStatus(s.mine?.state);
  if (open) return open;
  if (s.approved) return "done";
  if (s.mine?.state === "declined") return "declined";
  return "available";
}

/** A proposed quest tile: approved is done, declined stays declined, else its own state. */
export function proposedTileStatus(p: BoardProposed): TileStatus {
  if (p.state === "approved") return "done";
  if (p.state === "declined") return "declined";
  return openStatus(p.state) ?? "available";
}

export type BoardRef =
  | { kind: "main"; milestone: number }
  | { kind: "side"; templateId: string }
  | { kind: "proposed"; instanceId: string };

/**
 * Open-quest priority: the quest that needs the caller most comes first.
 * Appealed waits on staff, so it comes last (and is never the keynote).
 */
const OPEN_ORDER: TileStatus[] = ["clarification", "active", "paused", "submitted", "appealed"];

/** One of the caller's own open quests (see openQuests). */
export interface OpenQuest {
  ref: BoardRef;
  status: TileStatus;
  /** mine.updated_at in ms, 0 when unknown. */
  updatedAt: number;
  title: string;
}

function openQuest(ref: BoardRef, status: TileStatus, mine: QuestMine | null, title: string): OpenQuest | null {
  if (!OPEN_ORDER.includes(status)) return null;
  const updatedAt = mine ? Date.parse(mine.updated_at) : Number.NaN;
  return { ref, status, updatedAt: Number.isNaN(updatedAt) ? 0 : updatedAt, title };
}

/**
 * The caller's own open quests (main, side and proposed): clarification, then
 * active, paused, submitted and appealed; ties go to the newest
 * mine.updated_at. Never a quest a teammate holds ("held").
 */
export function openQuests(board: QuestBoard): OpenQuest[] {
  const open: OpenQuest[] = [];
  const add = (q: OpenQuest | null) => {
    if (q) open.push(q);
  };
  for (const m of board.main) add(openQuest({ kind: "main", milestone: m.milestone }, mainTileStatus(m), m.mine, m.title));
  for (const s of board.side) add(openQuest({ kind: "side", templateId: s.template_id }, sideTileStatus(s), s.mine, s.title));
  for (const p of board.proposed) add(openQuest({ kind: "proposed", instanceId: p.instance_id }, proposedTileStatus(p), p, p.title));
  return open.sort(
    (a, b) => OPEN_ORDER.indexOf(a.status) - OPEN_ORDER.indexOf(b.status) || b.updatedAt - a.updatedAt,
  );
}

/**
 * The caller's own open quest that needs them most: clarification first, then
 * active, then paused, then submitted; ties go to the newest mine.updated_at.
 * Never a quest a teammate holds, never an appealed one.
 */
export function keynoteQuest(board: QuestBoard): BoardRef | null {
  return openQuests(board).find((q) => q.status !== "appealed")?.ref ?? null;
}

/**
 * Where to begin when nothing is open (keynoteQuest is null): the main quest
 * with the lowest milestone that the caller can still take on. Null when no
 * main quest is available.
 */
export function starterQuest(board: QuestBoard): BoardRef | null {
  const free = board.main
    .filter((m) => mainTileStatus(m) === "available")
    .sort((a, b) => a.milestone - b.milestone)[0];
  return free ? { kind: "main", milestone: free.milestone } : null;
}

/**
 * The caller's open help request for one quest instance, newest first.
 * A null instance id returns null, so a tile with no instance never shows
 * the flag of a general (quest-less) request; read board.help_open for those.
 */
export function helpFor(board: QuestBoard, instanceId: string | null): BoardHelp | null {
  if (!instanceId) return null;
  let found: BoardHelp | null = null;
  for (const help of board.help_open) {
    if (help.instance_id !== instanceId) continue;
    if (!found || help.created_at > found.created_at) found = help;
  }
  return found;
}

/**
 * Titles of what still locks a side quest: the missing main quests (in
 * milestone order) then the missing side quests. A prerequisite that is not
 * on the board (for example an unpublished side quest) falls back to a
 * plain label so the list is never silently short.
 */
export function missingTitles(board: QuestBoard, s: BoardSide): string[] {
  const mainTitles = [...s.missing_milestones]
    .sort((a, b) => a - b)
    .map((n) => board.main.find((m) => m.milestone === n)?.title ?? `เควสต์หลักขั้นที่ ${n}`);
  const sideTitles = s.missing_slugs.map((slug) => board.side.find((x) => x.slug === slug)?.title ?? slug);
  return [...mainTitles, ...sideTitles];
}
