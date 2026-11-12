/**
 * Small pure helpers for FlipCards, DateToggle, LadderRebuild and BinaryChoice.
 */
import type { BinaryChoiceData, FitOutcome, GuideState, LadderRebuildData } from "../guide-types";

// ---------------------------------------------------------------- picks (LadderRebuild, FlipCards, DateToggle)

/** Adds or removes `id`; adding past `max` leaves the picks unchanged. */
export function togglePick(picked: readonly string[], id: string, max: number): string[] {
  if (picked.includes(id)) return picked.filter((p) => p !== id);
  if (picked.length >= max) return [...picked];
  return [...picked, id];
}

/** Bitmask of picks by chip position: chip i sets bit i (value_int for firstjob:proof). */
export function proofBitmask(chips: LadderRebuildData["proofChips"], picked: readonly string[]): number {
  return chips.reduce((mask, chip, i) => (picked.includes(chip.id) ? mask | (1 << i) : mask), 0);
}

/** Adds `id` once, keeping order (cards flipped, chips viewed). */
export function addSeen(seen: readonly string[], id: string): string[] {
  return seen.includes(id) ? [...seen] : [...seen, id];
}

// ---------------------------------------------------------------- fit (BinaryChoice)

export type Side = "left" | "right";
export type FitTally = Record<FitOutcome, number>;
export type FitResult = NonNullable<GuideState["fit"]>;

const OUTCOMES: readonly FitOutcome[] = ["A", "B", "C"];

export function tallyFit(
  questions: BinaryChoiceData["questions"],
  answers: Readonly<Record<string, Side>>
): FitTally {
  const tally: FitTally = { A: 0, B: 0, C: 0 };
  for (const q of questions) {
    const side = answers[q.id];
    if (!side) continue;
    const points = side === "left" ? q.left : q.right;
    for (const o of OUTCOMES) tally[o] += points[o] ?? 0;
  }
  return tally;
}

/**
 * Highest total wins. A tie shows both readouts as two letters in A, B, C
 * order ("AB"); a three-way tie keeps the first two ("AB").
 */
export function fitResult(tally: FitTally): FitResult {
  const top = Math.max(tally.A, tally.B, tally.C);
  const winners = OUTCOMES.filter((o) => tally[o] === top);
  if (winners.length === 1) return winners[0];
  return `${winners[0]}${winners[1]}` as FitResult;
}

/** value_int for fit:result: 1 (A), 2 (B), 3 (C), 4 (tie). */
export function fitValue(result: FitResult): number {
  if (result.length > 1) return 4;
  return OUTCOMES.indexOf(result as FitOutcome) + 1;
}

export function fitOutcomes(result: FitResult): FitOutcome[] {
  return result.split("") as FitOutcome[];
}
