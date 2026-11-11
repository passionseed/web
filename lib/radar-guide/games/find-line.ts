/**
 * FindLine: tap the dangerous line of code. Pure reducer.
 * idle -> wrong (attempts++) -> found. Near-miss lines give their own
 * feedback; other wrong lines escalate hint 1, then hint 2 (which outlines
 * `outlineOnHint2`).
 */
import type { FindLineData, GameResult } from "../guide-types";

export type FindLinePhase = "idle" | "wrong" | "found";

export interface FindLineState {
  phase: FindLinePhase;
  /** Every tap, including the one that finds the line. */
  attempts: number;
  /** Wrong taps so far (drives the hint level). */
  wrongTaps: number;
  hint: 0 | 1 | 2;
  lastTap: number | null;
  /** Feedback for the last wrong tap: a near-miss line or a hint. */
  feedback: string | null;
  /** Lines with a soft outline (after hint 2). */
  outlined: readonly number[];
}

export function initFindLine(): FindLineState {
  return { phase: "idle", attempts: 0, wrongTaps: 0, hint: 0, lastTap: null, feedback: null, outlined: [] };
}

export function tapFindLine(state: FindLineState, data: FindLineData, line: number): FindLineState {
  if (state.phase === "found") return state;
  const attempts = state.attempts + 1;
  if (line === data.answer) {
    return { ...state, phase: "found", attempts, lastTap: line, feedback: null };
  }
  const wrongTaps = state.wrongTaps + 1;
  const near = data.nearMissTh[line];
  if (near) {
    return { ...state, phase: "wrong", attempts, wrongTaps, lastTap: line, feedback: near };
  }
  const hint: 1 | 2 = wrongTaps >= 2 || state.hint >= 1 ? 2 : 1;
  return {
    ...state,
    phase: "wrong",
    attempts,
    wrongTaps,
    lastTap: line,
    hint,
    feedback: data.hintsTh[hint - 1],
    outlined: hint === 2 ? data.outlineOnHint2 : state.outlined,
  };
}

/** The solved state shown after "ข้ามเกม ดูเฉลย". */
export function solvedFindLine(data: FindLineData): FindLineState {
  return { ...initFindLine(), phase: "found", lastTap: data.answer };
}

/** First-tap find counts as a perfect run (score 1/1). */
export function findLineResult(state: FindLineState, ms?: number): GameResult {
  return {
    done: state.phase === "found",
    attempts: state.attempts,
    score: state.attempts === 1 ? 1 : 0,
    total: 1,
    ...(ms !== undefined ? { ms } : {}),
  };
}
