/**
 * SortGame: tap an item, then tap a bin (cards), or answer each row/bubble with
 * the bin buttons (queue, chat). Pure scoring.
 *
 * Conventions in SortGameData (content authors, U3):
 * - `answer` may list several bins; any of them counts as correct
 *   (ผู้ดูแลระบบไฟฟ้า: Specialized or Defense).
 * - `nearTh[bin]` marks a near miss: shown as "ใกล้แล้ว", not counted.
 * - `scored: false` items accept any bin and show their reveal (closing card).
 * - Flags starting with "@" are engine flags, never shown as chips:
 *   `@goal` marks the items the goal asks for (triage: the 2 alerts the AI got
 *   wrong). With goal items, value_int = x*10 + y (x = goal items right,
 *   y = other scored items right) and the result template gets {x} {xTotal}
 *   {y} {yTotal}.
 * - `outcomesTh` keys: `hit:<itemId>` / `miss:<itemId>` lines on the end
 *   screen, `wrong` (template with {reveal}) for a wrong placement.
 * - Milestones: `item:<itemId>` fires when that item is placed correctly
 *   (triage:caught-takeover).
 */
import type { SortGameData, SortItem } from "../guide-types";
import { fillTemplate } from "./text";

export type SortVerdict = "correct" | "near" | "wrong" | "free";

export interface Placement {
  bin: string;
  verdict: SortVerdict;
}

export type Placements = Readonly<Record<string, Placement>>;

export const GOAL_FLAG = "@goal";

export function isScored(item: SortItem): boolean {
  return item.scored !== false;
}

export function answerBins(item: SortItem): readonly string[] {
  return typeof item.answer === "string" ? [item.answer] : item.answer;
}

export function judgeItem(item: SortItem, bin: string): SortVerdict {
  if (!isScored(item)) return "free";
  if (answerBins(item).includes(bin)) return "correct";
  if (item.nearTh?.[bin]) return "near";
  return "wrong";
}

/** Places an item once. A placed item stays placed (each placement flips to the rule). */
export function placeItem(placed: Placements, data: SortGameData, itemId: string, bin: string): Placements {
  if (placed[itemId]) return placed;
  const item = data.items.find((i) => i.id === itemId);
  if (!item || !data.bins.some((b) => b.id === bin)) return placed;
  return { ...placed, [itemId]: { bin, verdict: judgeItem(item, bin) } };
}

/** Every item placed in its first correct bin: the state after "ข้ามเกม ดูเฉลย". */
export function solvedPlacements(data: SortGameData): Placements {
  const out: Record<string, Placement> = {};
  for (const item of data.items) {
    const bin = answerBins(item)[0] ?? data.bins[0]?.id ?? "";
    out[item.id] = { bin, verdict: isScored(item) ? "correct" : "free" };
  }
  return out;
}

export interface SortScore {
  score: number;
  total: number;
  x: number;
  xTotal: number;
  y: number;
  yTotal: number;
  /** Every item (scored or not) has been placed. */
  complete: boolean;
  hasGoal: boolean;
}

export function sortScore(data: SortGameData, placed: Placements): SortScore {
  let score = 0;
  let total = 0;
  let x = 0;
  let xTotal = 0;
  let y = 0;
  let yTotal = 0;
  for (const item of data.items) {
    if (!isScored(item)) continue;
    const right = placed[item.id]?.verdict === "correct";
    total += 1;
    if (right) score += 1;
    if (item.flags?.includes(GOAL_FLAG)) {
      xTotal += 1;
      if (right) x += 1;
    } else {
      yTotal += 1;
      if (right) y += 1;
    }
  }
  const complete = data.items.every((item) => Boolean(placed[item.id]));
  return { score, total, x, xTotal, y, yTotal, complete, hasGoal: xTotal > 0 };
}

/** value_int for the done event: x*10+y with goal items, otherwise the score. */
export function sortValue(s: SortScore): number {
  return s.hasGoal ? s.x * 10 + s.y : s.score;
}

export function sortResultText(data: SortGameData, s: SortScore): string {
  return fillTemplate(data.resultTh, {
    score: s.score,
    total: s.total,
    x: s.x,
    xTotal: s.xTotal,
    y: s.y,
    yTotal: s.yTotal,
  });
}

/** End-screen lines from `outcomesTh` (`hit:<id>` / `miss:<id>`), in item order. */
export function sortOutcomeLines(data: SortGameData, placed: Placements): string[] {
  const outcomes = data.outcomesTh ?? {};
  const lines: string[] = [];
  for (const item of data.items) {
    const p = placed[item.id];
    if (!p) continue;
    const key = p.verdict === "correct" ? `hit:${item.id}` : `miss:${item.id}`;
    if (outcomes[key]) lines.push(outcomes[key]);
  }
  return lines;
}

/** The line under a placed item: near-miss text, the wrong template, or the reveal. */
export function placementLine(data: SortGameData, item: SortItem, p: Placement): string {
  if (p.verdict === "near") return item.nearTh?.[p.bin] ?? item.revealTh;
  if (p.verdict === "wrong" && data.outcomesTh?.wrong) {
    return fillTemplate(data.outcomesTh.wrong, { reveal: item.revealTh });
  }
  return item.revealTh;
}

/** Flags shown as chips (engine flags starting with "@" are hidden). */
export function visibleFlags(item: SortItem): string[] {
  return (item.flags ?? []).filter((f) => !f.startsWith("@"));
}
