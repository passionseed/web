/**
 * Thai text helpers for the certificate renderer (spec 6.2, E12).
 *
 * Thai has no spaces between words, so a line breaker needs explicit break
 * opportunities. Every Thai string is pre-segmented with Intl.Segmenter and
 * the word boundaries are marked with U+200B (zero-width space). Truncation
 * never cuts inside a word or a grapheme, so tone marks and vowels always stay
 * with their base consonant.
 */

export const ZWSP = "​";
const THAI_RE = /[฀-๿]/;

const wordSegmenter = new Intl.Segmenter("th", { granularity: "word" });
const graphemeSegmenter = new Intl.Segmenter("th", { granularity: "grapheme" });

export function hasThai(text: string): boolean {
  return THAI_RE.test(text);
}

export function graphemes(text: string): string[] {
  return Array.from(graphemeSegmenter.segment(text), (part) => part.segment);
}

export function graphemeLength(text: string): number {
  return graphemes(text).length;
}

export function wordSegments(text: string): string[] {
  return Array.from(wordSegmenter.segment(text), (part) => part.segment);
}

/**
 * Insert U+200B at every word boundary inside Thai runs. Boundaries next to
 * whitespace are left alone (whitespace is already a break opportunity).
 */
export function segmentThai(text: string): string {
  const clean = text.replace(/​/g, "");
  if (!hasThai(clean)) return clean;
  const parts = wordSegments(clean);
  let out = "";
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const prev = parts[i - 1];
    if (
      i > 0 &&
      !/\s$/.test(prev) &&
      !/^\s/.test(part) &&
      (hasThai(prev) || hasThai(part))
    ) {
      out += ZWSP;
    }
    out += part;
  }
  return out;
}

/**
 * Cap `text` at `max` graphemes. Longer strings end with "…" and are cut at
 * the last word boundary that fits; a single over-long word is cut at a
 * grapheme boundary instead.
 */
export function truncateAtSegment(text: string, max: number): string {
  const clean = text.replace(/​/g, "").trim();
  if (graphemeLength(clean) <= max) return clean;
  const budget = Math.max(1, max - 1); // leave room for the ellipsis
  let out = "";
  let used = 0;
  for (const word of wordSegments(clean)) {
    const len = graphemeLength(word);
    if (used + len > budget) break;
    out += word;
    used += len;
  }
  out = out.trimEnd();
  if (!out) out = graphemes(clean).slice(0, budget).join("").trimEnd();
  return `${out}…`;
}

/** Server-side caps from spec 6.2. */
export const TEXT_CAPS = { handle: 24, legal_name: 60, title: 80 } as const;
