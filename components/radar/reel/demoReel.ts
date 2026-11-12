/**
 * Demo reels filmed from a guide level in demo mode (docs/features/radar-guides-in-code.md
 * section 3, "Reels filmed from pages"). Pure and client-safe: the studio
 * frame (PageFrame) plays this plan, `radar:reel --format demo` films it, and
 * `radar:check` validates it.
 *
 * Timeline: hook card, then the level with its blocks' demoScripts played one
 * after another, then the end card. Times are ms from the reel start unless
 * named otherwise.
 */
import type { ReelCues } from "../../shift/poster/testimonial/reelEngine";
import type { DemoStep, GuidePage } from "../../../lib/radar-guide/guide-types";
import { validateDemoScript } from "../../../lib/radar-guide/demo";
import { pageDemoScript } from "../guide/shell/level-steps";
import { clipText, reelEndCard, type RadarReelPayload, type RadarReelPlatform } from "./payload";
import { RADAR_REEL_BEAT } from "./radarReel";

export const DEMO_REEL_TIMING = {
  /** Hook title card before the level shows. */
  hookMs: 2400,
  /**
   * The level is on screen this long before the first step. Must equal
   * DEMO_LEAD_IN_MS in components/radar/guide/shell/DemoPlayer.tsx, whose
   * player performs the steps (asserted in radarReel.test.ts).
   */
  leadInMs: 600,
  /** After the last step, so the result is readable. */
  tailMs: 1800,
  /** End card. */
  endMs: 4000,
} as const;

/** Seconds: long enough to show a real game, short enough to be watched to the end. */
export const DEMO_REEL_TARGET_S: readonly [number, number] = [8, 45];

/** The studio's CSS viewport; deviceScaleFactor 2.5 makes it 1080x1920. */
export const DEMO_FRAME = { width: 432, height: 768, scale: 2.5 } as const;

/**
 * The level's demo steps for the reel: the shell's own page script
 * (pageDemoScript: every block's demoScript in page order, later blocks
 * offset), shifted by `leadInMs` so the level is on screen before the first
 * tap. `at` is ms from the moment the level shows.
 */
export function pageDemoSteps(page: Pick<GuidePage, "blocks">): DemoStep[] {
  return pageDemoScript(page).map((step) => ({ ...step, at: step.at + DEMO_REEL_TIMING.leadInMs }));
}

export interface DemoReelPlan {
  slug: string;
  pageKey: string;
  platform: RadarReelPlatform;
  hookTh: string;
  statTh: string | null;
  end: RadarReelPayload["end"];
  /** The level shows from here. */
  pageStartMs: number;
  /** Steps with `at` relative to pageStartMs. */
  steps: DemoStep[];
  endStartMs: number;
  totalMs: number;
  seconds: number;
  /** For scripts/shift-reel-audio.py. */
  cues: ReelCues;
}

const sec = (ms: number) => Math.round(ms) / 1000;

export function buildDemoReelPlan(input: {
  slug: string;
  alias: string;
  platform: RadarReelPlatform;
  page: Pick<GuidePage, "key" | "blocks" | "reel" | "og">;
}): DemoReelPlan {
  const { page } = input;
  const steps = pageDemoSteps(page);
  const lastAt = steps.reduce((max, s) => Math.max(max, s.at), 0);
  const pageStartMs = DEMO_REEL_TIMING.hookMs;
  const pageMs = steps.length ? lastAt + DEMO_REEL_TIMING.tailMs : DEMO_REEL_TIMING.leadInMs + DEMO_REEL_TIMING.tailMs;
  const endStartMs = pageStartMs + pageMs;
  const totalMs = endStartMs + DEMO_REEL_TIMING.endMs;
  const end = reelEndCard({
    slug: input.slug,
    alias: input.alias,
    platform: input.platform,
    pageKey: page.key,
    sendToFriendTh: page.reel?.sendToFriendTh ?? null,
  });

  const seconds = sec(totalMs);
  const abs = (s: DemoStep) => sec(pageStartMs + s.at);
  const sorted = (xs: number[]) => xs.filter((t) => t >= 0 && t < seconds).sort((a, b) => a - b);
  const cues: ReelCues = {
    seconds,
    beat: RADAR_REEL_BEAT,
    cuts: [0, sec(pageStartMs), sec(endStartMs)],
    slams: sorted([0.3, ...steps.filter((s) => s.action === "tap").map(abs), sec(endStartMs + 1200)]),
    pops: sorted([...steps.filter((s) => s.action === "type" || s.action === "scroll").map(abs), sec(endStartMs + 400)]),
    count: null,
    coin: sec(endStartMs + 1200),
    moods: [
      [0, "build"],
      [sec(pageStartMs), "light"],
      [steps.length ? abs(steps[0]) : sec(pageStartMs), "full"],
      [sec(endStartMs), "offer"],
    ],
  };

  return {
    slug: input.slug,
    pageKey: page.key,
    platform: input.platform,
    hookTh: clipText(page.reel?.hook.th || page.og.headlineTh, 64),
    statTh: page.og.stat?.th ? clipText(page.og.stat.th, 64) : null,
    end,
    pageStartMs,
    steps,
    endStartMs,
    totalMs,
    seconds,
    cues,
  };
}

/** Problems that would make a bad reel: unordered steps, steps past the level, a reel outside the target length, no steps. */
export function demoReelProblems(plan: DemoReelPlan): string[] {
  const problems = validateDemoScript(plan.steps, plan.endStartMs - plan.pageStartMs);
  if (!plan.steps.length) problems.push(`page "${plan.pageKey}" has no demoScript: the level would just sit there`);
  const [min, max] = DEMO_REEL_TARGET_S;
  if (plan.seconds < min || plan.seconds > max) problems.push(`the reel is ${plan.seconds}s; demo reels must be ${min} to ${max}s`);
  return problems;
}
