/**
 * Pixel-art kit for the SHIFT[1] "flooded city" poster.
 *
 * Everything is drawn on a coarse grid (1 cell = 6px on a 1080x1350 sheet)
 * as plain rects, so the SVG scales without smoothing and every edge stays
 * a hard pixel step. Sprites are ASCII grids; buildings, water and their
 * reflections are generated.
 */

export const CELL = 6;
export const GRID_W = 180;
export const GRID_H = 225;

/**
 * Palette, chosen in OKLCH rather than by eye:
 *
 * - Value first. Lightness steps are spaced so the scene still reads in
 *   greyscale: sky 0.86-0.93, far city 0.80, mid city 0.64, near city 0.46,
 *   ink 0.27. Each layer back is lighter and lower in chroma, which is
 *   atmospheric perspective: haze adds sky light and scatters colour away.
 * - Water follows Beer-Lambert absorption: red is absorbed first, so as it
 *   gets deeper it darkens and its hue drifts from teal (205) to blue (220).
 *   Reflections are the object's colour pulled toward deep water, because a
 *   water surface reflects only part of the light (Fresnel), never all of it.
 * - One accent. Everything is cool (hue 205-245), the student and boat are
 *   the complementary orange (hue 42-50) at the highest chroma on the sheet,
 *   so the eye lands there first. Warm window light and the sun break use
 *   the same warm family at low chroma so they support, not compete.
 * - Text contrast (WCAG): ink on sky 11.3:1, cream on ink 13.8:1, orange on
 *   ink 5.3:1, dark orange on sky 3.9:1 (large text only).
 */
export const PX = {
  skyTop: "#bad6e2", // oklch(0.86 0.035 225)
  sky: "#c9e4eb", // oklch(0.90 0.03 215)
  skyHaze: "#f1e7ce", // oklch(0.93 0.035 90)
  sun: "#fff2bd", // oklch(0.96 0.07 95)
  cloud: "#eff7f8", // oklch(0.97 0.008 215)
  cloudShade: "#bfd1dc", // oklch(0.85 0.025 235)
  far: "#aec1cb", // oklch(0.80 0.025 228)
  mid: "#77909e", // oklch(0.64 0.035 232)
  near: "#435c6c", // oklch(0.46 0.04 238)
  ink: "#172836", // oklch(0.27 0.035 245)
  windowDark: "#314553", // oklch(0.38 0.035 240)
  windowLit: "#f6d389", // oklch(0.88 0.10 85)
  waterLight: "#7db6bd", // oklch(0.74 0.06 205)
  water: "#428690", // oklch(0.58 0.07 208)
  waterDeep: "#205564", // oklch(0.42 0.06 220)
  foam: "#e0f3f4", // oklch(0.95 0.02 200)
  accent: "#ef7926", // oklch(0.70 0.17 50)
  accentDark: "#b64c1b", // oklch(0.55 0.15 42)
  accentLight: "#fac871", // oklch(0.86 0.12 80)
  plant: "#639564", // oklch(0.62 0.09 145)
  skin: "#e0b491", // oklch(0.80 0.07 60)
  cream: "#f8f5ec", // oklch(0.97 0.012 90)
  laptop: "#bfc5ca", // oklch(0.82 0.01 240)
  denim: "#3e5776", // oklch(0.45 0.06 255)
} as const;

/** [x, y, w, h, fill] in grid cells. */
export type Rect = [number, number, number, number, string];

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

/** Deterministic 0..1 noise so the same poster renders the same every time. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Linear blend of two hex colours in sRGB. */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** ASCII grid to rects, merging horizontal runs. `.` is transparent. */
export function sprite(
  grid: string[],
  palette: Record<string, string>,
  ox: number,
  oy: number,
): Rect[] {
  const out: Rect[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === "." || !palette[ch]) {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end] === ch) end++;
      out.push(r(ox + x, oy + y, end - x, 1, palette[ch]));
      x = end;
    }
  });
  return out;
}

