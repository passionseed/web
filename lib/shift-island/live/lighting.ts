/**
 * Light over the living island: the phase of the day in Asia/Bangkok, and the
 * RGB multiply each phase applies to the island's palette. Pure and
 * client-safe. Day is the identity, so a daytime island matches the bot's PNG
 * pixel for pixel.
 */
import { PALETTE } from "@/bot/assets/island/sprites";

import type { LightPhase } from "./types";

/** Bangkok is UTC+7 all year (no daylight saving). */
const BANGKOK_OFFSET_MIN = 7 * 60;
const DAY_MIN = 24 * 60;

/** Minutes since midnight in Bangkok, whatever the device's own zone. */
export function bangkokMinutes(nowMs: number): number {
  const minutes = Math.floor(nowMs / 60_000) + BANGKOK_OFFSET_MIN;
  return ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

/** Night until 05:30, dawn until 07:00, day until 17:30, dusk until 19:00, then night. */
export function bangkokPhase(nowMs: number): LightPhase {
  const m = bangkokMinutes(nowMs);
  if (m < 5 * 60 + 30) return "night";
  if (m < 7 * 60) return "dawn";
  if (m < 17 * 60 + 30) return "day";
  if (m < 19 * 60) return "dusk";
  return "night";
}

/** Per-phase multiply on R, G and B. Lanterns, lamps, tags and the pin are drawn untinted. */
export const PHASE_TINT: Readonly<Record<LightPhase, readonly [number, number, number]>> = {
  dawn: [0.97, 0.85, 0.82],
  day: [1, 1, 1],
  dusk: [0.93, 0.76, 0.74],
  night: [0.4, 0.47, 0.72],
};

export type RGB = [number, number, number];

/** A PALETTE colour as RGB; null for a key the palette does not have. */
export function paletteRgb(key: string): RGB | null {
  const hex = PALETTE[key];
  const m = hex ? /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex) : null;
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** A colour under a phase's light, rounded and clamped to 0..255. */
export function tint(rgb: readonly [number, number, number], phase: LightPhase): RGB {
  const m = PHASE_TINT[phase];
  return [0, 1, 2].map((i) => Math.min(255, Math.max(0, Math.round(rgb[i] * m[i])))) as RGB;
}

const hex2 = (v: number) => v.toString(16).padStart(2, "0");

/** The open sea's colour under a phase, as "#rrggbb": the viewport's background around the picture. */
export function waterColor(phase: LightPhase): string {
  const [r, g, b] = tint(paletteRgb("w") ?? [67, 142, 172], phase);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}
