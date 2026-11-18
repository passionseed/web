import type { Figure, FigureKind } from "@/lib/shift-island/live/figures";

import { FIGURES } from "../copy";

/** Turns go to the viewer first, then their team, everyone else, and the trees' partners. */
const TURN_RANK: Record<FigureKind, number> = { me: 0, team: 1, crowd: 2, partner: 3, builder: 4, tester: 5 };

/** What a figure says when tapped: one of its kind's lines, picked by its number, so it always says the same. */
export function figureLine(figure: Pick<Figure, "kind" | "n" | "mine">): string {
  const lines = figure.kind === "partner" && figure.mine ? FIGURES.partnerMine : FIGURES[figure.kind];
  const n = Math.abs(Math.trunc(figure.n)) || 0;
  return lines[n % lines.length];
}

/** The figures' indexes in turn order (TURN_RANK, then each one's number): the keyboard's way round the island. */
export function turnOrder(figures: readonly Pick<Figure, "kind" | "n">[]): number[] {
  return figures
    .map((figure, index) => ({ figure, index }))
    .sort((a, b) => TURN_RANK[a.figure.kind] - TURN_RANK[b.figure.kind] || a.figure.n - b.figure.n || a.index - b.index)
    .map(({ index }) => index);
}
