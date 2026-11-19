/**
 * The web's colour grade for the living island ("lantern glow"): how each
 * palette colour looks in each light, warm and golden by day, rosy at dusk,
 * moonlit (never murky) at night. Web only: the bot's PNG and GIF keep
 * PHASE_TINT, so lighting.ts and the shared draw code are untouched.
 *
 * Built once per phase into the atlas (buildAtlasData's grade), so it costs
 * nothing per frame. Pure and client-safe.
 */
import { PALETTE } from "@/bot/assets/island/sprites";

import { paletteRgb, type RGB } from "./lighting";
import type { LightPhase } from "./types";

type Triple = readonly [number, number, number];

interface Grade {
  /** White balance and exposure, per channel. */
  gain: Triple;
  /** Saturation, 1 keeps it. */
  sat: number;
  /** Contrast round mid grey, 1 keeps it. */
  contrast: number;
  /** Per channel multiply for the darks and for the lights, blended by luminance (split toning). */
  shadows: Triple;
  highlights: Triple;
  /** Lifts the blacks towards this colour, 0..255. */
  lift: Triple;
}

/**
 * A few palette keys warmed in every light: the ink outline from cold
 * slate to a plum brown, and the plaza's cool grey stone to sandstone, so
 * the place where people gather is the warmest ground on the island.
 */
const WARM_BASE: Readonly<Record<string, string>> = {
  o: "#3b3340",
  a: "#cfc6b0",
  t: "#a59b89",
  z: "#6f6467",
};

const GRADES: Readonly<Record<LightPhase, Grade>> = {
  // Late morning sun: a touch of gold in the lights, warm darks.
  day: { gain: [1.02, 1.0, 0.95], sat: 1.02, contrast: 1.0, shadows: [1.0, 0.96, 0.98], highlights: [1.02, 1.0, 0.96], lift: [0, 0, 0] },
  // First light: peach on top, lavender in the shade, a soft haze.
  dawn: { gain: [1.0, 0.95, 0.96], sat: 1.0, contrast: 0.94, shadows: [0.88, 0.86, 1.04], highlights: [1.06, 0.97, 0.92], lift: [14, 10, 20] },
  // Golden hour: honey lights, rosy violet shade.
  dusk: { gain: [1.0, 0.88, 0.76], sat: 0.98, contrast: 1.0, shadows: [0.84, 0.72, 0.92], highlights: [1.06, 0.96, 0.82], lift: [12, 4, 18] },
  // Moonlight: deep blue violet with lifted, plum-tinted blacks: a cosy evening, not mud.
  night: { gain: [0.31, 0.35, 0.58], sat: 0.9, contrast: 1.08, shadows: [1.04, 0.9, 1.0], highlights: [1.1, 1.0, 1.0], lift: [12, 10, 28] },
};

/**
 * Sea keys tuned by hand after the grade: copper and lilac at dusk, an
 * inky blue at night that stays quieter than the land.
 */
const KEY_OVERRIDES: Readonly<Partial<Record<LightPhase, Readonly<Record<string, string>>>>> = {
  dusk: { w: "#4a6a8c", v: "#7b8eab", u: "#c7a7a6" },
  night: { w: "#1f2f52", v: "#2b4168", u: "#3d5579" },
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const luma = (c: Triple) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function hexRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
}

/** Any colour under a phase's grade, rounded and clamped. */
export function gradeRgb(rgb: Triple, phase: LightPhase): RGB {
  const g = GRADES[phase];
  let c = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  const l = luma(c as unknown as Triple);
  c = c.map((v) => l + (v - l) * g.sat);
  c = c.map((v) => 0.5 + (v - 0.5) * g.contrast);
  const t = smooth(0.18, 0.82, l);
  c = c.map((v, i) => v * (g.shadows[i] + (g.highlights[i] - g.shadows[i]) * t) * g.gain[i]);
  c = c.map((v, i) => g.lift[i] / 255 + clamp01(v) * (1 - g.lift[i] / 255));
  return c.map((v) => Math.round(clamp01(v) * 255)) as RGB;
}

/** A palette key's colour in a phase, with the warm base and hand overrides. */
export function gradeKey(key: string, phase: LightPhase): RGB | null {
  const override = KEY_OVERRIDES[phase]?.[key];
  if (override) return hexRgb(override);
  const base = WARM_BASE[key];
  const rgb = base ? hexRgb(base) : paletteRgb(key);
  return rgb ? gradeRgb(rgb, phase) : null;
}

/**
 * The atlas's grade for a phase: palette keys by key, anything else (tree
 * style colours, looked up per pixel) by value, each colour worked out once.
 */
export function atlasGrade(phase: LightPhase): (rgb: RGB, key: string | null) => RGB {
  const byKey = new Map<string, RGB>();
  const byValue = new Map<number, RGB>();
  return (rgb, key) => {
    if (key && key in PALETTE) {
      let out = byKey.get(key);
      if (!out) byKey.set(key, (out = gradeKey(key, phase) ?? gradeRgb(rgb, phase)));
      return out;
    }
    const packed = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    let out = byValue.get(packed);
    if (!out) byValue.set(packed, (out = gradeRgb(rgb, phase)));
    return out;
  };
}

/**
 * The plots' number tags in each light: warm ink and cream digits instead of
 * the PNG's black and white, dimmed at night so they stop being the
 * brightest thing on the island (the pin stays bright).
 */
export const TAG_LIGHT: Readonly<Record<LightPhase, { fill: string; ink: string }>> = {
  day: { fill: "rgba(46,36,42,0.88)", ink: "#fff4de" },
  dawn: { fill: "rgba(48,40,56,0.86)", ink: "#fbe9de" },
  dusk: { fill: "rgba(50,30,44,0.86)", ink: "#ffe4c0" },
  night: { fill: "rgba(24,20,34,0.8)", ink: "#cdbf9f" },
};

const hex2 = (v: number) => v.toString(16).padStart(2, "0");

/** The open sea's colour in a phase, "#rrggbb": the viewport's background round the picture. */
export function gradedWater(phase: LightPhase): string {
  const [r, g, b] = gradeKey("w", phase) ?? [67, 142, 172];
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** The grade as one multiply colour, for the daytime PNG shown before the canvas: a rough match of the land's light. */
export function gradeMultiply(phase: LightPhase): string {
  const probe = paletteRgb("g") ?? [145, 183, 107];
  const out = gradeKey("g", phase) ?? probe;
  const m = out.map((v, i) => Math.min(255, Math.round((v / Math.max(1, probe[i])) * 255)));
  return `#${hex2(m[0])}${hex2(m[1])}${hex2(m[2])}`;
}
