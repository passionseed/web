/**
 * Draws the Elemental island as a PNG, in either layout:
 * - landscape, 1600 x 896 px at scale 1, for Discord;
 * - portrait, 896 x 1600 px at scale 1, for the 1080 x 1920 card (E14).
 *
 * Composed here on E04's layouts, with SHIFT's island art, DIGITS, tagRect
 * and encodePng imported read-only. SHIFT's own renderIsland is never called:
 * its layout is internal and cannot turn portrait.
 *
 * Draw order: tiles (plaza included), the well, every tree, healing's paint
 * (healing.ts: the sick look of sectors below full health), then each plot's element flag and lantern,
 * every number tag (2 x digit pixels) and the badge pips on top.
 *
 * No fonts and no names: the scene carries numbers, booleans and element keys
 * only, and render reads it field by field. Deterministic: the same scene and
 * options always give the same pixels and the same PNG bytes.
 */
import { encodePng } from "../../../bot/src/quests/island/render";
import { spriteSize } from "../../../bot/src/quests/island/scene";

import { paintHealth } from "./healing";
import { elementalLayout, plazaCentrePx, tileAt, type ElementalLayout, type Orientation } from "./layout";
import { placePlot, pipsOf, stageOf, type PlotDrawing, type PlotPlacement } from "./overlays";
import { drawTag } from "./pixelFont";
import { ElementalSceneError, type ElementalScene } from "./scene";
import { ELEMENTAL_SLOTS, SECTOR_ORDER, sectorOf, type SectorElement } from "./sectors";
import { Surface } from "./surface";

export { encodePng };

export interface ElementalRenderOptions {
  layout: Orientation;
  /**
   * Health per element sector, 0..1 (healing.ts healthFor). Absent, or 1 for
   * every element, draws the healthy island; a missing element or a value
   * that is not a number counts as 1.
   */
  health?: Partial<Record<SectorElement, number>>;
}

export interface ElementalPixels {
  /** Packed RGBA, row-major (SHIFT's packing; encodePng reads it). */
  px: Uint32Array;
  width: number;
  height: number;
  layout: ElementalLayout;
  /** Each plot as drawn, in slot order. */
  plots: PlotDrawing[];
}

export interface RenderedElementalIsland {
  png: Buffer;
  width: number;
  height: number;
  /** Always 1: the layouts are sized to be drawn at native scale. */
  scale: 1;
  orientation: Orientation;
}

/** Health per element, each clamped to 0..1; missing or not a finite number is 1. */
export function normalizeHealth(health: ElementalRenderOptions["health"]): Record<SectorElement, number> {
  return Object.fromEntries(
    SECTOR_ORDER.map((e) => {
      const v = health?.[e];
      return [e, typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 1];
    })
  ) as Record<SectorElement, number>;
}

function isElement(value: unknown): value is SectorElement {
  return typeof value === "string" && (SECTOR_ORDER as readonly string[]).includes(value);
}

/** The scene's plots, read field by field and checked, in slot order. Nothing else reaches the picture. */
function readPlots(scene: Pick<ElementalScene, "plots">): PlotPlacement[] {
  const seen = new Set<number>();
  const plots = Array.isArray(scene?.plots) ? scene.plots : [];
  return plots
    .map((p) => {
      const slot = p?.slot;
      // The detail echoes a number only: a stray string (a name passed by mistake) never reaches an error or a log.
      if (typeof slot !== "number") throw new ElementalSceneError("bad_slot", typeof slot);
      if (!Number.isInteger(slot) || slot < 1 || slot > ELEMENTAL_SLOTS) throw new ElementalSceneError("bad_slot", String(slot));
      if (seen.has(slot)) throw new ElementalSceneError("duplicate_slot", String(slot));
      seen.add(slot);
      if (!isElement(p.element)) throw new ElementalSceneError("bad_element", `slot ${slot}`);
      return { slot, element: p.element, stage: stageOf(p.stage), lit: p.lit === true, badges: pipsOf(p.badges) };
    })
    .sort((a, b) => a.slot - b.slot)
    .map((p) => ({ ...p, sector: sectorOf(p.slot)! }));
}

/**
 * The island's pixels at scale 1, before PNG encoding: for callers that
 * compose it into a bigger picture (E14 crops portrait to layout.landBoxPx).
 * Throws ElementalSceneError for a bad plot, RenderError for a missing sprite.
 */
export function renderIslandPixels(scene: Pick<ElementalScene, "plots">, options: ElementalRenderOptions): ElementalPixels {
  const orientation: Orientation = options?.layout === "portrait" ? "portrait" : "landscape";
  const layout = elementalLayout(orientation);
  const inputs = readPlots(scene);
  const plots = inputs.map((p) => placePlot(layout, p));
  const surface = new Surface(layout.width, layout.height);
  const t = layout.tile;

  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) surface.sprite(tileAt(layout, x, y), x * t, y * t);
  }
  const centre = plazaCentrePx(layout);
  const well = spriteSize("well");
  surface.sprite("well", Math.round(centre.x - well.w / 2), Math.round(centre.y - well.h / 2));

  for (const p of plots) surface.sprite(p.tree.sprite, p.tree.x, p.tree.y);

  const health = normalizeHealth(options?.health);
  if (SECTOR_ORDER.some((e) => health[e] < 1)) {
    paintHealth(surface, {
      layout,
      health,
      trees: plots.map((p) => ({ slot: p.slot, sector: p.sector, stage: p.stage, ...p.tree })),
    });
  }

  for (const p of plots) {
    surface.sprite(p.flag.sprite, p.flag.x, p.flag.y);
    if (p.lantern) surface.sprite(p.lantern.sprite, p.lantern.x, p.lantern.y);
  }
  // Tags after every tree and flag, so nothing hides a number.
  for (const p of plots) drawTag(surface, p.slot, p.tag);
  for (const p of plots) for (const pip of p.pips) surface.sprite(pip.sprite, pip.x, pip.y);

  return { px: surface.px, width: surface.width, height: surface.height, layout, plots };
}

/** The island as a PNG at scale 1, in the layout asked for. Throws like renderIslandPixels. */
export function renderIsland(scene: Pick<ElementalScene, "plots">, options: ElementalRenderOptions): RenderedElementalIsland {
  const { px, width, height, layout } = renderIslandPixels(scene, options);
  return { png: encodePng(px, width, height), width, height, scale: 1, orientation: layout.orientation };
}
