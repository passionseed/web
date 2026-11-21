/**
 * The Elemental island as data: team rows in, a scene the compositor draws.
 *
 * The input is the island state's rows ({slot, element, counted, lit,
 * badges}) and nothing else: no project names, no Discord ids, no people.
 * Names and the project legend travel in message text, never in the picture.
 * Rows with extra fields are read field by field, so nothing else can reach
 * the scene.
 *
 * The island size is fixed (200 slots, SHIFT's 100 x 56 tile island), so the
 * picture never resizes as teams arrive and every plot keeps its place.
 * Orientation is chosen when drawing (layout.ts); the scene is the same for
 * both. Pure and deterministic.
 */
import { elementalLayout } from "./layout";
import { ELEMENTAL_SLOTS, SECTOR_ORDER, sectorOf, type SectorElement } from "./sectors";

/** Highest tree stage (SHIFT's stage_7). */
export const MAX_STAGE = 7;

/** One team's plot, as the island state gives it. Numbers, booleans and an element key only. */
export interface ElementalPlotInput {
  /** 1..200, unique. */
  slot: number;
  /** The team's element (its flag colour). */
  element: SectorElement;
  /** Counted tester entries; the tree grows one stage per entry up to stage 7. */
  counted: number;
  /** The team's lantern is lit. */
  lit: boolean;
  /** Badges earned (badge pips), 0 or more. */
  badges: number;
}

/** Most badge pips drawn on one plot. */
export const MAX_BADGE_PIPS = 5;

export interface ElementalScenePlot {
  slot: number;
  element: SectorElement;
  /** The sector the slot sits in; differs from element for a team that overflowed its own sector. */
  sector: SectorElement;
  /** Tree stage 0..7: min(7, counted). */
  stage: number;
  counted: number;
  lit: boolean;
  /** Pips to draw: 0..MAX_BADGE_PIPS. */
  badges: number;
}

export interface ElementalScene {
  v: 1;
  /** The fixed island: always 200 slots on SHIFT's 100 x 56 tile landscape grid (portrait transposes it). */
  slots: number;
  cols: number;
  rows: number;
  /** Plots in slot order. */
  plots: ElementalScenePlot[];
  /** Teams per element, in SECTOR_ORDER keys. */
  teams: Record<SectorElement, number>;
}

/** Why a scene could not be built. The detail is a slot number or a field name, never student text. */
export class ElementalSceneError extends Error {
  constructor(
    readonly code: "bad_slot" | "duplicate_slot" | "bad_element" | "bad_count",
    readonly detail: string
  ) {
    super(`elemental scene failed: ${code} (${detail})`);
    this.name = "ElementalSceneError";
  }
}

function count(value: unknown, slot: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new ElementalSceneError("bad_count", `slot ${slot} ${field}`);
  return Math.floor(value);
}

/** Team rows to the scene. Throws ElementalSceneError on a slot outside 1..200, a repeated slot or an unknown element. */
export function buildElementalScene(rows: readonly ElementalPlotInput[]): ElementalScene {
  const seen = new Set<number>();
  const teams = Object.fromEntries(SECTOR_ORDER.map((e) => [e, 0])) as Record<SectorElement, number>;
  const plots = rows.map((row): ElementalScenePlot => {
    const slot = row.slot;
    if (!Number.isInteger(slot) || slot < 1 || slot > ELEMENTAL_SLOTS) throw new ElementalSceneError("bad_slot", String(slot));
    if (seen.has(slot)) throw new ElementalSceneError("duplicate_slot", String(slot));
    seen.add(slot);
    if (!(SECTOR_ORDER as readonly string[]).includes(row.element)) throw new ElementalSceneError("bad_element", `slot ${slot}`);
    const counted = count(row.counted, slot, "counted");
    teams[row.element] += 1;
    return {
      slot,
      element: row.element,
      sector: sectorOf(slot)!,
      stage: Math.min(MAX_STAGE, counted),
      counted,
      lit: row.lit === true,
      badges: Math.min(MAX_BADGE_PIPS, count(row.badges, slot, "badges")),
    };
  });
  plots.sort((a, b) => a.slot - b.slot);
  const { cols, rows: tileRows } = elementalLayout("landscape");
  return { v: 1, slots: ELEMENTAL_SLOTS, cols, rows: tileRows, plots, teams };
}
