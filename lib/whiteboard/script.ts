// Speaker script: a private timeline of keywords for whoever is presenting the board.
// One part per line, "m:ss keyword, keyword". A line without a time adds keywords to the part above.

export type ScriptStep = { at: number; keywords: string[] };

/** A pausable stopwatch: `banked` ms from earlier runs, plus the run since `startedAt`. */
export type ScriptClock = { startedAt: number | null; banked: number };

export const STOPPED: ScriptClock = { startedAt: null, banked: 0 };

const TIMED = /^(\d{1,3})(?::([0-5]\d))?\s+(.+)$/;

const splitKeywords = (text: string) =>
  text
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);

export function parseScript(text: string): ScriptStep[] {
  const steps: ScriptStep[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const timed = TIMED.exec(line);
    if (timed) {
      steps.push({ at: Number(timed[1]) * 60 + Number(timed[2] ?? 0), keywords: splitKeywords(timed[3]) });
    } else if (steps.length) {
      steps[steps.length - 1].keywords.push(...splitKeywords(line));
    } else {
      steps.push({ at: 0, keywords: splitKeywords(line) });
    }
  }
  return steps.sort((a, b) => a.at - b.at);
}

/** Index of the part running at `elapsed` seconds, or -1 before the first one starts. */
export function stepAt(steps: ScriptStep[], elapsed: number): number {
  let current = -1;
  steps.forEach((step, i) => {
    if (step.at <= elapsed) current = i;
  });
  return current;
}

export function elapsedSeconds(clock: ScriptClock, now = Date.now()): number {
  const running = clock.startedAt === null ? 0 : now - clock.startedAt;
  return Math.max(0, Math.floor((clock.banked + running) / 1000));
}
