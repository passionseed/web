import { ELEMENT_KEYS, type ElementKey } from "@/lib/elemental/core/elements";
import type { ElementHealth } from "@/lib/elemental/island/healing";
import type { Orientation } from "@/lib/elemental/island/layout";
import type { ElementalPublicPlot } from "@/lib/supabase/elemental";

/**
 * What /hackathon/island shows, worked out from the public plots: one level
 * bar per element and the legend. Pure, so the page and its tests agree.
 */

export interface ElementLevel {
  element: ElementKey;
  /** Counted tester entries on this element's teams (elemental_bot_totals levels). */
  level: number;
  /** Live teams on this element. */
  teams: number;
  /** Bar fill, 0..1: this level over the highest level (0 when nothing is counted yet). */
  fill: number;
}

/** The five level bars, in the fixed element order. */
export function elementLevels(plots: readonly ElementalPublicPlot[]): ElementLevel[] {
  const level = new Map<ElementKey, number>(ELEMENT_KEYS.map((e) => [e, 0]));
  const teams = new Map<ElementKey, number>(ELEMENT_KEYS.map((e) => [e, 0]));
  for (const p of plots) {
    level.set(p.element, (level.get(p.element) ?? 0) + p.counted);
    teams.set(p.element, (teams.get(p.element) ?? 0) + 1);
  }
  const top = Math.max(0, ...level.values());
  return ELEMENT_KEYS.map((element) => {
    const n = level.get(element) ?? 0;
    return { element, level: n, teams: teams.get(element) ?? 0, fill: top > 0 ? n / top : 0 };
  });
}

/** A plot number as the island's tag and the Discord legend print it: two digits at least. */
export function plotLabel(slot: number): string {
  return String(slot).padStart(2, "0");
}

/**
 * A short tag that changes whenever the picture would: the PNG URL carries it,
 * so a refreshed page fetches the new picture and an unchanged one stays cached.
 */
export function pictureVersion(plots: readonly ElementalPublicPlot[], health: Readonly<ElementHealth>): string {
  const parts = plots.map((p) => `${p.slot}:${p.element}:${p.counted}:${p.lit ? 1 : 0}:${p.badges}`);
  parts.push(ELEMENT_KEYS.map((e) => health[e]).join(","));
  // FNV-1a, 32-bit: a cache key, not a security boundary.
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** The PNG's size at scale 1 per layout (lib/elemental/island/layout.ts; a picture test holds them equal). */
export const PICTURE_SIZE: Readonly<Record<Orientation, { width: number; height: number }>> = {
  landscape: { width: 1600, height: 896 },
  portrait: { width: 896, height: 1600 },
};
