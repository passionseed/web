import { STUDENT, STUDENT_PALETTE, mix, sprite, type Rect } from "../pixelKit";

/**
 * Halloween add-ons for the pixel kit: a night palette and the sprites the
 * SHIFT[3] Halloween cover needs (witch hat, cat, jack-o'-lantern, ghost,
 * bat) plus graveyard pieces. Same grid as pixelKit: 1 cell = 6px.
 *
 * Palette: the night inverts SHIFT[1]'s value order. The sky is one flat
 * night colour (no dithered bands behind the copy), the far city is the
 * lightest silhouette and the near city the darkest.
 * Pumpkin orange is still the one high-chroma accent, so the eye lands on
 * the student and the lanterns first. Text contrast: cream on sky 14:1,
 * orange on ink 6.4:1.
 */
export const HX = {
  sky: "#1d1438",
  star: "#e9e1f5",
  moon: "#e2d29f",
  moonShade: "#c7b67e",
  moonGlow: "#4a3157",
  far: "#47335f",
  mid: "#2e2146",
  near: "#1b1330",
  windowDark: "#251a3b",
  groundTop: "#30254a",
  ground: "#1c1530",
  stone: "#7d7596",
  stoneLight: "#a49dbb",
  stoneDark: "#514a6a",
  ink: "#0d0919",
  pumpkin: "#ef7926",
  pumpkinDark: "#b64c1b",
  flame: "#ffd56a",
  stem: "#5b7a3c",
  ghost: "#efeaf7",
  ghostShade: "#bdb4d4",
  hat: "#5a3a8c",
  cream: "#f8f5ec",
  tile: "#271c42",
  wood: "#6b4528",
  woodDark: "#3f2818",
  bone: "#efe4cc",
  fog: "#463a63",
  /** Laptop screen: the only cool light in the scene, so it marks the focal point. */
  screen: "#bfe8ff",
  /** Track lines: quiet lavender, so orange stays for the student and the deadline. */
  lavender: "#b9a8d9",
} as const;

/** Deterministic 0..1 noise, same recipe as pixelKit, so renders repeat. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Local sprite rects moved to `ox, oy` and scaled up by `s` cells per cell. */
export function scaled(rects: Rect[], ox: number, oy: number, s: number): Rect[] {
  return rects.map(([x, y, w, h, fill]) => [ox + x * s, oy + y * s, w * s, h * s, fill]);
}

/** A sprite placed at `ox, oy` and drawn `s` times bigger. */
export function bigSprite(grid: string[], palette: Record<string, string>, ox: number, oy: number, s: number): Rect[] {
  return scaled(sprite(grid, palette, 0, 0), ox, oy, s);
}

/** One-cell stars, thinning toward the horizon, some dimmer than others. */
export function stars(top: number, bottom: number, count: number, width: number): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, 5) * width);
    const t = hash(i, 9);
    const y = top + Math.floor(t * t * (bottom - top));
    out.push([x, y, 1, 1, hash(i, 13) < 0.3 ? HX.star : mix(HX.star, HX.sky, 0.5)]);
  }
  return out;
}

/** Moon craters as small stepped patches on the moon's face. */
export function craters(cx: number, cy: number): Rect[] {
  return [
    [cx - 6, cy - 4, 3, 2, HX.moonShade],
    [cx - 7, cy - 3, 5, 1, HX.moonShade],
    [cx + 3, cy + 2, 4, 3, HX.moonShade],
    [cx + 2, cy + 3, 6, 1, HX.moonShade],
    [cx - 2, cy + 7, 2, 2, HX.moonShade],
    [cx + 5, cy - 7, 2, 1, HX.moonShade],
  ];
}

/** Pointed roof: rows narrowing two cells at a time up to a one-cell tip. */
export function spire(x: number, baseY: number, w: number, fill: string): Rect[] {
  const out: Rect[] = [];
  let left = x;
  let width = w;
  let y = baseY - 1;
  while (width > 0) {
    out.push([left, y, width, 1, fill]);
    left += 1;
    width -= 2;
    y -= 1;
  }
  return out;
}

/**
 * Lantern light on the ground: a checkerboard dither of warm cells that
 * thins out with distance, the usual pixel-art way to draw soft light.
 */
export function lanternGlow(
  cx: number,
  cy: number,
  radius: number,
  base: string,
  light: string = HX.pumpkin,
): Rect[] {
  const near = mix(base, light, 0.45);
  const far = mix(base, light, 0.25);
  const out: Rect[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy) * 1.4);
    for (let dx = -half; dx <= half; dx++) {
      const d = Math.hypot(dx / 1.4, dy) / radius;
      const x = cx + dx;
      const y = cy + dy;
      if (d < 0.55 ? (x + y) % 2 === 0 : (x % 2 === 0 && y % 2 === 0)) {
        out.push([x, y, 1, 1, d < 0.55 ? near : far]);
      }
    }
  }
  return out;
}

/** Low fog: long one-row wisps drifting across the graveyard. */
export function fogWisps(top: number, bottom: number, count: number, width: number): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const y = top + Math.floor(hash(i, 17) * (bottom - top));
    const w = 10 + Math.floor(hash(i, 19) * 26);
    const x = Math.floor(hash(i, 23) * width) - 8;
    out.push([x, y, w, 1, HX.fog]);
  }
  return out;
}

/** Rounded-top headstone standing on `bottom`, with a lit edge and a crack. */
export function tombstone(x: number, bottom: number, w: number, h: number): Rect[] {
  const top = bottom - h;
  return [
    [x + 1, top, w - 2, 1, HX.stone],
    [x, top + 1, w, h - 1, HX.stone],
    [x, top + 1, 1, h - 1, HX.stoneLight],
    [x + w - 1, top + 1, 1, h - 1, HX.stoneDark],
    [x + 2, top + 3, w - 4, 1, HX.stoneDark],
    [x + 2, top + 5, w - 5, 1, HX.stoneDark],
  ];
}

