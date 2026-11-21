/**
 * Where each Elemental plot's pieces go, in native pixels at scale 1: the
 * tree, the element flag, the lantern, the plot number tag and the badge
 * pips. Pure geometry; render.ts draws it and tests check it.
 *
 * Every piece stays inside the plot's own cell, 32 px wide (the tree's
 * width) and from the tree's top to 24 px below the soil line, so no plot
 * ever covers a neighbour in either layout (landscape rows are 48 px apart
 * with a 32 px stagger; portrait columns are 48 px apart and rows 64 px):
 *
 *   flag (left, planted beside the trunk) | tree | lantern (right, on the soil)
 *   number tag (top edge on the soil line, 2 x digit pixels)
 *   badge pips (one row under the tag)
 */
import type { SceneRect } from "../../../bot/src/quests/island/scene";
import { flagSprite } from "../../../bot/assets/elemental/sprites";

import { elementalLayout, treeBase, type ElementalLayout, type Orientation } from "./layout";
import { MAX_BADGE_PIPS, MAX_STAGE, type ElementalScene } from "./scene";
import { TAG_GLYPH, plotTag } from "./pixelFont";
import type { SectorElement } from "./sectors";
import { spriteBox } from "./surface";

/** A sprite to draw: its key and top-left corner. */
export interface PlacedSprite {
  sprite: string;
  x: number;
  y: number;
}

/** One plot as drawn. */
export interface PlotDrawing {
  slot: number;
  element: SectorElement;
  /** The sector the slot sits in (where healing reads its health). */
  sector: SectorElement;
  stage: number;
  tree: PlacedSprite & { w: number; h: number };
  flag: PlacedSprite;
  /** Only a lit lantern is drawn. */
  lantern: PlacedSprite | null;
  tag: SceneRect;
  pips: PlacedSprite[];
  /** Everything above, as one box. */
  box: SceneRect;
}

/** Flag foot this many px above the soil line; its pole stands at the tree box's left edge. */
const FLAG_LIFT = 4;
/** Lantern foot this many px above the soil line, at the tree box's right edge. */
const LANTERN_LIFT = 2;
/** Badge pips: horizontal step between pips, and the gap under the tag. */
const PIP_STEP = 6;
const PIP_GAP = 0;

function union(rects: readonly SceneRect[]): SceneRect {
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.w));
  const y1 = Math.max(...rects.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function rectOf(p: PlacedSprite): SceneRect {
  const { w, h } = spriteBox(p.sprite);
  return { x: p.x, y: p.y, w, h };
}

/** Clamps a stage to 0..MAX_STAGE (anything not a finite number is 0). */
export function stageOf(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(Math.max(n, 0), MAX_STAGE);
}

/** Clamps a badge count to 0..MAX_BADGE_PIPS (anything not a finite number is 0). */
export function pipsOf(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(Math.max(n, 0), MAX_BADGE_PIPS);
}

/** What placePlot reads from a scene plot. */
export interface PlotPlacement {
  slot: number;
  element: SectorElement;
  sector: SectorElement;
  stage: number;
  lit: boolean;
  badges: number;
}

/** One plot's drawing in this layout. */
export function placePlot(layout: ElementalLayout, plot: PlotPlacement): PlotDrawing {
  const { cx, baseY } = treeBase(layout, plot.slot);
  const stage = stageOf(plot.stage);
  const treeSprite = `stage_${stage}`;
  const size = spriteBox(treeSprite);
  const tree = { sprite: treeSprite, x: cx - Math.floor(size.w / 2), y: baseY - size.h, w: size.w, h: size.h };

  const flagName = flagSprite(plot.element);
  const flagSize = spriteBox(flagName);
  const flag = { sprite: flagName, x: tree.x, y: baseY - FLAG_LIFT - flagSize.h };

  let lantern: PlacedSprite | null = null;
  if (plot.lit) {
    const l = spriteBox("lantern");
    lantern = { sprite: "lantern", x: tree.x + tree.w - l.w, y: baseY - LANTERN_LIFT - l.h };
  }

  const tag = plotTag(plot.slot, cx, baseY, TAG_GLYPH);

  const count = pipsOf(plot.badges);
  const pip = spriteBox("pip");
  const rowW = count > 0 ? (count - 1) * PIP_STEP + pip.w : 0;
  const pipX = cx - Math.floor(rowW / 2);
  const pips = Array.from({ length: count }, (_, k) => ({ sprite: "pip", x: pipX + k * PIP_STEP, y: tag.y + tag.h + PIP_GAP }));

  const box = union([{ x: tree.x, y: tree.y, w: tree.w, h: tree.h }, rectOf(flag), tag, ...(lantern ? [rectOf(lantern)] : []), ...pips.map(rectOf)]);
  return { slot: plot.slot, element: plot.element, sector: plot.sector, stage, tree, flag, lantern, tag, pips, box };
}

/** Every plot's drawing, in slot order. */
export function placePlots(scene: Pick<ElementalScene, "plots">, layout: ElementalLayout): PlotDrawing[] {
  return [...scene.plots].sort((a, b) => a.slot - b.slot).map((plot) => placePlot(layout, plot));
}

/** A plot's box on the picture (tree, flag, lantern, tag and pips), at scale 1. */
export interface ElementalPlotBox {
  slot: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The box each plot takes on the picture renderIsland draws for this scene and orientation, in slot order. */
export function plotBoxes(scene: Pick<ElementalScene, "plots">, orientation: Orientation): ElementalPlotBox[] {
  return placePlots(scene, elementalLayout(orientation)).map(({ slot, box }) => ({ slot, left: box.x, top: box.y, width: box.w, height: box.h }));
}
