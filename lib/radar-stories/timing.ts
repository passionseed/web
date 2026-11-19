/**
 * How long each part of a story reel stays on screen. Pure. Times are whole
 * frames at 30 fps so virtual-time filming is frame exact; the full cue
 * timeline (scene wipes, typewriter, soundtrack cues) is built on top of this
 * in components/radar/reel/story/storyTimeline.ts.
 *
 * "Characters" are what the eye sees: Thai vowel and tone marks that sit on a
 * letter count with it (grapheme clusters). The lint's limits count the same
 * way.
 */
import type { StoryBeat, StoryScript } from "./types";

export const STORY_FPS = 30;
export const FRAME_MS = 1000 / STORY_FPS;

export const STORY_TIMING = {
  /** Reading speed for the default beat length. */
  charsPerSecond: 14,
  /** Added to every line so the eye can find it. */
  padMs: 600,
  /** A beat without `ms` lasts this long at least and at most. */
  beatMs: [1600, 4000] as const,
  /** The hook card: on screen from frame 0 for its reading time, within these bounds. */
  hookMs: [1500, 2500] as const,
  /** The end card with the call to action. */
  endMs: 4200,
  /** Story reels are 20 to 40 seconds. */
  targetSeconds: [20, 40] as const,
} as const;

const THAI_COMBINING = /[ัิ-ฺ็-๎]/;

/** Splits text into user-perceived characters (Thai marks stay on their letter). */
export function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } })
    .Segmenter;
  if (typeof Seg === "function") {
    try {
      return Array.from(new Seg("th", { granularity: "grapheme" }).segment(text), (s) => s.segment);
    } catch {
      // fall through
    }
  }
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    if (out.length && (THAI_COMBINING.test(ch) || /\p{M}/u.test(ch))) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

/** Visible characters in `text` (see the header). */
export function charCount(text: string): number {
  return graphemes(text).length;
}

const clamp = (n: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, n));

/** Time to read `text` once: about 14 characters per second plus 600 ms. */
export function readMs(text: string): number {
  return (charCount(text.trim()) / STORY_TIMING.charsPerSecond) * 1000 + STORY_TIMING.padMs;
}

/** A beat's length when the script gives no `ms`: reading time, clamped to 1.6 to 4 s. */
export function defaultBeatMs(lineTh: string): number {
  return clamp(readMs(lineTh), STORY_TIMING.beatMs);
}

export function beatMs(beat: Pick<StoryBeat, "lineTh" | "ms">): number {
  return typeof beat.ms === "number" && beat.ms > 0 ? beat.ms : defaultBeatMs(beat.lineTh);
}

export function hookMs(hookTh: string): number {
  return clamp(readMs(hookTh), STORY_TIMING.hookMs);
}

/** Whole frames for a duration (at least one). */
export function toFrames(ms: number): number {
  return Math.max(1, Math.round(ms / FRAME_MS));
}

export function framesToMs(frames: number): number {
  return frames * FRAME_MS;
}

export interface StoryFrames {
  hook: number;
  beats: number[];
  end: number;
  total: number;
}

/** Frames per part. `hookTh` overrides the script's hook (a Trial Reels variant). */
export function storyFrames(script: Pick<StoryScript, "hookTh" | "beats">, hookTh: string = script.hookTh): StoryFrames {
  const hook = toFrames(hookMs(hookTh));
  const beats = script.beats.map((b) => toFrames(beatMs(b)));
  const end = toFrames(STORY_TIMING.endMs);
  return { hook, beats, end, total: hook + beats.reduce((a, b) => a + b, 0) + end };
}

/** Reel length in seconds. */
export function storySeconds(script: Pick<StoryScript, "hookTh" | "beats">, hookTh?: string): number {
  return storyFrames(script, hookTh).total / STORY_FPS;
}
