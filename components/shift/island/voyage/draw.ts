/**
 * Paints one frame of the voyage onto a 2D canvas: the sky through dusk,
 * night and dawn, the sea sliding past, the island coming out of the dark,
 * the ship with the student on the stern, and the beach falling away at the
 * start. Everything sits on a grid of square scene pixels, `layout.px` device
 * pixels each, so the art stays crisp at any devicePixelRatio. The timeline
 * (timeline.ts) says where things are; this file only paints.
 */
import { MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { PALETTE, SPRITES } from "@/bot/assets/island/sprites";
import { PHASE_TINT } from "@/lib/shift-island/live/lighting";

import { css, mix, paintBands, type Rgb } from "../shoreSea";
import { pixelRuns, SHIP, SHIP_COLORS, SHIP_H, type PixelRun } from "../shipArt";
import { ISLAND_LIGHTS, ISLAND_RUNS, ISLAND_WATER } from "./islandArt";
import {
  beachTopAt,
  islandAlphaAt,
  islandXAt,
  PASSENGER,
  shipTopAt,
  shipWaterAt,
  shipXAt,
  skyAt,
  speedAt,
  travelAt,
  wavingAt,
  type SkyMix,
  type VoyageLayout,
} from "./timeline";

function hex(value: string): Rgb {
  const n = Number.parseInt(value.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgbs = (values: readonly string[]) => values.map(hex);

/** Sky stops, overhead to the horizon. Dusk is the invite's own sky (shoreSea.ts). */
const SKY = {
  dusk: rgbs(["#0a0b1f", "#3b2458", "#7a3f6e", "#de7754"]),
  night: rgbs(["#03041a", "#080c2a", "#111a44", "#22306a"]),
  dawn: rgbs(["#1f2a5c", "#5a5a9c", "#e2899a", "#ffcf8a"]),
} as const;

/** Water stops, the horizon to the bottom of the screen. */
const WATER = {
  dusk: rgbs(["#503d6a", "#1d3a66", "#101a3a", "#1d3a66", "#315a88"]),
  night: rgbs(["#1c2350", "#101a3a", "#0a1028", "#0e1832", "#18284a"]),
  dawn: rgbs(["#b07a92", "#3d5f93", "#24406e", "#2f5487", "#4a77a8"]),
} as const;

const PAPER = hex("#f3e6c8");
const GOLD = hex("#ffc96b");
const EMBER = hex("#ff8a4c");
const DAWN_CORE = hex("#ffe6a8");
const DAWN_RIM = hex("#ffb36b");
const FOAM = mix(hex("#3f6f9e"), PAPER, 0.7);

/** The student, 10x14: the island's visitor sprite, and the same with an arm up to wave. */
const STAND = SPRITES.visitor ?? [];
const WAVE = [
  "...oooo...",
  "..obbbbo..",
  "..obbbboo.",
  "..okkkkoko",
  "..okokkoko",
  "...okko.ko",
  "..oaaaaoko",
  ".okaaaao..",
  ".okaaaao..",
  "..oaaaao..",
  "...ozzo...",
  "..ozzzo...",
  "..oz.zo...",
  "..oo.oo...",
];

const RUNS = {
  ship: pixelRuns(SHIP).filter((run) => run.key !== "w"),
  stand: pixelRuns(STAND),
  wave: pixelRuns(WAVE),
  gull: [pixelRuns(MOTION_SPRITES.gull_0), pixelRuns(MOTION_SPRITES.gull_1)],
} as const;

/** Lantern light: drawn as is, never dimmed by the night. */
const LIT_KEYS: Readonly<Record<string, string>> = { Y: "y", I: "i", F: "f" };

/** Three colours (or tints) mixed by how much of each light is in the sky. */
function blend(dusk: Rgb, night: Rgb, dawn: Rgb, sky: SkyMix): Rgb {
  const channel = (c: 0 | 1 | 2) => dusk[c] * sky.dusk + night[c] * sky.night + dawn[c] * sky.dawn;
  return [channel(0), channel(1), channel(2)];
}

function weigh(sets: { dusk: readonly Rgb[]; night: readonly Rgb[]; dawn: readonly Rgb[] }, sky: SkyMix): Rgb[] {
  return sets.dusk.map((dusk, i) => blend(dusk, sets.night[i], sets.dawn[i], sky));
}

/** The island palette under the moment's light: the game's phase tints, blended. */
function islandPalette(sky: SkyMix): Record<string, string> {
  const m = blend(PHASE_TINT.dusk, PHASE_TINT.night, PHASE_TINT.dawn, sky);
  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(PALETTE)) {
    const rgb = hex(value);
    colors[key] = css([rgb[0] * m[0], rgb[1] * m[1], rgb[2] * m[2]]);
  }
  for (const [lit, key] of Object.entries(LIT_KEYS)) colors[lit] = PALETTE[key];
  return colors;
}

function drawRuns(
  ctx: CanvasRenderingContext2D,
  runs: readonly PixelRun[],
  left: number,
  top: number,
  px: number,
  colors: Readonly<Record<string, string>>,
) {
  for (const run of runs) {
    const color = colors[run.key];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.fillRect((left + run.x) * px, (top + run.y) * px, run.w * px, px);
  }
}

/** A pixel disc centred on (cx, cy), only the rows above `clipRow`. Core inside a rim. */
function disc(ctx: CanvasRenderingContext2D, px: number, cx: number, cy: number, r: number, clipRow: number, core: Rgb, rim: Rgb) {
  for (let dy = -r; dy <= r; dy++) {
    const row = cy + dy;
    if (row >= clipRow || row < 0) continue;
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillStyle = css(rim);
    ctx.fillRect((cx - half) * px, row * px, (half * 2 + 1) * px, px);
    if (half > 1 && Math.abs(dy) < r) {
      ctx.fillStyle = css(core);
      ctx.fillRect((cx - half + 1) * px, row * px, (half * 2 - 1) * px, px);
    }
  }
}

/** A fixed pseudo-random number in [0, 1) for `n`: the same stars every frame and every visit. */
function scatter(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function sky(ctx: CanvasRenderingContext2D, layout: VoyageLayout, mixNow: SkyMix, t: number) {
  const { px, cols, horizon } = layout;
  paintBands(ctx, { px, cols }, 0, horizon, weigh(SKY, mixNow), 9);

  // Stars: a few high up at dusk, the whole sky at night, twinkling. Scattered by a fixed hash.
  const count = Math.round((cols * horizon) / 160);
  const height = Math.max(1, Math.round(horizon * 0.7));
  for (let i = 0; i < count; i++) {
    const col = Math.floor(scatter(i * 2 + 1) * cols);
    const row = Math.floor(scatter(i * 2 + 2) * height);
    const high = row < horizon * 0.25 ? 0.35 : 0;
    const strength = mixNow.night + mixNow.dusk * high + mixNow.dawn * high * 0.5;
    if (strength <= 0.02) continue;
    const twinkle = 0.55 + 0.45 * Math.sin(t * 0.004 + i * 1.7);
    ctx.fillStyle = css(PAPER, Math.min(1, strength * twinkle));
    ctx.fillRect(col * px, row * px, px, px);
  }

  // A crescent moon, high on the side the sun went down.
  if (mixNow.night > 0.02) {
    const cx = Math.round(cols * 0.76);
    const cy = Math.max(6, Math.round(horizon * 0.28));
    const r = 4;
    ctx.fillStyle = css(PAPER, mixNow.night);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const lit = dx * dx + dy * dy <= r * r;
        const shade = (dx - 2) * (dx - 2) + (dy + 1) * (dy + 1) <= r * r;
        if (lit && !shade) ctx.fillRect((cx + dx) * px, (cy + dy) * px, px, px);
      }
    }
  }

  const r = Math.max(5, Math.min(Math.round(cols * 0.07), 14));
  // The invite's sun, setting behind the ship as it leaves.
  if (mixNow.dusk > 0.02) {
    const drop = Math.round(Math.min(1, t / 3200) * (r + 2));
    disc(ctx, px, Math.round(cols * 0.74), horizon - 1 + drop, r, horizon, mix(GOLD, EMBER, 0.3), EMBER);
  }
  // Dawn comes up ahead, over the island.
  if (mixNow.dawn > 0.02) {
    const rise = Math.round((1 - mixNow.dawn) * (r + 2));
    disc(ctx, px, Math.round(cols * 0.18), horizon - 1 + rise, r, horizon, DAWN_CORE, DAWN_RIM);
  }
}

interface Wave {
  row: number;
  period: number;
  crest: number;
  parallax: number;
  alpha: number;
}

function waves(layout: VoyageLayout): { far: Wave[]; near: Wave[] } {
  const sea = layout.rows - layout.horizon;
  const below = layout.rows - layout.shipWater;
  return {
    far: [
      { row: layout.horizon + Math.max(2, Math.round(sea * 0.05)), period: 31, crest: 3, parallax: 0.25, alpha: 0.35 },
      { row: layout.horizon + Math.max(5, Math.round(sea * 0.12)), period: 37, crest: 5, parallax: 0.5, alpha: 0.5 },
    ],
    near: [
      { row: layout.shipWater + Math.max(3, Math.round(below * 0.3)), period: 43, crest: 8, parallax: 1, alpha: 0.65 },
      { row: layout.shipWater + Math.max(6, Math.round(below * 0.65)), period: 53, crest: 11, parallax: 1.5, alpha: 0.8 },
    ],
  };
}

function crests(ctx: CanvasRenderingContext2D, layout: VoyageLayout, list: readonly Wave[], t: number, mixNow: SkyMix) {
  const { px, cols } = layout;
  const travel = travelAt(t);
  const foam = css(mix(FOAM, WATER.night[2], 0.45 * mixNow.night));
  const dim = css(mix(mix(FOAM, WATER.dusk[1], 0.5), WATER.night[2], 0.45 * mixNow.night));
  list.forEach((wave, i) => {
    // The ship sails left, so the sea slides right; each row also drifts a little on its own.
    const offset = (((travel * wave.parallax + t * 0.0015) % wave.period) + wave.period) % wave.period;
    const row = wave.row + Math.round(Math.sin(t * 0.0013 + i * 2.1));
    ctx.globalAlpha = wave.alpha;
    for (let x = offset - wave.period; x < cols; x += wave.period) {
      const col = Math.round(x);
      ctx.fillStyle = foam;
      ctx.fillRect(col * px, row * px, wave.crest * px, px);
      ctx.fillStyle = dim;
      ctx.fillRect((col + 1) * px, (row - 1) * px, Math.max(1, wave.crest - 2) * px, px);
    }
  });
  ctx.globalAlpha = 1;
}

function water(ctx: CanvasRenderingContext2D, layout: VoyageLayout, mixNow: SkyMix, t: number) {
  const { px, cols, rows, horizon } = layout;
  paintBands(ctx, { px, cols }, horizon, rows, weigh(WATER, mixNow), 8);

  // The light's road on the water: the setting sun, the moon, then the rising sun.
  const roads: { col: number; color: Rgb; strength: number; width: number }[] = [
    { col: Math.round(cols * 0.74), color: GOLD, strength: mixNow.dusk, width: 12 },
    { col: Math.round(cols * 0.76), color: PAPER, strength: mixNow.night * 0.45, width: 5 },
    { col: Math.round(cols * 0.18), color: DAWN_CORE, strength: mixNow.dawn, width: 12 },
  ];
  for (const road of roads) {
    if (road.strength <= 0.02) continue;
    for (let row = horizon + 1; row < rows; row += 2) {
      const depth = (row - horizon) / (rows - horizon);
      const sway = Math.round(Math.sin(t * 0.0009 + row * 0.5) * 2);
      const width = Math.max(1, Math.round(road.width * (1.3 - depth) * (0.65 + 0.35 * Math.sin(t * 0.0017 + row * 0.9))));
      ctx.fillStyle = css(road.color, road.strength * (1 - depth * 0.8));
      ctx.fillRect((road.col - Math.floor(width / 2) + sway) * px, row * px, width * px, px);
    }
  }

  // Glints on the water, sliding past with the sea.
  const travel = travelAt(t) * 0.6;
  ctx.fillStyle = css(FOAM, 0.8);
  const count = Math.round(cols / 6);
  for (let i = 0; i < count; i++) {
    const speed = 1.3 + (i % 5) * 0.37;
    if (Math.sin(t * 0.001 * speed + i * 1.7) <= 0.82) continue;
    const col = Math.round((((scatter(i + 500) * cols + travel) % cols) + cols) % cols);
    const row = horizon + 2 + Math.floor(scatter(i + 900) * Math.max(1, rows - horizon - 4));
    ctx.fillRect(col * px, row * px, px, px);
  }
}

function island(ctx: CanvasRenderingContext2D, layout: VoyageLayout, mixNow: SkyMix, palette: Record<string, string>, t: number) {
  const alpha = islandAlphaAt(t);
  if (alpha <= 0) return;
  const { px } = layout;
  const left = islandXAt(layout, t);
  const top = layout.islandWater - ISLAND_WATER;
  ctx.globalAlpha = alpha;
  drawRuns(ctx, ISLAND_RUNS, left, top, px, palette);

  // Lantern glow: a soft pixel halo, strongest at night, a breath of flicker.
  const glow = (mixNow.night + mixNow.dusk * 0.4 + mixNow.dawn * 0.25) * alpha;
  if (glow > 0.02) {
    const flicker = 0.85 + 0.15 * Math.sin(t * 0.011);
    for (const light of ISLAND_LIGHTS) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d === 0 || d > 3) continue;
          ctx.globalAlpha = (glow * flicker * (4 - d)) / 12;
          ctx.fillStyle = css(GOLD);
          ctx.fillRect((left + light.x + dx) * px, (top + light.y + dy) * px, px, px);
        }
      }
    }
  }

  // Gulls over the island once it is light: land is near.
  if (mixNow.dawn > 0.2) {
    ctx.globalAlpha = Math.min(1, mixNow.dawn) * alpha;
    const frame = RUNS.gull[Math.floor(t / 220) % 2];
    drawRuns(ctx, frame, left + 64 + Math.round(Math.sin(t / 700) * 6), top + 4 + Math.round(Math.cos(t / 500) * 2), px, palette);
    drawRuns(ctx, frame, left + 82 + Math.round(Math.sin(t / 650 + 1) * 5), top + 12 + Math.round(Math.cos(t / 560 + 2) * 2), px, palette);
  }
  ctx.globalAlpha = 1;
}

