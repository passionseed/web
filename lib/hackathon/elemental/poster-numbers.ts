/**
 * Numbered printed posters (Big, 2026-11-26: "gen a diff qr for each poster,
 * just do poster number"). Each printed copy of the Elemental poster gets its
 * own number, and its QR code opens the hackathon page with ?src=poster-<n>.
 * The admin's sign-ups by source then show which copy, and so which spot,
 * brought each sign-up. The team notes which number went up where.
 */

/** The most copies one print sheet makes. */
export const MAX_POSTER_NO = 200;
/** The print sheet's range when none is given (Big's first guess was 30 posters). */
export const DEFAULT_POSTER_RANGE = { from: 1, to: 30 } as const;

/** The ?src= tag for a poster: "poster" for the unnumbered one, "poster-7" for copy 7. */
export function posterSource(posterNo?: number): string {
  return posterNo ? `poster-${posterNo}` : "poster";
}

/** "7" → 7. Anything that isn't a whole number from 1 to MAX_POSTER_NO is undefined. */
export function parsePosterNo(raw: string | null | undefined): number | undefined {
  if (!raw || !/^\d+$/.test(raw.trim())) return undefined;
  const n = Number(raw.trim());
  return n >= 1 && n <= MAX_POSTER_NO ? n : undefined;
}

/**
 * The poster numbers a print sheet makes, from ?from= and ?to=.
 * A missing or bad `from` is 1; a missing or bad `to` is the default end (30),
 * or `from` when that is higher. A reversed range is turned round. Both ends
 * stay within 1 to MAX_POSTER_NO.
 */
export function posterRange(fromRaw?: string | null, toRaw?: string | null): number[] {
  const a = parsePosterNo(fromRaw) ?? DEFAULT_POSTER_RANGE.from;
  const b = parsePosterNo(toRaw) ?? Math.max(a, DEFAULT_POSTER_RANGE.to);
  const [from, to] = a <= b ? [a, b] : [b, a];
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** "No. 07": the label printed on a copy, so whoever puts it up can note where it went. */
export function posterLabel(posterNo: number): string {
  return `No. ${String(posterNo).padStart(2, "0")}`;
}
