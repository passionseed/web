/**
 * Demo Day festival on the island plaza: the sign's countdown, the stage that
 * builds as the season goes on, the lantern string that follows the island
 * goal, and the booth flags and stars next to plots. Pure and client-safe; the
 * world (lib/shift-island/live/plaza.ts) draws what this returns.
 *
 * Plan: docs/designs/shift-high-island-web.md, "Festival, notice board, voice
 * campfire, canvas link", section 3. No ranking, no leaderboard: booths carry
 * a slot and a kind only, and other teams' booths are a proxy read from the
 * tree they already show in full (never plain plots).
 */
import type { IslandMapPlot, SeasonGoal, SeasonView } from "@/lib/supabase/shift-quests/types";

export type StageStep = 0 | 1 | 2 | 3;

export interface FestivalBooth {
  slot: number;
  kind: "table" | "stage";
}

export interface FestivalLanterns {
  total: 8;
  lit: number;
  reached: boolean;
  count: number;
  target: number;
}

export interface Festival {
  /** YYYY-MM-DD (Bangkok date, from the server). */
  demoDay: string;
  daysToDemo: number;
  stageStep: StageStep;
  tableBar: number;
  stageBar: number;
  /** null when the season has no goal. */
  lanterns: FestivalLanterns | null;
  booths: FestivalBooth[];
}

const DAY_MS = 86_400_000;
/** Bangkok is UTC+7 all year (no daylight saving), so its date is plain arithmetic. */
const BANGKOK_MS = 7 * 3_600_000;
const LANTERNS = 8;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whole days since 1970-01-01 of a YYYY-MM-DD string (UTC date maths), or null when it is not a real date. */
function dayNumber(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const m = DATE.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const ms = Date.UTC(year, month - 1, day);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== day) return null;
  return Math.round(ms / DAY_MS);
}

/** Bangkok's date at `nowMs`, as whole days since 1970-01-01 (the same scale as dayNumber). */
export function bangkokDay(nowMs: number): number {
  return Math.floor((nowMs + BANGKOK_MS) / DAY_MS);
}

/** Milliseconds from `nowMs` to the next Bangkok midnight (always more than 0). */
export function msToBangkokMidnight(nowMs: number): number {
  return (bangkokDay(nowMs) + 1) * DAY_MS - BANGKOK_MS - nowMs;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * How far the stage is built, by days elapsed (not goal progress: days never go
 * backwards, and the lanterns already show the goal). Step 3 only on and after
 * Demo Day. With starts_on: the season is cut into thirds (steps 0, 1, 2).
 * Without it (or with a date that does not parse): more than 28 days left
 * gives 0, more than 14 gives 1, more than 0 gives 2.
 */
export function stageStepOf(s: Pick<SeasonView, "demo_day" | "days_to_demo"> & { starts_on?: string }): StageStep {
  const left = Number(s.days_to_demo);
  if (!Number.isFinite(left)) return 0;
  if (left <= 0) return 3;
  const demo = dayNumber(s.demo_day);
  const start = dayNumber(s.starts_on);
  if (demo === null || start === null) {
    if (left > 28) return 0;
    if (left > 14) return 1;
    return 2;
  }
  const span = demo - start;
  if (span <= 0) return 0;
  const today = demo - Math.trunc(left);
  const elapsed = clamp(today - start, 0, span);
  return Math.min(2, Math.floor((3 * elapsed) / span)) as StageStep;
}

const finite = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

/**
 * The lantern string over the plaza: 8 bulbs, lit in proportion to the island
 * goal. All 8 only once the goal is reached; until then at most 7, so a goal
 * that is counted but not yet latched never looks done. null without a goal.
 */
export function lanternsOf(goal: SeasonGoal | null): FestivalLanterns | null {
  if (!goal) return null;
  const count = Math.max(0, finite(goal.count));
  const target = Math.max(0, finite(goal.target));
  const reached = goal.reached === true;
  const lit = reached ? LANTERNS : clamp(Math.floor((LANTERNS * count) / Math.max(target, 1)), 0, LANTERNS - 1);
  return { total: LANTERNS, lit, reached, count, target };
}

/** A bar applies only when it is a positive number; anything else never qualifies. */
const reaches = (stage: number, bar: number) => Number.isFinite(bar) && bar > 0 && stage >= bar;

/**
 * Booth flags and stars by plot slot. The viewer's own plot uses
 * season.qualifies (confirmed by the server, exact; null means none). Other
 * plots: only non-plain ones (the tree the viewer already sees in full), as a
 * proxy from that tree: a star when the stage reaches stage_bar and the
 * visitor (main quest 3) is drawn, else a booth flag when it reaches
 * table_bar. Plain plots never get one. Sorted by slot.
 */
export function boothsOf(
  plots: IslandMapPlot[],
  season: Pick<SeasonView, "table_bar" | "stage_bar" | "qualifies">,
): FestivalBooth[] {
  const tableBar = Number(season.table_bar);
  const stageBar = Number(season.stage_bar);
  const booths: FestivalBooth[] = [];
  const seen = new Set<number>();
  for (const plot of plots) {
    if (!Number.isInteger(plot.slot) || seen.has(plot.slot)) continue;
    let kind: FestivalBooth["kind"] | null = null;
    if (plot.mine) {
      kind = season.qualifies === "stage" || season.qualifies === "table" ? season.qualifies : null;
    } else if (!plot.plain) {
      const stage = Number(plot.stage);
      if (reaches(stage, stageBar) && plot.visitor) kind = "stage";
      else if (reaches(stage, tableBar)) kind = "table";
    }
    if (!kind) continue;
    seen.add(plot.slot);
    booths.push({ slot: plot.slot, kind });
  }
  return booths.sort((a, b) => a.slot - b.slot);
}

/**
 * Everything the plaza draws for Demo Day, or null when there is no active
 * season. The goal is the season's own, falling back to the map's.
 *
 * `today` (bangkokDay of the client's clock): the countdown and the stage
 * step follow it, so a page left open rolls over at Bangkok midnight ("วันนี้"
 * on the day). Without it, or with a demo_day that does not parse, the
 * server's days_to_demo from page load stands.
 */
export function festivalOf(
  season: SeasonView | null,
  mapGoal: SeasonGoal | null,
  plots: IslandMapPlot[],
  today: number | null = null,
): Festival | null {
  if (!season) return null;
  const demo = dayNumber(season.demo_day);
  const daysToDemo = today !== null && Number.isFinite(today) && demo !== null ? demo - today : finite(season.days_to_demo);
  return {
    demoDay: season.demo_day,
    daysToDemo,
    stageStep: stageStepOf({ ...season, days_to_demo: daysToDemo }),
    tableBar: finite(season.table_bar),
    stageBar: finite(season.stage_bar),
    lanterns: lanternsOf(season.goal ?? mapGoal),
    booths: boothsOf(plots, season),
  };
}