/**
 * Horizontal bands of colour with a three-row ordered dither at each
 * seam, the classic way pixel art fakes a gradient with few colours.
 */
export function bands(x: number, w: number, stops: [number, string][]): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const [y0, c0] = stops[i];
    const [y1] = stops[i + 1];
    out.push(r(x, y0, w, y1 - y0, c0));
    if (i + 1 < stops.length - 1) {
      // Ordered dither over three rows: 25%, 50%, 75% of the next colour.
      const next = stops[i + 1][1];
      const rows = [
        (cx: number) => cx % 4 === 0,
        (cx: number) => cx % 2 === 1,
        (cx: number) => (cx + 2) % 4 !== 0,
      ];
      rows.forEach((hit, k) => {
        for (let cx = x; cx < x + w; cx++) {
          if (hit(cx)) out.push(r(cx, y1 - 3 + k, 1, 1, next));
        }
      });
    }
  }
  return out;
}

/** Stepped disc, for the sun breaking through behind the skyline. */
export function disc(cx: number, cy: number, radius: number, fill: string): Rect[] {
  const out: Rect[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    const half = Math.round(Math.sqrt(radius * radius - dy * dy));
    out.push(r(cx - half, cy + dy, half * 2, 1, fill));
  }
  return out;
}

/** Flat-bottomed cumulus: a row of stepped domes with a shaded base. */
export function cloud(x: number, baseY: number, domes: number[]): Rect[] {
  const out: Rect[] = [];
  let cx = x;
  for (const d of domes) {
    for (let dy = 0; dy < d; dy++) {
      const half = Math.round(Math.sqrt(d * d - dy * dy) * 1.4);
      out.push(r(cx + d - half, baseY - dy - 1, half * 2, 1, PX.cloud));
    }
    cx += Math.round(d * 1.6);
  }
  const width = cx - x + domes[domes.length - 1];
  out.push(r(x, baseY, width, 2, PX.cloudShade));
  return out;
}

export interface BuildingOpts {
  body: string;
  window?: string;
  /** Share of windows lit, 0..1. */
  lit?: number;
  roof?: "antenna" | "tank" | "garden" | "none";
}

/** Block with a window grid and an optional rooftop detail. */
export function building(x: number, top: number, w: number, bottom: number, opts: BuildingOpts): Rect[] {
  const out: Rect[] = [r(x, top, w, bottom - top, opts.body)];
  if (opts.window) {
    for (let wy = top + 3; wy < bottom - 1; wy += 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        const lit = hash(wx, wy) < (opts.lit ?? 0);
        out.push(r(wx, wy, 2, 2, lit ? PX.windowLit : opts.window));
      }
    }
  }
  const mid = x + Math.floor(w / 2);
  if (opts.roof === "antenna") out.push(r(mid, top - 6, 1, 6, opts.body), r(mid - 1, top - 3, 3, 1, opts.body));
  if (opts.roof === "tank") {
    out.push(r(x + 2, top - 4, 6, 3, opts.body), r(x + 3, top - 1, 1, 1, opts.body), r(x + 6, top - 1, 1, 1, opts.body));
  }
  if (opts.roof === "garden") {
    for (let gx = x + 1; gx < x + w - 1; gx += 3) {
      const h = 1 + Math.floor(hash(gx, top) * 3);
      out.push(r(gx, top - h, 2, h, PX.plant));
    }
  }
  return out;
}

/**
 * Mirror everything above `axis` into the water below it. Each mirrored row
 * is pulled toward deep water (partial Fresnel reflection), every third row
 * is dropped and alternate pairs slip a cell sideways, which is how a lightly
 * rippled surface breaks a reflection up.
 */
