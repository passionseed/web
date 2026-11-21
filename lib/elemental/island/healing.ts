/**
 * Healing island states: how healthy each element's sector looks.
 *
 * STUB (E10). Every element is fully healthy and nothing is drawn. The bot's
 * schedule (E19) always calls healthFor and passes the result to
 * renderIsland's `health` option, so E25 turns healing on by replacing the
 * bodies of healthFor and paintHealth in this one file. Keep the signatures.
 *
 * E25's rule, for reference: health(element) = min(1, floor(counted /
 * (heal_per_team x teams_in_element) x steps) / steps), and all 1 when
 * settings.healing_enabled is false.
 */
import type { ElementalLayout } from "./layout";
import { SECTOR_ORDER, type SectorElement } from "./sectors";
import type { Surface } from "./surface";

/** Health per element sector, 0 (sick) to 1 (healthy). */
export type ElementHealth = Record<SectorElement, number>;

/** One element's tally for healing: counted tester entries and active teams. Numbers only. */
export interface ElementTally {
  counted: number;
  teams: number;
}

/** Per-element tallies (E19 builds these from elemental_bot_totals). A missing element counts as 0 and 0. */
export type HealthTotals = Partial<Record<SectorElement, ElementTally>>;

/** The healing fields of a guild's elemental_settings row; a whole row may be passed, only these are read. */
export interface HealthSettings {
  healing_enabled?: boolean | null;
  heal_per_team?: number | null;
  heal_steps?: number | null;
}

/** Every element at full health. */
export function fullHealth(): ElementHealth {
  return Object.fromEntries(SECTOR_ORDER.map((e) => [e, 1])) as ElementHealth;
}

/** Each element's health for tonight's picture. Stub: always fully healthy. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function healthFor(totals: HealthTotals, settings: HealthSettings): ElementHealth {
  return fullHealth();
}

/** A tree as healing sees it: where it stands and which sector's health applies. */
export interface HealthTree {
  slot: number;
  sector: SectorElement;
  stage: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What paintHealth may read: the layout drawn, each sector's health and the trees. */
export interface HealthPaint {
  layout: ElementalLayout;
  health: Readonly<ElementHealth>;
  trees: readonly HealthTree[];
}

/**
 * Paints the sick look over sectors below full health. renderIsland calls it
 * after the ground, the well and the trees, and before the flags, lanterns,
 * number tags and badge pips (so those stay bright), and only when some
 * element is below 1. Stub: draws nothing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function paintHealth(surface: Surface, paint: HealthPaint): void {
  // E25 replaces this body.
}
