/**
 * Caption timing for founder clips (spec 7.2, `radar:clip`). Pure.
 *
 * whisper-cli gives good timings but its own (often wrong) Thai text. The
 * script gives the right text but no timings. `alignScriptToCues` keeps
 * whisper's times and our text: it aligns the two character streams and maps
 * every script line boundary onto whisper's clock. When whisper is missing or
 * its transcript does not resemble the script, lines are spread over the clip
 * in proportion to their spoken length instead.
 */

export interface TimedText {
  /** Seconds. */
  start: number;
  /** Seconds. */
  end: number;
  text: string;
}

export type AlignMethod = "aligned" | "proportional";

export interface AlignResult {
  lines: TimedText[];
  method: AlignMethod;
  /** 0..1 character similarity between the script and whisper's transcript. */
  similarity: number;
}

export interface AlignOptions {
  /** Clip length in seconds; the fallback spreads lines over [0, duration]. */
  duration?: number;
  /** Below this similarity the alignment is not trusted. Default 0.35. */
  minSimilarity?: number;
  /** Shortest line, in seconds. Default 0.4. */
  minLineSeconds?: number;
}

const DEFAULT_MIN_SIMILARITY = 0.35;
const DEFAULT_MIN_LINE_SECONDS = 0.4;
/** Above this many DP cells (script chars x whisper chars) we do not align. */
const MAX_DP_CELLS = 4_000_000;

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

/**
 * Lowercased letters and digits only (Thai digits become Arabic), so spacing,
 * punctuation and whisper's formatting do not count as differences.
 */
export function normalizeForAlign(text: string): string {
  let out = "";
  for (const ch of text.toLowerCase()) {
    const thaiDigit = THAI_DIGITS.indexOf(ch);
    if (thaiDigit !== -1) {
      out += String(thaiDigit);
    } else if (/[\p{L}\p{M}\p{N}]/u.test(ch)) {
      out += ch;
    }
  }
  return out;
}

function spokenWeight(text: string): number {
  return Math.max(1, Array.from(normalizeForAlign(text)).length);
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Spreads lines over [start, end] in proportion to their spoken length. This is
 * the fallback when whisper-cli is not installed or not trusted: speech runs at
 * a roughly even rate, so a line twice as long takes twice as long to say.
 */
export function distributeLines(lines: readonly string[], start: number, end: number): TimedText[] {
  if (lines.length === 0) return [];
  const span = Math.max(0, end - start);
  const weights = lines.map(spokenWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = start;
  return lines.map((text, i) => {
    const lineStart = cursor;
    cursor = i === lines.length - 1 ? end : cursor + (span * weights[i]) / total;
    return { start: round3(lineStart), end: round3(cursor), text };
  });
}

/** Per-character clock for whisper's transcript: char j is spoken at times[j]. */
function whisperClock(cues: readonly TimedText[]): { chars: string[]; times: number[]; end: number } {
  const chars: string[] = [];
  const times: number[] = [];
  for (const cue of cues) {
    const cueChars = Array.from(normalizeForAlign(cue.text));
    const span = Math.max(0, cue.end - cue.start);
    cueChars.forEach((ch, k) => {
      chars.push(ch);
      times.push(cue.start + (span * k) / cueChars.length);
    });
  }
  const end = cues.length ? Math.max(...cues.map((c) => c.end)) : 0;
  return { chars, times, end };
}

/**
 * Edit-distance alignment. For every script character position i (0..n),
 * returns the whisper character position it lines up with (0..m), plus the
 * distance. Positions are boundaries, so position n maps to the end.
 */
function alignPositions(a: string[], b: string[]): { map: number[]; distance: number } {
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  const dp = new Uint32Array((n + 1) * width);
  for (let j = 0; j <= m; j++) dp[j] = j;
  for (let i = 1; i <= n; i++) {
    dp[i * width] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i * width + j] = Math.min(
        dp[(i - 1) * width + (j - 1)] + cost,
        dp[(i - 1) * width + j] + 1,
        dp[i * width + (j - 1)] + 1
      );
    }
  }
  // Backtrace from (n, m); record for each script boundary i the whisper boundary j.
  const map = new Array<number>(n + 1).fill(0);
  let i = n;
  let j = m;
  map[n] = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      if (dp[i * width + j] === dp[(i - 1) * width + (j - 1)] + cost) {
        i -= 1;
        j -= 1;
        map[i] = j;
        continue;
      }
    }
    if (i > 0 && dp[i * width + j] === dp[(i - 1) * width + j] + 1) {
      i -= 1;
      map[i] = j;
    } else {
      j -= 1;
    }
  }
  return { map, distance: dp[n * width + m] };
}

