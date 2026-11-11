/**
 * Pixel dithering for the home page backdrop. Everything here is pure maths
 * on a grid of cells, so it can be tested without a canvas.
 *
 * A smooth light field is cut into a few flat brightness levels, and the
 * steps between levels are broken up with an ordered (Bayer) pattern: the
 * look of an old 16-colour screen showing a gradient.
 */

/** 8x8 Bayer matrix, as thresholds in (0, 1). */
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
].map((n) => (n + 0.5) / 64);

/** The dither threshold for the cell at (x, y). */
export function bayer(x: number, y: number): number {
  return BAYER_8[((y & 7) << 3) | (x & 7)];
}

/**
 * Which of `levels` flat steps (0 is empty) the cell at (x, y) gets for a
 * light value in [0, 1]. Neighbouring cells round up or down by the Bayer
 * pattern, so the average over a patch still matches the value.
 */
export function ditherLevel(
  value: number,
  x: number,
  y: number,
  levels: number,
): number {
  const scaled = Math.min(1, Math.max(0, value)) * (levels - 1);
  const base = Math.floor(scaled);
  return base + (scaled - base > bayer(x, y) ? 1 : 0);
}

/** Integer hash of a cell, 32 bits, stable between frames. */
export function hashCell(x: number, y: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

const unit = (x: number, y: number) => hashCell(x, y) / 4294967296;
const ease = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (from: number, to: number, n: number) =>
  ease(clamp01((n - from) / (to - from)));

/** Smooth value noise in [0, 1]. */
function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = ease(x - xi);
  const ty = ease(y - yi);
  return mix(
    mix(unit(xi, yi), unit(xi + 1, yi), tx),
    mix(unit(xi, yi + 1), unit(xi + 1, yi + 1), tx),
    ty,
  );
}

/** Three octaves of noise: big clouds with smaller wisps on them. */
function clouds(x: number, y: number): number {
  return (
    noise(x, y) * 0.57 +
    noise(x * 2.1 + 31, y * 2.1 + 17) * 0.29 +
    noise(x * 4.3 + 71, y * 4.3 + 43) * 0.14
  );
}

type Rgb = readonly [number, number, number];

const VIOLET: Rgb = [112, 88, 255];
const BLUE: Rgb = [44, 150, 255];
const ROSE: Rgb = [255, 120, 170];
const SOL: Rgb = [255, 204, 140];

/** Opaque pixel for a little-endian Uint32 view of ImageData. */
const pack = (r: number, g: number, b: number) =>
  (255 << 24) | (b << 16) | (g << 8) | r;

function shade(a: Rgb, b: Rgb, t: number, brightness: number): number {
  return pack(
    Math.round(mix(a[0], b[0], t) * brightness),
    Math.round(mix(a[1], b[1], t) * brightness),
    Math.round(mix(a[2], b[2], t) * brightness),
  );
}

export interface DitherFrame {
  /** Uint32 view of the canvas pixels, one entry per cell. */
  pixels: Uint32Array;
  cols: number;
  rows: number;
  /** CSS pixels per cell. */
  cell: number;
  /** Seconds since the page opened; 0 holds the picture still. */
  time: number;
  /** Page scroll in CSS pixels; the sky drifts past at a fraction of it. */
  scroll: number;
}

/** How bright each level of the sky is. Kept low: text sits on top of it. */
const SKY_LEVELS = [0, 0.15, 0.27, 0.42];
/** The clouds are worked out every STEP cells and blended in between. */
const STEP = 6;
/** CSS pixels across one large cloud. */
const CLOUD_SIZE = 460;

/**
 * The page backdrop: dithered clouds of violet and blue light with square
 * stars. Clouds are thinner down the middle, where the copy is.
 */
export function paintSky({
  pixels,
  cols,
  rows,
  cell,
  time,
  scroll,
}: DitherFrame): void {
  const gw = Math.ceil(cols / STEP) + 2;
  const gh = Math.ceil(rows / STEP) + 2;
  const light = new Float32Array(gw * gh);
  const hue = new Float32Array(gw * gh);
  const scale = (cell * STEP) / CLOUD_SIZE;
  const drift = (scroll * 0.18) / CLOUD_SIZE + time * 0.012;
  const wide = cols * cell >= 900;

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const nx = gx * scale;
      const ny = gy * scale + drift;
      const across = Math.abs((gx * STEP) / cols - 0.5) * 2;
      const edge = wide ? 0.42 + 0.58 * smooth(0.25, 1, across) : 0.62;
      const i = gy * gw + gx;
      light[i] = clamp01((clouds(nx, ny) - 0.4) * 2.7) * edge;
      hue[i] = smooth(
        0.34,
        0.66,
        clouds(nx * 0.6 + 90, ny * 0.6 + 140 - time * 0.005),
      );
    }
  }

  const starShift = Math.floor((scroll * 0.07) / cell);
  for (let y = 0; y < rows; y++) {
    const gy = Math.floor(y / STEP);
    const fy = (y % STEP) / STEP;
    for (let x = 0; x < cols; x++) {
      const gx = Math.floor(x / STEP);
      const fx = (x % STEP) / STEP;
      const i = gy * gw + gx;
      const value = mix(
        mix(light[i], light[i + 1], fx),
        mix(light[i + gw], light[i + gw + 1], fx),
        fy,
      );
      const level = ditherLevel(value, x, y, SKY_LEVELS.length);
      let pixel =
        level === 0
          ? 0
          : shade(VIOLET, BLUE, mix(hue[i], hue[i + 1], fx), SKY_LEVELS[level]);

      const star = hashCell(x + 7919, y + starShift);
      if ((star & 0x7ff) === 0) {
        const phase = ((star >>> 11) & 0xff) / 255;
        const twinkle =
          time === 0
            ? 1
            : 0.65 + 0.35 * Math.sin(time * (0.6 + phase) + phase * 40);
        const glow = Math.round((90 + ((star >>> 19) & 0x7f)) * twinkle);
        pixel = pack(glow, glow, Math.min(255, glow + 20));
      }
      pixels[y * cols + x] = pixel;
    }
  }
}

const DAWN_LEVELS = [0, 0.2, 0.38, 0.6, 0.85, 1];

/**
 * The closing section: a dithered sun coming up over the bottom edge, with
 * its glow fading into the sky above it.
 */
export function paintDawn({ pixels, cols, rows, cell }: DitherFrame): void {
  const width = cols * cell;
  const height = rows * cell;
  const radius = Math.max(width * 0.62, 620);
  const rise = Math.min(height * 0.3, 190);
  const cx = width / 2;
  const cy = height - rise + radius;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * cell;
      const py = y * cell;
      const fromCentre = Math.hypot(px - cx, py - cy);
      let pixel = 0;
      if (fromCentre <= radius) {
        // Inside the sun: brightest at the rim, darker towards the page edge.
        const depth = clamp01((py - (height - rise)) / rise);
        const level = ditherLevel(0.92 - depth * 0.6, x, y, DAWN_LEVELS.length);
        pixel = shade(SOL, ROSE, depth, DAWN_LEVELS[level]);
      } else {
        const reach = clamp01(1 - (fromCentre - radius) / (height * 0.62));
        const level = ditherLevel(
          reach * reach * 0.5,
          x,
          y,
          DAWN_LEVELS.length,
        );
        if (level > 0) pixel = shade(VIOLET, ROSE, reach, DAWN_LEVELS[level]);
      }
      pixels[y * cols + x] = pixel;
    }
  }
}