function ship(ctx: CanvasRenderingContext2D, layout: VoyageLayout, mixNow: SkyMix, palette: Record<string, string>, t: number) {
  const { px } = layout;
  const left = shipXAt(layout, t);
  const top = shipTopAt(layout, t, SHIP_H);
  const waterRow = shipWaterAt(layout, t) + 1;
  const speed = Math.max(0, speedAt(t));

  // Wake: foam trailing off the stern, longer the faster she goes.
  const length = Math.round(26 * speed);
  if (length > 0) {
    for (let dx = 0; dx < length; dx++) {
      if ((dx + Math.floor(t / 90)) % 3 === 0) continue;
      ctx.fillStyle = css(FOAM, 0.75 * (1 - dx / length));
      ctx.fillRect((left + 34 + dx) * px, waterRow * px, px, px);
      if (dx < length / 2 && (dx + Math.floor(t / 130)) % 4 === 0) ctx.fillRect((left + 36 + dx) * px, (waterRow + 1) * px, px, px);
    }
    // Spray at the bow.
    if (speed > 0.4 && Math.floor(t / 150) % 2 === 0) {
      ctx.fillStyle = css(FOAM, 0.85);
      ctx.fillRect((left + 3) * px, (waterRow - 1) * px, 2 * px, px);
      ctx.fillRect((left + 1) * px, (waterRow - 2) * px, px, px);
    }
  } else {
    // At rest: the glints under the hull, as on the invite's beach.
    ctx.fillStyle = SHIP_COLORS.w;
    for (let x = 8; x < 32; x += 3) ctx.fillRect((left + x) * px, waterRow * px, px, px);
  }

  // The sails only catch the sun at dusk and dawn.
  const colors = { ...SHIP_COLORS, S: css(mix(hex("#ffd6a0"), hex("#c9aa96"), mixNow.night)) };
  drawRuns(ctx, RUNS.ship, left, top, px, colors);

  // The stern lantern glows in the dark.
  if (mixNow.night > 0.05) {
    ctx.globalAlpha = 0.35 * mixNow.night;
    ctx.fillStyle = css(GOLD);
    ctx.fillRect((left + 35) * px, (top + 13) * px, 3 * px, 3 * px);
    ctx.globalAlpha = 1;
  }

  // The student on the cabin roof, waving back at the beach and again on arrival.
  drawRuns(ctx, wavingAt(t) ? RUNS.wave : RUNS.stand, left + PASSENGER.x, top + PASSENGER.y, px, palette);
}

