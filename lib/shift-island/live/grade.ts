/**
 * The web's colour grade for each light phase: a hand-tuned look per time of
 * day instead of one flat multiply. Web only: the bot's PNG and GIF keep
 * PHASE_TINT (lighting.ts), and day is the identity here too, so a daytime
 * canvas still matches the bot's picture pixel for pixel.
 *
 * Dawn: clear morning light, soft blue shadows, a pale mint sea.
 * Dusk: golden highlights, violet shadows, a rose-violet sea, dusty rose sand.
 * Night: moonlit blue with its colour kept (teal grass, lilac sand, deep blue
 * sea), darks lifted so it reads as a calm evening, never murky; lanterns,
 * lamps and fire stay untinted and carry the warmth.
 *
 * Pure and client-safe. Applied once per phase when the atlas is built.
 */
import { PALETTE } from "@/bot/assets/island/sprites";

import { paletteRgb, type RGB } from "./lighting";
import type { LightPhase } from "./types";

interface GradeParams {
  /** Saturation around luma: 1 keeps it. */
  sat: number;
  /** Per-channel gain. */
  gain: readonly [number, number, number];
  /** Added to darks, fading out by the highlights. */
  shadow: readonly [number, number, number];
  /** Added to highlights, fading out by the darks. */
  highlight: readonly [number, number, number];
  /** Black's new colour: darks lift toward it, white stays near white. */
  lift: readonly [number, number, number];
}

const PARAMS: Readonly<Record<Exclude<LightPhase, "day">, GradeParams>> = {
  dawn: { sat: 0.96, gain: [0.98, 0.95, 0.94], shadow: [-6, 4, 34], highlight: [18, 8, 0], lift: [16, 18, 34] },
  dusk: { sat: 1.08, gain: [1, 0.9, 0.74], shadow: [8, -6, 34], highlight: [14, 4, -12], lift: [14, 6, 30] },
  night: { sat: 0.78, gain: [0.42, 0.53, 0.78], shadow: [0, 0, 12], highlight: [8, 0, 6], lift: [12, 18, 42] },
};

/**
 * Hand-picked colours for keys a formula gets wrong: the sea (it should sit
 * below the land in value, never be the loudest thing at night) and the sand.
 */
const OVERRIDES: Readonly<Record<Exclude<LightPhase, "day">, Readonly<Record<string, string>>>> = {
  dawn: {
    w: "#5AA2B6",
    v: "#7FC0CB",
    u: "#B6E0DC",
    i: "#FFF0E4",
    s: "#F5D3B5",
    d: "#DDB59A",
  },
  // Golden light on a dusty rose sand, not a strong orange-peach.
  dusk: {
    w: "#5A72A4",
    v: "#7D8FBC",
    u: "#C4A9C4",
    i: "#F4DAC4",
    s: "#E2BDA0",
    d: "#C39C84",
  },
  // The soil keeps a warm, darker mauve and the leaves a deeper blue-green, so mounds, sprouts and
  // trees stay apart from the moonlit grass at phone size.
  night: {
    w: "#26406E",
    v: "#355A8E",
    u: "#5E86B2",
    i: "#A0ACCD",
    s: "#737BA3",
    d: "#5F6790",
    a: "#66789F",
    t: "#4F5D86",
    b: "#36304C",
    c: "#5A4F69",
    e: "#71667C",
    l: "#22405C",
  },
};

const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));

function hexRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

function formula(rgb: readonly [number, number, number], p: GradeParams): RGB {
  const luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  const l = luma / 255;
  const dark = (1 - l) ** 1.5;
  const light = l * l;
  return [0, 1, 2].map((i) => {
    const v = (luma + p.sat * (rgb[i] - luma)) * p.gain[i] + p.shadow[i] * dark + p.highlight[i] * light;
    return clamp(p.lift[i] + v * (1 - p.lift[i] / 255));
  }) as RGB;
}

/**
 * Graded colours by phase, keyed by 0xRRGGBB: the palette (overrides first)
 * up front, any other colour (a tree style's) as it is first asked for. The
 * atlas asks once per pixel, so this stays a number lookup.
 */
const byPhase = new Map<LightPhase, Map<number, RGB>>();

const rgbKey = (rgb: readonly [number, number, number]) => (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];

function phaseTable(phase: Exclude<LightPhase, "day">): Map<number, RGB> {
  let table = byPhase.get(phase);
  if (!table) {
    table = new Map();
    for (const key of Object.keys(PALETTE)) {
      const rgb = paletteRgb(key);
      if (!rgb) continue;
      const hex = OVERRIDES[phase][key];
      table.set(rgbKey(rgb), hex ? hexRgb(hex) : formula(rgb, PARAMS[phase]));
    }
    byPhase.set(phase, table);
  }
  return table;
}

/** A colour under a phase's grade. Day is the identity; a palette colour takes its hand-picked value. */
export function gradeRgb(rgb: readonly [number, number, number], phase: LightPhase): RGB {
  if (phase === "day") return [rgb[0], rgb[1], rgb[2]];
  const table = phaseTable(phase);
  const key = rgbKey(rgb);
  let out = table.get(key);
  if (!out) {
    out = formula(rgb, PARAMS[phase]);
    table.set(key, out);
  }
  return out;
}

/** A palette key under a phase's grade. */
export function gradeKey(key: string, phase: LightPhase): RGB {
  return gradeRgb(paletteRgb(key) ?? [0, 0, 0], phase);
}

const hex2 = (v: number) => v.toString(16).padStart(2, "0");
export const rgbHex = ([r, g, b]: readonly [number, number, number]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** The open sea under a phase's grade, as "#rrggbb": the world's colour around the canvas. */
export function gradedWater(phase: LightPhase): string {
  return rgbHex(gradeKey("w", phase));
}

/**
 * One multiply colour that comes closest to the grade on the island's main
 * ground (grass, sand, sea, plaza), for the daytime PNG under the canvas until
 * it draws: the first paint already sits in the hour's light.
 */
export function gradeMultiply(phase: LightPhase): RGB {
  if (phase === "day") return [255, 255, 255];
  const keys = ["g", "h", "s", "w", "a"];
  const sum = [0, 0, 0];
  for (const key of keys) {
    const day = paletteRgb(key) ?? [1, 1, 1];
    const graded = gradeKey(key, phase);
    for (let i = 0; i < 3; i++) sum[i] += graded[i] / Math.max(1, day[i]);
  }
  return sum.map((s) => clamp((s / keys.length) * 255)) as RGB;
}
