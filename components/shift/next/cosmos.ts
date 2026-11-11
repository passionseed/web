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

/**
 * The globe: the planet at dawn, in the SHIFT riso inks. Night is the blue
 * plate, land in daylight is paper, and the dawn line runs pink, orange,
 * gold, the order of the sky on the home page and the posters. Warm light
 * means the same thing here as everywhere else in PassionSeed: the sun is
 * coming up. Kept apart from COSMOS, which the SHIFT[3] posters still print.
 */
export const DAWN_GLOBE = {
  sea: "#050a22",
  seaInk: "#0078bf",
  landNight: "#1f5fae",
  landDay: "#f2ead9",
  city: "#ffe800",
  pink: "#ff48b0",
  orange: "#ff6c2f",
  gold: "#ffc46a",
  beacon: "#ffd84d",
  rimNight: "#2f8fe0",
  orbit: "#6a9fd8",
  panel: "#2f6fb8",
} as const;
