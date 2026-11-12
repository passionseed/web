/**
 * Drawing for the shore scene's sea: a dusk sky in stepped bands, a sun on
 * the horizon, and water with three rows of moving wave crests. Everything is
 * drawn on a grid of square "pixels" sized in whole device pixels, so the art
 * stays crisp at any devicePixelRatio. The sky, sun and water bands never
 * move, so they are drawn once per resize onto an offscreen layer.
 */

type Rgb = readonly [number, number, number];

export type Sea = {
  /** Size of one sea pixel, in device pixels. */
  px: number;
  cols: number;
  rows: number;
  horizon: number;
  /** First row hidden by the sand strip. */
  shore: number;
  sunCol: number;
  sunRadius: number;
  backdrop: HTMLCanvasElement;
  waves: readonly Wave[];
  sparkles: readonly Sparkle[];
  colors: {
    gold: string;
    ember: string;
    foam: string;
    foamDim: string;
    shallow: string;
  };
};

type Wave = { row: number; period: number; crest: number; speed: number; alpha: number };
type Sparkle = { col: number; row: number; speed: number; phase: number };

/** Sea pixel size in CSS pixels: chunkier on wide screens. */
const PIXEL_CSS = { phone: 4, wide: 5 } as const;

function token(el: Element, name: string, fallback: string): Rgb {
  const value = getComputedStyle(el).getPropertyValue(name).trim() || fallback;
  const hex = value.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function css([r, g, b]: Rgb, alpha = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

/** Colour at `t` (0 to 1) along a ramp of stops, cut into `bands` flat steps. */
function banded(stops: readonly Rgb[], t: number, bands: number): Rgb {
  const stepped = Math.min(bands - 1, Math.floor(t * bands)) / (bands - 1);
  const scaled = stepped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  return mix(stops[i], stops[i + 1], scaled - i);
}

/** Fills rows [from, to) with banded colour and a checker dither at each step. */
function paintBands(
  ctx: CanvasRenderingContext2D,
  sea: Pick<Sea, "px" | "cols">,
  from: number,
  to: number,
  stops: readonly Rgb[],
  bands: number,
) {
  const { px, cols } = sea;
  let previous: Rgb | null = null;
  for (let row = from; row < to; row++) {
    const color = banded(stops, (row - from) / Math.max(1, to - from - 1), bands);
    ctx.fillStyle = css(color);
    ctx.fillRect(0, row * px, cols * px, px);
    const changed = previous && (previous[0] !== color[0] || previous[1] !== color[1] || previous[2] !== color[2]);
    if (previous && changed) {
      // One row of the previous band's colour on every other pixel softens the step.
      ctx.fillStyle = css(previous);
      for (let col = row % 2; col < cols; col += 2) ctx.fillRect(col * px, row * px, px, px);
    }
    previous = color;
  }
}

/** Sizes the grid for the canvas and paints the parts of the sea that never move. */
export function prepareSea(
  canvas: HTMLCanvasElement,
  { dpr, cssWidth, sand }: { dpr: number; cssWidth: number; sand: number },
): Sea {
  const px = Math.max(1, Math.round((cssWidth >= 768 ? PIXEL_CSS.wide : PIXEL_CSS.phone) * dpr));
  const cols = Math.ceil(canvas.width / px);
  const rows = Math.ceil(canvas.height / px);
  const horizon = Math.round(rows * 0.4);
  // Round up so the water always reaches under the sand strip, leaving no seam.
  const shore = Math.ceil(rows * (1 - sand));
  const water = shore - horizon;

  const night = token(canvas, "--isl-night", "#0a0b1f");
  const deep = token(canvas, "--isl-deep", "#101a3a");
  const seaColor = token(canvas, "--isl-sea", "#1d3a66");
  const seaLight = token(canvas, "--isl-sea-light", "#3f6f9e");
  const violet = token(canvas, "--isl-violet", "#3b2458");
  const dusk = token(canvas, "--isl-dusk", "#7a3f6e");
  const ember = token(canvas, "--isl-ember", "#ff8a4c");
  const gold = token(canvas, "--isl-gold", "#ffc96b");
  const paper = token(canvas, "--isl-paper", "#f3e6c8");

  const backdrop = document.createElement("canvas");
  backdrop.width = canvas.width;
  backdrop.height = canvas.height;
  const ctx = backdrop.getContext("2d");

  const sunRadius = Math.max(5, Math.min(Math.round(cols * 0.09), 22));
  const sunCol = Math.round(cols * 0.7);

  if (ctx) {
    const grid = { px, cols };
    // Sky: night overhead, through violet and dusk, to ember at the horizon.
    paintBands(ctx, grid, 0, horizon, [night, violet, dusk, mix(dusk, ember, 0.75)], 9);

    // A few fixed stars in the darkest bands.
    ctx.fillStyle = css(paper, 0.7);
    for (let i = 0; i < Math.round(cols / 9); i++) {
      const col = (i * 37 + 11) % cols;
      const row = (i * 23 + 5) % Math.max(1, Math.round(horizon * 0.4));
      ctx.fillRect(col * px, row * px, px, px);
    }

    // Sun: half a pixel disc sitting on the horizon, gold inside an ember rim.
    for (let dy = 0; dy <= sunRadius; dy++) {
      const half = Math.round(Math.sqrt(sunRadius * sunRadius - dy * dy));
      const row = horizon - 1 - dy;
      ctx.fillStyle = css(ember);
      ctx.fillRect((sunCol - half) * px, row * px, (half * 2 + 1) * px, px);
      if (half > 1) {
        ctx.fillStyle = css(mix(gold, ember, dy / sunRadius / 2));
        ctx.fillRect((sunCol - half + 1) * px, row * px, (half * 2 - 1) * px, px);
      }
    }

    // Water: the sky's glow at the horizon, deep in the middle, lighter in the shallows.
    paintBands(
      ctx,
      grid,
      horizon,
      shore,
      [mix(dusk, seaColor, 0.45), seaColor, deep, seaColor, mix(seaColor, seaLight, 0.6)],
      8,
    );
    // Below the shore line the sand covers the water; fill it anyway so a
    // rounding pixel never shows the page through.
    ctx.fillStyle = css(mix(seaColor, seaLight, 0.6));
    ctx.fillRect(0, shore * px, cols * px, (rows - shore) * px);
  }

  const waves: Wave[] = [
    { row: horizon + Math.round(water * 0.22), period: 29, crest: 3, speed: 2.2, alpha: 0.45 },
    { row: horizon + Math.round(water * 0.5), period: 37, crest: 5, speed: -3.4, alpha: 0.6 },
    { row: horizon + Math.round(water * 0.78), period: 43, crest: 8, speed: 4.6, alpha: 0.75 },
  ];

  const sparkles: Sparkle[] = Array.from({ length: Math.round(cols / 6) }, (_, i) => ({
    col: (i * 53 + 7) % cols,
    row: horizon + 2 + ((i * 31) % Math.max(1, water - 4)),
    speed: 1.3 + (i % 5) * 0.37,
    phase: i * 1.7,
  }));

  return {
    px,
    cols,
    rows,
    horizon,
    shore,
    sunCol,
    sunRadius,
    backdrop,
    waves,
    sparkles,
    colors: {
      gold: css(gold, 0.85),
      ember: css(ember, 0.6),
      foam: css(mix(seaLight, paper, 0.7), 1),
      foamDim: css(mix(seaLight, paper, 0.35), 1),
      shallow: css(mix(seaLight, paper, 0.55), 0.85),
    },
  };
}

/** Draws the sea at time `t` seconds. `t = 0` is the still frame for reduced motion. */
export function drawSeaFrame(ctx: CanvasRenderingContext2D, sea: Sea, t: number) {
  const { px, cols, horizon, shore, sunCol, sunRadius, colors } = sea;
  ctx.globalAlpha = 1;
  ctx.drawImage(sea.backdrop, 0, 0);

  // The sun's road on the water: broken gold dashes that narrow with depth.
  for (let row = horizon + 1; row < shore; row += 2) {
    const depth = (row - horizon) / (shore - horizon);
    const sway = Math.round(Math.sin(t * 0.9 + row * 0.5) * 2);
    const width = Math.max(1, Math.round(sunRadius * (1.4 - depth) * (0.65 + 0.35 * Math.sin(t * 1.7 + row * 0.9))));
    ctx.fillStyle = depth < 0.4 ? colors.gold : colors.ember;
    ctx.globalAlpha = 1 - depth * 0.75;
    ctx.fillRect((sunCol - Math.floor(width / 2) + sway) * px, row * px, width * px, px);
  }
  ctx.globalAlpha = 1;

  // Twinkles on the water.
  ctx.fillStyle = colors.foamDim;
  for (const s of sea.sparkles) {
    if (Math.sin(t * s.speed + s.phase) > 0.82) ctx.fillRect(s.col * px, s.row * px, px, px);
  }

  // Three rows of crests sliding sideways at their own pace, bobbing a pixel.
  sea.waves.forEach((wave, i) => {
    const offset = (((t * wave.speed) % wave.period) + wave.period) % wave.period;
    const bob = Math.round(Math.sin(t * 1.3 + i * 2.1));
    const row = wave.row + bob;
    ctx.globalAlpha = wave.alpha;
    for (let x = offset - wave.period; x < cols; x += wave.period) {
      const col = Math.round(x);
      ctx.fillStyle = colors.foam;
      ctx.fillRect(col * px, row * px, wave.crest * px, px);
      ctx.fillStyle = colors.foamDim;
      ctx.fillRect((col + 1) * px, (row - 1) * px, Math.max(1, wave.crest - 2) * px, px);
    }
  });
  ctx.globalAlpha = 1;

  // Foam where the water meets the sand, washing in and out.
  ctx.fillStyle = colors.shallow;
  for (let col = 0; col < cols; col++) {
    const reach = 1 + Math.round(1 + Math.sin(col * 0.35 + t * 1.1) + Math.sin(col * 0.13 - t * 0.7));
    ctx.fillRect(col * px, (shore - reach) * px, px, reach * px);
  }
}
