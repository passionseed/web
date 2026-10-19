/**
 * X's weighted character count (twitter-text v3): code points up to U+10FF
 * (Latin, Thai, ...) and a few punctuation ranges weigh 1, everything else
 * (emoji, CJK) weighs 2, and every link counts as 23 however long it is.
 */

export const X_MAX_WEIGHT = 280;
const LINK_WEIGHT = 23;

const LINK = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:org|com|net|co|th|io|app)(?:\/[^\s]*)?/gi;

const LIGHT_RANGES: [number, number][] = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

function codePointWeight(cp: number): number {
  return LIGHT_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi) ? 1 : 2;
}

export function xWeightedLength(text: string): number {
  const links = text.match(LINK) ?? [];
  const rest = text.replace(LINK, "");
  let weight = links.length * LINK_WEIGHT;
  for (const ch of rest.normalize("NFC")) weight += codePointWeight(ch.codePointAt(0) ?? 0);
  return weight;
}
