/**
 * GuessReveal: slide to a guess, lock it, reveal the real value. Pure helpers.
 */
import type { GuessRevealData } from "../guide-types";
import { fillTemplate, formatNumber } from "./text";

/** Snaps to the step grid and clamps into [min, max]. */
export function clampGuess(value: number, data: Pick<GuessRevealData, "min" | "max" | "step">): number {
  if (!Number.isFinite(value)) return data.min;
  const snapped = data.min + Math.round((value - data.min) / data.step) * data.step;
  return Math.min(data.max, Math.max(data.min, snapped));
}

export function stepGuess(
  value: number,
  direction: 1 | -1,
  data: Pick<GuessRevealData, "min" | "max" | "step">
): number {
  return clampGuess(value + direction * data.step, data);
}

/** The slider's starting point: the middle of the range, on the grid. */
export function initialGuess(data: Pick<GuessRevealData, "min" | "max" | "step">): number {
  return clampGuess((data.min + data.max) / 2, data);
}

/**
 * Bucket index for `value_int`. `buckets` are ascending EXCLUSIVE upper
 * bounds: [50, 150, 300] gives 0: <50, 1: 50 to 149, 2: 150 to 299, 3: 300+.
 */
export function bucketIndex(value: number, buckets: readonly number[]): number {
  const i = buckets.findIndex((bound) => value < bound);
  return i < 0 ? buckets.length : i;
}

export type GuessKind = "near" | "over" | "under";

export function formatGuessValue(value: number, unit: GuessRevealData["unit"]): string {
  return unit === "baht" ? `${formatNumber(value)} บาท` : formatNumber(value);
}

/** "เกือบเป๊ะ" within `nearWithin`, otherwise over or under with `{d}` = the gap. */
export function guessFeedback(guess: number, data: GuessRevealData): { kind: GuessKind; text: string } {
  const gap = guess - data.answer;
  const kind: GuessKind = Math.abs(gap) <= data.nearWithin ? "near" : gap > 0 ? "over" : "under";
  const template = kind === "near" ? data.nearTh : kind === "over" ? data.overTh : data.underTh;
  return { kind, text: fillTemplate(template, guessVars(guess, data)) };
}

export function guessVars(guess: number, data: GuessRevealData) {
  return {
    d: formatNumber(Math.abs(guess - data.answer)),
    g: formatNumber(guess),
    a: formatNumber(data.answer),
  };
}

/** Largest value the chart must fit (bars, band, answer, guess), for scaling. */
export function chartMax(data: GuessRevealData, guess?: number): number {
  const values: number[] = [data.answer, data.max];
  if (guess !== undefined) values.push(guess);
  if (data.chart.kind === "bars") {
    for (const bar of data.chart.bars) if (bar.value !== null) values.push(bar.value);
    if (data.chart.band) values.push(data.chart.band.to);
  } else {
    for (const m of data.chart.markers) values.push(m.value);
  }
  return Math.max(...values, 1);
}

/** 0..100 position of `value` on an axis from `min` to `max`. */
export function axisPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}
