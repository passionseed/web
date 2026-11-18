import type { Figure, FigureKind } from "@/lib/shift-island/live/figures";

import { FIGURES } from "../copy";

/**
 * The people button's turn: today's visitors only, as the day's count it
 * stands on names them. The viewer first, then their team, then everyone
 * else. A tree's partner is not one of today's visitors: its plot's button
 * names it (FIGURES.plotPartner), and a tap on it still talks.
 */
const TURN_RANK: Partial<Record<FigureKind, number>> = { me: 0, team: 1, crowd: 2 };

/** What a figure says when tapped: one of its kind's lines, picked by its number, so it always says the same. */
export function figureLine(figure: Pick<Figure, "kind" | "n" | "mine">): string {
  const lines = figure.kind === "partner" && figure.mine ? FIGURES.partnerMine : FIGURES[figure.kind];
  const n = Math.abs(Math.trunc(figure.n)) || 0;
  return lines[n % lines.length];
}

/** Today's visitors' indexes in turn order (TURN_RANK, then each one's number): the keyboard's way round the plaza. */
export function turnOrder(figures: readonly Pick<Figure, "kind" | "n">[]): number[] {
  return figures
    .map((figure, index) => ({ figure, index, rank: TURN_RANK[figure.kind] }))
    .filter((entry): entry is { figure: Pick<Figure, "kind" | "n">; index: number; rank: number } => entry.rank != null)
    .sort((a, b) => a.rank - b.rank || a.figure.n - b.figure.n || a.index - b.index)
    .map(({ index }) => index);
}