function beach(ctx: CanvasRenderingContext2D, layout: VoyageLayout, t: number) {
  const { px, cols, rows } = layout;
  const top = beachTopAt(layout, t);
  if (top >= rows) return;
  const sand = hex(PALETTE.s);
  const wet = hex(PALETTE.d);
  const dusk = PHASE_TINT.dusk;
  const lit = (rgb: Rgb) => css([rgb[0] * dusk[0], rgb[1] * dusk[1], rgb[2] * dusk[2]]);

  // Foam washing up the sand, in and out.
  ctx.fillStyle = css(FOAM, 0.85);
  for (let col = 0; col < cols; col++) {
    const reach = 1 + Math.round(1 + Math.sin(col * 0.35 + t * 0.0011) + Math.sin(col * 0.13 - t * 0.0007));
    ctx.fillRect(col * px, (top - reach) * px, px, reach * px);
  }
  ctx.fillStyle = lit(wet);
  ctx.fillRect(0, top * px, cols * px, 2 * px);
  ctx.fillStyle = lit(sand);
  ctx.fillRect(0, (top + 2) * px, cols * px, (rows - top - 2) * px);
  // A checker row where wet sand meets dry.
  ctx.fillStyle = lit(wet);
  for (let col = top % 2; col < cols; col += 2) ctx.fillRect(col * px, (top + 2) * px, px, px);
}

/** One frame at `t` ms. The caller sizes the canvas to `layout.cols x layout.rows` scene pixels. */
export function drawVoyage(ctx: CanvasRenderingContext2D, layout: VoyageLayout, t: number) {
  const mixNow = skyAt(t);
  const palette = islandPalette(mixNow);
  ctx.globalAlpha = 1;
  sky(ctx, layout, mixNow, t);
  water(ctx, layout, mixNow, t);
  const { far, near } = waves(layout);
  crests(ctx, layout, far, t, mixNow);
  island(ctx, layout, mixNow, palette, t);
  ship(ctx, layout, mixNow, palette, t);
  crests(ctx, layout, near, t, mixNow);
  beach(ctx, layout, t);
}
