/**
 * The Next Decade: Elemental, brand identity tokens.
 *
 * The idea: one real landscape, one element as the hero, and the image
 * breaking into pixels as it rises, as if a machine is reading it. Thin
 * boxes with small labels mark the five elements inside that one scene,
 * like a vision model's detections. The pixels are Aether, the fifth
 * element: what you can't see (information, missing traces, the digital
 * footprint).
 *
 * Rules for every Elemental piece:
 * - One scene per piece, photographic in feel: wide sky, low horizon, dry
 *   ground. One element is the hero (fire on the key visual).
 * - The hero dissolves upward into a pixel mosaic: real at the bottom,
 *   data at the top. Mosaic colours come from the hero plus one cool
 *   glitch colour (water blue).
 * - Translucent pixel blocks float in the sky. They are Aether.
 * - Thin 2px frames with a small label pair (English mono above, Thai
 *   below) mark the elements. Five at most, one per element.
 * - Thin display type: Bai Jamjuree 200 for the big Thai title and dates,
 *   300 for running text, Space Mono for [bracket] tags and // markers.
 * - Film grain over everything. Elemental is the one campaign allowed
 *   grain, against the key-art-poster rule (told by Angpao, 2026-11-19).
 * - Info sits low on the ground in two columns, every line led by a
 *   [Thai tag] or //, like an exhibition credit block.
 */

export const EL = {
  // Sky, top to the haze at the horizon.
  skyTop: "#6c8499",
  skyMid: "#98aab8",
  skyHaze: "#c9ceca",
  // Dry ground, from the hazy horizon to the dark foreground.
  groundFar: "#9a7c5e",
  groundMid: "#6b513a",
  groundNear: "#382a1e",
  // Fire, outside in.
  ember: "#c23a1b",
  flame: "#ec6a23",
  flameLight: "#f8a03c",
  flameCore: "#ffd98c",
  flameWhite: "#fff5df",
  // Glitch pixels.
  pixelRed: "#e8521f",
  pixelOrange: "#f39a4a",
  pixelCream: "#fbe2b8",
  pixelWhite: "#f5f2ea",
  waterLight: "#9fd6ec",
  water: "#5aa9d8",
  waterDeep: "#2f6f9e",
  char: "#1c1a1b",
  charGrey: "#4a4646",
  ash: "#d9d6d0",
  // Aether blocks in the sky.
  aetherPale: "#d9dfe4",
  aetherGrey: "#9eabb6",
  aetherOrange: "#f1a068",
  // Type.
  text: "#f4f1ea",
  textSoft: "rgba(244,241,234,0.78)",
  frame: "rgba(250,248,242,0.85)",
} as const;

export const EL_FONT = {
  display: "var(--font-bai-jamjuree), 'Noto Sans Thai', sans-serif",
  mono: "var(--font-space-mono), ui-monospace, monospace",
} as const;
