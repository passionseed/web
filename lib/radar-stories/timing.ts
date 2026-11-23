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

const NUMBER = /^[\d๐-๙][\d๐-๙,.%]*$/;
/** A short Latin word that rides with the short Thai word before it ("ใช้ AI"). */
const SHORT_LATIN = /^[A-Za-z][A-Za-z0-9]{0,3}$/;
const LATIN = /[A-Za-z]$/;
const THAI = /^[\u0E00-\u0E7F]+$/;
/** Sentence particles: they end the phrase before them ("จริงๆ อะ", "UX/UI สิ"). */
const PARTICLES = new Set([
  "นะ", "น่ะ", "อะ", "อ่ะ", "ปะ", "ป่ะ", "สิ", "ซิ", "เลย", "ด้วย", "ไหม", "มั้ย", "ละ", "ล่ะ", "แหละ", "หรอ", "เหรอ",
  "เนอะ", "เถอะ", "ไง", "จ้ะ", "จ้า", "ค่ะ", "คะ", "ครับ",
]);

/** Words that lead into a number: a number stays with a word ending in one ("ยื่นรอบ 1", "ส่งออกกว่า 21"). */
const NUMBER_LEADS = /(?:รอบ|ปี|มี|กว่า|ราว|ประมาณ|เกือบ|ถึง|ทุก|ตั้ง|แค่|เหลือ|สูงสุด|อันดับ|ข้อ|ชั้น|ม\.|ที่|คือ|ละ|ครั้ง|วัน|เดือน|ชั่วโมง|นาที|ได้|เป็น|อีก)$/;

export const PHRASE_RULES = {
  /** A word this short (or shorter) before a number stays with it ("มี 4", "ราว 2.2"); so does any word ending in a NUMBER_LEADS word. */
  beforeNumber: 6,
  /** A word this short (or shorter) after a number stays with it ("40 รายการ", "21 ล้านเครื่อง"); a longer tail starts a new phrase. */
  afterNumber: 8,
  /** A Thai word this short before a short Latin word stays with it ("ใช้ AI"). */
  beforeLatin: 3,
  /** A Thai word this short after a Latin word stays with it ("UX/UI ให้"). */
  afterLatin: 2,
  /** Latin glue stops once a phrase would be longer than this. */
  maxGlued: 24,
} as const;

/**
 * A line as phrases: the only places a story reel may break a line. Thai copy
 * puts a space between phrases, and also around numbers and Latin words, so
 * a number stays with the word that leads into it ("รอบ 1", "ยื่นรอบ 1",
 * "มี 4") and with a short word after it ("4 รอบ", "86% ใช้") but never
 * pulls in a long tail, a short Latin word stays with a short Thai word
 * before it ("86% ใช้ AI"), and a particle ends the phrase before it
 * ("จริงๆ อะ"). Inside a phrase the line never breaks, so a Thai word is
 * never cut ("ด่า|นครีเอเตอร์"). Pure.
 */
export function phrases(line: string): string[] {
  const R = PHRASE_RULES;
  const out: string[] = [];
  let prev = "";
  for (const token of line.trim().split(/\s+/).filter(Boolean)) {
    const bare = token.replace(/[?!.,:;…"'”“)]+$/u, "");
    const hard =
      prev !== "" &&
      ((NUMBER.test(token) && (charCount(prev) <= R.beforeNumber || NUMBER_LEADS.test(prev))) ||
        (NUMBER.test(prev) && charCount(token) <= R.afterNumber) ||
        PARTICLES.has(bare));
    const soft =
      prev !== "" &&
      ((SHORT_LATIN.test(token) && THAI.test(prev) && charCount(prev) <= R.beforeLatin) || (THAI.test(bare) && LATIN.test(prev) && charCount(bare) <= R.afterLatin));
    const last = out[out.length - 1];
    if (last !== undefined && (hard || (soft && charCount(`${last} ${token}`) <= R.maxGlued))) out[out.length - 1] = `${last} ${token}`;
    else out.push(token);
    prev = token;
  }
  return out;
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

/** Whole frames for a duration (at least one). */
export function toFrames(ms: number): number {
  return Math.max(1, Math.round(ms / FRAME_MS));
}

export function framesToMs(frames: number): number {
  return frames * FRAME_MS;
}

export interface StoryFrames {
  beats: number[];
  end: number;
  total: number;
}

/**
 * Frames per part. There is no hook card: a reel opens cold on its first line
 * (frame 0 is that line, fully on screen, and the cover), because the first
 * second decides whether anyone stays. The hook text lives in the caption.
 */
export function storyFrames(script: Pick<StoryScript, "beats">): StoryFrames {
  const beats = script.beats.map((b) => toFrames(beatMs(b)));
  const end = toFrames(STORY_TIMING.endMs);
  return { beats, end, total: beats.reduce((a, b) => a + b, 0) + end };
}

/** Reel length in seconds. */
export function storySeconds(script: Pick<StoryScript, "beats">): number {
  return storyFrames(script).total / STORY_FPS;
}