/** Forces strictly increasing, non-overlapping lines inside [lo, hi]. */
function enforceMonotonic(lines: TimedText[], lo: number, hi: number, minLine: number): TimedText[] {
  const count = lines.length;
  const usable = Math.max(0, hi - lo);
  const step = count ? Math.min(minLine, usable / count) : minLine;
  const starts = lines.map((line) => line.start);
  for (let k = 0; k < count; k++) {
    const floor = k === 0 ? lo : starts[k - 1] + step;
    const ceiling = hi - step * (count - k);
    starts[k] = Math.min(Math.max(starts[k], floor), Math.max(floor, ceiling));
  }
  return lines.map((line, k) => ({
    text: line.text,
    start: round3(starts[k]),
    end: round3(k === count - 1 ? Math.max(hi, starts[k] + step) : starts[k + 1]),
  }));
}

/**
 * Times each script line from whisper's cues. Always returns one entry per
 * input line, in order, with start < end and no overlap.
 */
export function alignScriptToCuesDetailed(
  lines: readonly string[],
  whisperCues: readonly TimedText[],
  options: AlignOptions = {}
): AlignResult {
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const minLine = options.minLineSeconds ?? DEFAULT_MIN_LINE_SECONDS;
  const cues = whisperCues
    .filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start)
    .slice()
    .sort((a, b) => a.start - b.start);
  const clock = whisperClock(cues);
  const duration = options.duration ?? clock.end;

  // Untrusted whisper still tells us where speech starts and stops; without it, use the whole clip.
  const proportional = (similarity: number): AlignResult => {
    const lo = cues.length ? cues[0].start : 0;
    let hi = cues.length ? clock.end : Math.max(0, duration);
    if (hi <= lo) hi = lo + minLine * lines.length;
    const spread = distributeLines(lines, lo, hi);
    return { lines: enforceMonotonic(spread, lo, hi, minLine), method: "proportional", similarity };
  };

  if (lines.length === 0) return { lines: [], method: "aligned", similarity: 0 };
  const scriptChars: string[] = [];
  const boundaries: number[] = [0];
  for (const line of lines) {
    scriptChars.push(...Array.from(normalizeForAlign(line)));
    boundaries.push(scriptChars.length);
  }
  if (clock.chars.length === 0 || scriptChars.length === 0) return proportional(0);
  if (scriptChars.length * clock.chars.length > MAX_DP_CELLS) return proportional(0);

  const { map, distance } = alignPositions(scriptChars, clock.chars);
  const similarity = 1 - distance / Math.max(scriptChars.length, clock.chars.length);
  if (similarity < minSimilarity) return proportional(similarity);

  const timeAt = (whisperPos: number): number => {
    if (whisperPos >= clock.chars.length) return clock.end;
    return clock.times[whisperPos];
  };
  const firstStart = cues[0].start;
  const raw: TimedText[] = lines.map((text, k) => ({
    text,
    start: k === 0 ? firstStart : timeAt(map[boundaries[k]]),
    end: 0,
  }));
  return {
    lines: enforceMonotonic(raw, firstStart, Math.max(clock.end, firstStart + minLine * lines.length), minLine),
    method: "aligned",
    similarity: Math.round(similarity * 1000) / 1000,
  };
}

/** Spec name: whisper's times, our text, one entry per script line. */
export function alignScriptToCues(
  lines: readonly string[],
  whisperCues: readonly TimedText[],
  options: AlignOptions = {}
): TimedText[] {
  return alignScriptToCuesDetailed(lines, whisperCues, options).lines;
}

// ---------------------------------------------------------------------------
// Caption chunks and WebVTT
// ---------------------------------------------------------------------------

/** About two lines of the web player's caption at 18px on a 540px-wide clip. */
export const CAPTION_MAX_CHARS = 44;

/**
 * Splits a spoken line into caption-sized chunks at spaces only. Thai has no
 * spaces between words, so a space is a phrase break: a chunk never cuts a
 * word, even when one phrase alone is longer than `maxChars`.
 */
export function splitCaptionLine(text: string, maxChars = CAPTION_MAX_CHARS): string[] {
  const phrases = text.trim().split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const phrase of phrases) {
    const candidate = current ? `${current} ${phrase}` : phrase;
    if (current && Array.from(candidate).length > maxChars) {
      chunks.push(current);
      current = phrase;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Splits each timed line into caption chunks, sharing its time by spoken length. */
export function toCaptionCues(lines: readonly TimedText[], maxChars = CAPTION_MAX_CHARS): TimedText[] {
  return lines.flatMap((line) => {
    const chunks = splitCaptionLine(line.text, maxChars);
    if (chunks.length <= 1) return [{ ...line }];
    return distributeLines(chunks, line.start, line.end);
  });
}

export function formatVttTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

function escapeVtt(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A WebVTT document (the `captions_vtt` column must start with "WEBVTT"). */
export function buildVtt(cues: readonly TimedText[]): string {
  const blocks = cues.map(
    (cue) => `${formatVttTimestamp(cue.start)} --> ${formatVttTimestamp(cue.end)}\n${escapeVtt(cue.text)}`
  );
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}
