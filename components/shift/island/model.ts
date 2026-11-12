/**
 * Pure view models for the island board: what one quest looks like in a
 * tile, the keynote card and the detail sheet. Client-safe; the rules stay in
 * the database and in lib/supabase/shift-quests/board.ts.
 */
import {
  helpFor,
  mainTileStatus,
  missingTitles,
  proposedTileStatus,
  sideTileStatus,
  type BoardRef,
} from "@/lib/supabase/shift-quests/board";
import type { QuestBoard, QuestMine, TileStatus } from "@/lib/supabase/shift-quests/types";

import { BOARD } from "./copy";
import { mainIcon, sideIcon, type IconKey } from "./sprites";

/** Side quests that belong to the whole island, shown in the ทั้งเกาะ lane instead of a branch. */
export const COMMUNITY_SLUGS: ReadonlySet<string> = new Set(["side-review-a-friend"]);

export type QuestKind = BoardRef["kind"];

export interface QuestView {
  ref: BoardRef;
  kind: QuestKind;
  /** The template's slug (main and side), for questGuide; null for a proposed quest. */
  slug: string | null;
  title: string;
  purpose: string;
  examples: string | null;
  evidence: string;
  reflectionPrompt: string;
  status: TileStatus;
  icon: IconKey;
  mine: QuestMine | null;
  /** The teammate holding a main quest (held only). */
  owner: string | null;
  /** The caller's own instance, for "ติด" and the help flag. Never a teammate's. */
  instanceId: string | null;
  /** Titles of what still locks a side quest. */
  lockedBy: string[];
  repeatable: boolean;
  /** Optimistic-concurrency version for a proposed quest's submit. */
  version: number | null;
  /** The caller has an open help request on this quest. */
  help: boolean;
}

export function refKey(ref: BoardRef): string {
  switch (ref.kind) {
    case "main":
      return `main:${ref.milestone}`;
    case "side":
      return `side:${ref.templateId}`;
    case "proposed":
      return `proposed:${ref.instanceId}`;
  }
}

export function sameRef(a: BoardRef | null, b: BoardRef | null): boolean {
  return !!a && !!b && refKey(a) === refKey(b);
}

export function mainTitle(board: QuestBoard, milestone: number): string {
  return board.main.find((m) => m.milestone === milestone)?.title ?? BOARD.mainFallback(milestone);
}

/** Everything the UI needs for one quest on the board, or null when it is no longer there. */
export function questView(board: QuestBoard, ref: BoardRef): QuestView | null {
  if (ref.kind === "main") {
    const m = board.main.find((x) => x.milestone === ref.milestone);
    if (!m) return null;
    const instanceId = m.in_flight?.mine ? m.in_flight.instance_id : (m.mine?.instance_id ?? null);
    return {
      ref,
      kind: "main",
      slug: m.slug || null,
      title: m.title,
      purpose: m.purpose,
      examples: null,
      evidence: m.evidence_criteria,
      reflectionPrompt: m.reflection_prompt,
      status: mainTileStatus(m),
      icon: mainIcon(m.milestone),
      mine: m.mine,
      owner: m.in_flight && !m.in_flight.mine ? m.in_flight.owner : null,
      instanceId,
      lockedBy: [],
      // Milestone templates are repeatable today; the database refuses with milestone_done if one is not.
      repeatable: true,
      version: null,
      help: !!helpFor(board, instanceId),
    };
  }
  if (ref.kind === "side") {
    const s = board.side.find((x) => x.template_id === ref.templateId);
    if (!s) return null;
    const instanceId = s.mine?.instance_id ?? null;
    const status = sideTileStatus(s);
    return {
      ref,
      kind: "side",
      slug: s.slug || null,
      title: s.title,
      purpose: s.purpose,
      examples: s.examples?.trim() ? s.examples : null,
      evidence: s.evidence_criteria,
      reflectionPrompt: s.reflection_prompt,
      status,
      icon: sideIcon(s.icon),
      mine: s.mine,
      owner: null,
      instanceId,
      lockedBy: status === "locked" ? missingTitles(board, s) : [],
      repeatable: s.repeatable,
      version: null,
      help: !!helpFor(board, instanceId),
    };
  }
  const p = board.proposed.find((x) => x.instance_id === ref.instanceId);
  if (!p) return null;
  return {
    ref,
    kind: "proposed",
    slug: null,
    title: p.title,
    purpose: p.goal,
    examples: null,
    evidence: p.criteria,
    reflectionPrompt: "",
    status: proposedTileStatus(p),
    icon: "scroll",
    mine: p,
    owner: null,
    instanceId: p.instance_id,
    lockedBy: [],
    repeatable: false,
    version: p.version,
    help: !!helpFor(board, p.instance_id),
  };
}

/** What the detail sheet shows under the quest: a submit form, or a reason there is none. */
export type DetailAction =
  /** submittedWaiting: the work is with a mentor; the form stays behind a quiet "send a new version". */
  | { kind: "form"; resubmit: boolean; note: "doneRepeat" | "submittedWaiting" | null }
  /** Paused (by rest): resume first; no quest kind can be submitted while paused from here. */
  | { kind: "paused" }
  | { kind: "locked" }
  | { kind: "held" }
  | { kind: "appealed" }
  | { kind: "done" }
  | { kind: "closed" };

export function detailAction(q: QuestView): DetailAction {
  switch (q.status) {
    case "locked":
      return { kind: "locked" };
    case "held":
      return { kind: "held" };
    case "appealed":
      return { kind: "appealed" };
    case "done":
      if (q.kind === "proposed" || !q.repeatable) return { kind: "done" };
      return { kind: "form", resubmit: false, note: "doneRepeat" };
    case "declined":
      // A declined main or side quest starts a fresh attempt; a proposed one is closed.
      if (q.kind === "proposed") return { kind: "closed" };
      return { kind: "form", resubmit: false, note: null };
    case "submitted":
      return { kind: "form", resubmit: true, note: "submittedWaiting" };
    case "clarification":
      return { kind: "form", resubmit: true, note: null };
    case "paused":
      return q.instanceId ? { kind: "paused" } : { kind: "form", resubmit: false, note: null };
    default:
      return { kind: "form", resubmit: false, note: null };
  }
}

/** A quest the caller can start from the board without sending anything: an untouched main or side quest. */
export function canStart(q: QuestView): boolean {
  return (q.kind === "main" || q.kind === "side") && q.status === "available" && !q.mine;
}

/** Mentor feedback worth showing: the latest review's words, when there are any. */
export function mentorFeedback(q: QuestView): string | null {
  const feedback = q.mine?.latest_review?.feedback?.trim();
  return feedback ? feedback : null;
}

/** Side quests grouped under the main quest they branch from, in board order; null last. */
export function sideGroups<T extends { branch_of: number | null }>(side: T[]): { branchOf: number | null; items: T[] }[] {
  const groups = new Map<number | null, T[]>();
  for (const s of side) {
    const key = s.branch_of ?? null;
    const list = groups.get(key);
    if (list) list.push(s);
    else groups.set(key, [s]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
    .map(([branchOf, items]) => ({ branchOf, items }));
}
