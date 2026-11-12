/**
 * Demo mode (`?demo=1`) for filming reels from guide pages. Read in the browser
 * only: guide pages are force-static, so the server never sees query strings.
 * In demo mode the tracker is NOOP and progress is kept in memory, never
 * written to storage.
 */
import type { DemoStep } from "./guide-types";

export const DEMO_PARAM = "demo";

/** True for `?demo=1` or `?demo=true`. Pass `search` in tests; defaults to window.location.search. */
export function isDemoMode(search?: string): boolean {
  let query = search;
  if (query === undefined) {
    if (typeof window === "undefined") return false;
    try {
      query = window.location.search;
    } catch {
      return false;
    }
  }
  const value = new URLSearchParams(query).get(DEMO_PARAM);
  return value === "1" || value === "true";
}

/** CSS selector for a demo target: `[data-demo="<target>"]`. */
export function demoTargetSelector(target: string): string {
  return `[data-demo="${target.replace(/["\\]/g, "\\$&")}"]`;
}

/** Problems with a demo script: `at` must be >= 0, ascend, and stay within `maxMs`. */
export function validateDemoScript(steps: readonly DemoStep[], maxMs?: number): string[] {
  const errors: string[] = [];
  let prev = -1;
  steps.forEach((step, i) => {
    if (!Number.isFinite(step.at) || step.at < 0) errors.push(`step ${i}: at must be >= 0`);
    if (step.at < prev) errors.push(`step ${i}: at ${step.at} is before the previous step (${prev})`);
    if (maxMs !== undefined && step.at > maxMs) errors.push(`step ${i}: at ${step.at} is past ${maxMs}ms`);
    if (step.action !== "wait" && !step.target) errors.push(`step ${i}: ${step.action} needs a target`);
    prev = Math.max(prev, step.at);
  });
  return errors;
}

/** Total length of a demo script in ms (the last step's `at`). */
export function demoDuration(steps: readonly DemoStep[]): number {
  return steps.reduce((max, s) => Math.max(max, s.at), 0);
}

export interface DemoClock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/**
 * Schedules each step at its `at` offset and calls `run(step)`. Uses timers so
 * Chrome virtual time (radar:reel) makes playback deterministic. Returns a
 * cancel function.
 */
export function scheduleDemo(
  steps: readonly DemoStep[],
  run: (step: DemoStep, index: number) => void,
  clock: DemoClock = {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
  }
): () => void {
  const handles = steps.map((step, i) => clock.setTimeout(() => run(step, i), step.at));
  return () => handles.forEach((h) => clock.clearTimeout(h));
}
