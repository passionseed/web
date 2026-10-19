/**
 * SHIFT[3] palette: clear glass over deep space. One cool light (aurora),
 * one far light (nebula), one warm light (sol) kept for the things that
 * matter most: Bangkok, the beacon, the moment a round opens.
 */
export const COSMOS = {
  void: "#03040b",
  star: "#f4f6ff",
  aurora: "#7fe3ff",
  nebula: "#9d8cff",
  sol: "#ffd29a",
  flare: "#ff8fb1",
  sea: "#060b24",
  indigo: "#3b45a8",
  panel: "#5866c9",
  orbit: "#7d8cd9",
} as const;

/** Starlight at a hex alpha, e.g. starlight("99"). */
export const starlight = (alpha: string) => `${COSMOS.star}${alpha}`;
