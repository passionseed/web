/**
 * WebVTT parsing for the guide clip captions. Pure.
 *
 * The page never uses a native <track>: CaptionOverlay renders the active cue
 * itself so the styling is the same on iOS, Android and the IG in-app browser.
 */

export interface VttCue {
  /** Seconds. */
  start: number;
  /** Seconds, always greater than `start`. */
  end: number;
  /** Cue text with tags removed. Lines of a multi-line cue are joined with "\n". */
  text: string;
}

/** `HH:MM:SS.mmm` or `MM:SS.mmm` (a comma is accepted for the SRT habit). */
const TIMESTAMP = String.raw`(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})`;
const TIMING_LINE = new RegExp(`^\\s*${TIMESTAMP}\\s+-->\\s+${TIMESTAMP}(?:\\s|$)`);

function toSeconds(
  hours: string | undefined,
  minutes: string,
  seconds: string,
  millis: string
): number {
  const ms = Number(millis.padEnd(3, "0"));
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + ms / 1000;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&lrm;|&rlm;/g, "")
    .replace(/&amp;/g, "&");
}

function cleanLine(line: string): string {
  return decodeEntities(line.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * Parses a WebVTT document into cues sorted by start time. Anything that is
 * not a WEBVTT document returns []. NOTE, STYLE and REGION blocks, cue ids and
 * cue settings are ignored; cues with no text or a non-positive duration are
 * dropped.
 */
export function parseVtt(vtt: string | null | undefined): VttCue[] {
  if (typeof vtt !== "string") return [];
  const source = vtt.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (!/^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(source)) return [];

  const cues: VttCue[] = [];
  for (const block of source.split(/\n{2,}/)) {
    const lines = block.split("\n");
    const timingAt = lines.findIndex((line) => TIMING_LINE.test(line));
    if (timingAt === -1 || timingAt > 1) continue; // at most one id line before the timing
    if (/^(NOTE|STYLE|REGION)\b/.test(lines[0] ?? "") && timingAt !== 0) continue;
    const match = TIMING_LINE.exec(lines[timingAt]);
    if (!match) continue;
    const start = toSeconds(match[1], match[2], match[3], match[4]);
    const end = toSeconds(match[5], match[6], match[7], match[8]);
    if (!(end > start)) continue;
    const text = lines
      .slice(timingAt + 1)
      .map(cleanLine)
      .filter(Boolean)
      .join("\n");
    if (!text) continue;
    cues.push({ start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * The cue showing at time `t` (seconds), or null. When cues overlap, the one
 * that started last wins. `cues` must be sorted by start (as `parseVtt` returns).
 */
export function activeCue(cues: readonly VttCue[], t: number): VttCue | null {
  if (!Number.isFinite(t) || cues.length === 0) return null;
  // Binary search for the last cue that starts at or before t.
  let lo = 0;
  let hi = cues.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  for (let i = last; i >= 0; i -= 1) {
    if (t < cues[i].end) return cues[i];
  }
  return null;
}

/** Cue texts as transcript paragraphs (multi-line cues joined with a space). */
export function cueTranscript(cues: readonly VttCue[]): string[] {
  return cues.map((cue) => cue.text.replace(/\n/g, " "));
}
