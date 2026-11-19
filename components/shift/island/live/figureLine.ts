import type { Figure, FigureKind } from "@/lib/shift-island/live/figures";

import { FIGURES, VISITORS } from "../copy";

/**
 * The people button's turn: today's visitors only, as the day's count it
 * stands on names them. The viewer first, then their team, then everyone
 * else. A tree's partner is not one of today's visitors: its plot's button
 * names it (FIGURES.plotPartner), and a tap on it still talks.
 */
const TURN_RANK: Partial<Record<FigureKind, number>> = { me: 0, team: 1, crowd: 2 };

/**
 * The day's numbers a person in the plaza can say (plaza.ts PlazaInput's
 * visitors): everyone who checked in on the Bangkok day, the viewer included,
 * and the viewer's teammates among them.
 */
export interface Today {
  count: number;
  team: number;
}

const whole = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

/**
 * The day's count a figure adds under its line, since the island prints none:
 * the viewer and everyone else the island's, a teammate the team's. Anyone
 * else (a tree's partner, the story's people) is not one of today's visitors.
 */
function dayCount(kind: FigureKind, today: Today): string | null {
  if (kind === "team") return whole(today.team) > 0 ? VISITORS.team(whole(today.team)) : null;
  if (kind === "me" || kind === "crowd") return whole(today.count) > 0 ? VISITORS.count(whole(today.count)) : null;
  return null;
}

/**
 * What a figure says when tapped, sentence by sentence: one of its kind's
 * lines, picked by its number so it always says the same, then (with `today`)
 * the day's count. The bubble shows each sentence on its own line.
 */
export function figureWords(figure: Pick<Figure, "kind" | "n" | "mine">, today?: Today | null): string[] {
  const lines = figure.kind === "partner" && figure.mine ? FIGURES.partnerMine : FIGURES[figure.kind];
  const n = Math.abs(Math.trunc(figure.n)) || 0;
  const line = lines[n % lines.length];
  const count = today ? dayCount(figure.kind, today) : null;
  return count ? [line, count] : [line];
}

/** The same words as one line: what the live region reads. */
export function figureLine(figure: Pick<Figure, "kind" | "n" | "mine">, today?: Today | null): string {
  return figureWords(figure, today).join(" ");
}

/** Today's visitors' indexes in turn order (TURN_RANK, then each one's number): the keyboard's way round the plaza. */
export function turnOrder(figures: readonly Pick<Figure, "kind" | "n">[]): number[] {
  return figures
    .map((figure, index) => ({ figure, index, rank: TURN_RANK[figure.kind] }))
    .filter((entry): entry is { figure: Pick<Figure, "kind" | "n">; index: number; rank: number } => entry.rank != null)
    .sort((a, b) => a.rank - b.rank || a.figure.n - b.figure.n || a.index - b.index)
    .map(({ index }) => index);
}