export function reflect(rects: Rect[], axis: number, depth: number, pull = 0.45): Rect[] {
  const out: Rect[] = [];
  for (const [x, y, w, h, fill] of rects) {
    for (let row = y; row < y + h; row++) {
      if (row >= axis) continue;
      const dist = axis - row;
      if (dist > depth || dist % 3 === 0) continue;
      const my = axis + dist - 1;
      const shift = Math.floor(my / 2) % 2 === 0 ? 1 : -1;
      const fade = pull + (1 - pull) * (dist / depth) * 0.6;
      out.push(r(x + shift, my, w, 1, mix(fill, PX.waterDeep, Math.min(0.9, fade))));
    }
  }
  return out;
}

/** Short bright dashes where the surface catches the light. */
export function glints(top: number, bottom: number, count: number, width = GRID_W): Rect[] {
  const out: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, 3) * width);
    const y = top + Math.floor(hash(i, 7) * (bottom - top));
    const w = 2 + Math.floor(hash(i, 11) * 5);
    out.push(r(x, y, w, 1, y < top + 8 ? PX.foam : mix(PX.foam, PX.water, 0.5)));
  }
  return out;
}

/**
 * Wavy top edge for the dark footer: the deep water the poster ends in.
 * `width` and `height` default to the cover grid; the banner passes its own.
 */
export function waveBand(y: number, fill: string, period = 12, width = GRID_W, height = GRID_H): Rect[] {
  const profile = [2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2];
  const out: Rect[] = [];
  for (let x = 0; x < width; x++) {
    const lift = profile[x % period];
    out.push(r(x, y + lift, 1, 3 - lift, fill));
  }
  out.push(r(0, y + 3, width, height - y - 3, fill));
  return out;
}

/** Half-sunk street sign: one board per step, arrows alternating sides. */
export function streetSign(x: number, top: number, bottom: number, boards: number, w = 34): Rect[] {
  const post = x + Math.round(w / 2) - 1;
  const out: Rect[] = [r(post, top, 3, bottom - top, PX.ink)];
  for (let i = 0; i < boards; i++) {
    const y = top + 2 + i * 9;
    const right = i % 2 === 0;
    out.push(r(x, y, w, 7, PX.ink), r(x + 1, y + 1, w - 2, 5, PX.cream));
    const tipX = right ? x + w : x - 3;
    out.push(
      r(right ? tipX : tipX + 2, y + 1, 1, 5, PX.ink),
      r(tipX + 1, y + 2, 1, 3, PX.ink),
      r(right ? tipX + 2 : tipX, y + 3, 1, 1, PX.ink),
    );
  }
  return out;
}

/** Small open boat, drawn in local cells: gunwale at `y`, keel 4 rows down. */
export function boat(x: number, y: number, w: number): Rect[] {
  return [
    r(x, y, w, 1, PX.accentLight),
    r(x + 1, y + 1, w - 2, 1, PX.accent),
    r(x + 2, y + 2, w - 4, 1, PX.accent),
    r(x + 3, y + 3, w - 6, 1, PX.accentDark),
  ];
}

/** Life ring floating flat on the water. */
export const RING = [".AWWA.", "W....A", "AWWAAW"];

export const STUDENT = [
  "....HHHH....",
  "...HHHHHH...",
  "..HHHHHHHH..",
  "..HSSSSSSH..",
  "..SSESSESS..",
  "..SSSSSSSS..",
  "...SSSSSS...",
  "....SSSS....",
  "..TTTTTTTT..",
  ".TTTTTTTTTT.",
  ".TTLLLLLLTT.",
  ".SSLLLLLLSS.",
  "..PLLLOLLP..",
  "..PLLLLLLP..",
];

export const STUDENT_PALETTE = {
  H: PX.ink,
  S: PX.skin,
  E: PX.ink,
  T: PX.accent,
  L: PX.laptop,
  O: PX.accent,
  P: PX.denim,
};

export const BIRD = ["..WW..", ".WWWD.", "WWWWWY", ".WWW..", "..K..."];
export const BIRD_PALETTE = { W: PX.cream, D: PX.ink, Y: PX.accent, K: PX.accentDark };

/** Distant gull, two strokes. */
export const GULL = ["W...W", ".W.W."];