/** Bare tree: trunk plus crooked branches, all one silhouette colour. */
export function deadTree(x: number, bottom: number, fill: string): Rect[] {
  return [
    [x, bottom - 30, 3, 30, fill],
    [x - 1, bottom - 4, 5, 4, fill],
    [x - 8, bottom - 22, 8, 2, fill],
    [x - 10, bottom - 26, 2, 4, fill],
    [x - 4, bottom - 28, 2, 6, fill],
    [x + 3, bottom - 18, 9, 2, fill],
    [x + 11, bottom - 24, 2, 6, fill],
    [x + 7, bottom - 22, 2, 4, fill],
    [x + 1, bottom - 36, 2, 6, fill],
    [x + 3, bottom - 38, 3, 2, fill],
  ];
}

/** Witch hat, brim on the last row, sized to sit on the 12-wide student. */
export const HAT = [
  ".......KK...",
  "......KKK...",
  ".....KKKK...",
  "....KKKKK...",
  "...KKKKKKK..",
  "...OOOOOOO..",
  "KKKKKKKKKKKK",
];
export const HAT_PALETTE = { K: HX.hat, O: HX.pumpkin };

/** Black cat sitting upright, orange eyes, tail curled up its right side. */
export const CAT = [
  "K...K...",
  "KK.KK...",
  "KYKYK...",
  "KKKKK...",
  ".KKK..K.",
  "KKKKK..K",
  "KKKKK.K.",
  "KKKKKK..",
];
export const CAT_PALETTE = { K: HX.ink, Y: HX.flame };

/** Jack-o'-lantern: ribbed body, lit eyes and a toothy grin. */
export const PUMPKIN = [
  "....G....",
  ".DOODOOD.",
  "OOYOOOYOO",
  "ODOOYOODO",
  "OYYDYDYYO",
  ".DOOOOOD.",
];
export const PUMPKIN_PALETTE = { O: HX.pumpkin, D: HX.pumpkinDark, Y: HX.flame, G: HX.stem };

export const GHOST = [
  "...WWWW...",
  "..WWWWWW..",
  ".WWWWWWWW.",
  ".WKKWWKKW.",
  ".WKKWWKKW.",
  "WWWWWWWWWW",
  "WWWWKKWWWW",
  "WWWWKKWWWW",
  "WWWWWWWWWS",
  "SWWWWWWWSS",
  "S.WW.WW.S.",
];
export const GHOST_PALETTE = { W: HX.ghost, S: HX.ghostShade, K: HX.ink };
/** Background ghost: pulled toward the sky so it supports the scene, not leads it. */
export const GHOST_DIM_PALETTE = { W: mix(HX.ghost, HX.sky, 0.45), S: mix(HX.ghostShade, HX.sky, 0.5), K: HX.ink };

export const BAT = [
  "KK.....KK",
  "KKKK.KKKK",
  ".KKKKKKK.",
  "...K.K...",
];
export const BAT_PALETTE = { K: HX.ink };

/** The pixel icon palette (pixelIcons ICON_PALETTE keys) at night: flood teal turns lavender. */
export const HALLOWEEN_ICON_PALETTE = {
  C: HX.ghost,
  S: HX.ghostShade,
  M: HX.stone,
  B: HX.lavender,
  O: HX.pumpkin,
  L: HX.flame,
  D: HX.pumpkinDark,
  G: HX.stem,
};

/**
 * Morning after Halloween, in PassionSeed's Dawn colours (docs/ui-design-system.md):
 * near-black overhead, indigo held back, and the warmth only in a narrow
 * band at the horizon, ending in Dawn's pale gold.
 */
export const DAWN = {
  night: HX.ink,
  deep: "#0d1136",
  indigo: "#1d2559",
  haze: "#3b3a78",
  rose: "#8a5a86",
  ember: "#d98a6a",
  glow: "#fec46a",
  gold: "#fed95c",
  sun: "#fff2bd",
  hill: "#140f26",
  leaf: "#7fb069",
  leafDark: "#4f7d3e",
} as const;

/** A seedling: what the graveyard grows by morning. */
export const SPROUT = [
  "LL.LL",
  ".LDL.",
  "..D..",
  "..D..",
];
export const SPROUT_PALETTE = { L: DAWN.leaf, D: DAWN.leafDark };

/** SHIFT[1]'s student, laptop lit as a screen: the one cool light, so the eye lands here. */
export const LIT_STUDENT_PALETTE = { ...STUDENT_PALETTE, L: HX.screen };

/** The student in a witch hat at `scale`x, sitting with their feet on `bottom`. */
export function witchStudent(x: number, bottom: number, scale: number): Rect[] {
  const top = bottom - STUDENT.length * scale;
  const hatTop = top + (2 - (HAT.length - 1)) * scale;
  return [...bigSprite(STUDENT, LIT_STUDENT_PALETTE, x, top, scale), ...bigSprite(HAT, HAT_PALETTE, x, hatTop, scale)];
}

/** "9-15 NOV", or "30 NOV-6 DEC" when the round crosses a month. */
export function latinDateRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const month = new Date(Date.UTC(y, m - 1, d))
      .toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase();
    return { day: d, month };
  };
  const s = fmt(startIso);
  const e = fmt(endIso);
  return s.month === e.month ? `${s.day}-${e.day} ${e.month}` : `${s.day} ${s.month}-${e.day} ${e.month}`;
}
