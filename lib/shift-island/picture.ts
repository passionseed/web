import "server-only";

import { createHash } from "node:crypto";

import {
  RenderError,
  buildScene,
  plotBoxes,
  renderIsland,
  rootsLevel,
  type IslandPlot,
  type IslandScene,
  type PlotBox,
} from "@/bot/src/quests/island/render";
import type { IslandMapData, IslandMapPlot } from "@/lib/supabase/shift-quests/types";

/**
 * The island picture on /shift/island: the same PNG the Discord bot posts,
 * drawn by the bot's renderer at request time (scale 1, the page upscales it
 * with nearest-neighbour), plus a tap target per plot. Targets come from the
 * renderer's own placement (plotBoxes), so the picture and its hotspots cannot
 * drift apart. The page also gets the island as a scene (the same display list
 * the PNG is drawn from) for the living island canvas; the PNG stays the first
 * paint and the fallback.
 */

/** Smallest tap target, in native pixels: 48 CSS px at 4x, still comfortable at 2x. */
const MIN_HOTSPOT = 12;

/** Bump when the renderer's pixels change for the same map, so open pages fetch the new picture. */
const RENDER_REVISION = "island-1";

export interface IslandHotspot {
  slot: number;
  mine: boolean;
  plain: boolean;
  stage: number;
  name: string | null;
  /** Percent (0..100) of the picture box. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IslandPicture {
  /** "/api/shift/island/map?v=<pictureVersion>"; `v` only busts caches, it never names a viewer. */
  src: string;
  /** Native size in pixels at scale 1 (the page shows it at 2x). */
  width: number;
  height: number;
  hotspots: IslandHotspot[];
  mine: IslandHotspot | null;
  festival: boolean;
  /**
   * The display list the PNG is drawn from (caller's pin marked, festival as
   * above), for the living island. No names; nothing the plots do not already
   * say. Null when it cannot be built: the page keeps the PNG.
   */
  scene: IslandScene | null;
}

/** Festival bunting while a season runs, as in the bot. */
function festivalFor(map: IslandMapData): boolean {
  return map.season != null;
}

/** The renderer's input for one plot. A plain plot shows its slot only; the renderer draws it empty. */
function toPlot(p: IslandMapPlot): IslandPlot {
  return {
    slot: p.slot,
    stage: p.stage,
    visitor: p.visitor,
    key: p.key,
    helper: p.helper,
    lantern: p.lantern,
    name: p.name,
    mine: p.mine,
    plain: p.plain ?? false,
    roots: p.roots ?? 0,
  };
}

/**
 * 12 hex characters that change whenever the picture would: every drawn field
 * of every plot (sorted by slot) and the festival flag. Names are not drawn,
 * so they are not hashed. Roots join a plot's fields only when it has some,
 * so an island without roots keeps the version it had before roots existed.
 */
export function pictureVersion(map: IslandMapData): string {
  const plots = [...map.plots]
    .sort((a, b) => a.slot - b.slot)
    .map((p) => {
      const fields = [p.slot, p.stage, p.visitor, p.key, p.helper, p.lantern, p.mine, p.plain ?? false];
      const roots = p.plain ? 0 : rootsLevel(p.roots);
      return (roots > 0 ? [...fields, roots] : fields).map((v) => (typeof v === "boolean" ? Number(v) : v));
    });
  const input = JSON.stringify({ r: RENDER_REVISION, festival: festivalFor(map), plots });
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

/**
 * One axis of a box, grown evenly to at least MIN_HOTSPOT and kept inside
 * 0..limit. A box pushed against an edge takes its missing room from the
 * other side.
 */
function span(start: number, size: number, limit: number): [number, number] {
  const grow = Math.max(0, MIN_HOTSPOT - size);
  let a = Math.max(0, start - Math.floor(grow / 2));
  let b = Math.min(limit, start + size + Math.ceil(grow / 2));
  const short = Math.min(MIN_HOTSPOT, limit) - (b - a);
  if (short > 0) {
    if (a === 0) b = Math.min(limit, b + short);
    else a = Math.max(0, a - short);
  }
  return [a, b];
}

/** Four decimals: precise to well under a pixel, short in props. */
const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

function hotspot(box: PlotBox, plot: IslandMapPlot, width: number, height: number): IslandHotspot {
  const [x0, x1] = span(box.left, box.width, width);
  const [y0, y1] = span(box.top, box.height, height);
  const plain = plot.plain ?? false;
  // Round the edges, not the sizes, so x + w lands on the right edge and stays within 100.
  const left = round4((x0 / width) * 100);
  const right = round4((x1 / width) * 100);
  const top = round4((y0 / height) * 100);
  const bottom = round4((y1 / height) * 100);
  return {
    slot: plot.slot,
    mine: plot.mine,
    plain,
    // What the picture shows: a plain plot is an empty slot with no name.
    stage: plain ? 0 : plot.stage,
    name: plain ? null : plot.name,
    x: left,
    y: top,
    w: round4(right - left),
    h: round4(bottom - top),
  };
}

/** The scene for the living island, or null (logged like a picture failure) when it cannot be built. */
function sceneFor(map: IslandMapData): IslandScene | null {
  try {
    return buildScene(map.plots.map(toPlot), { markMine: true, festival: festivalFor(map) });
  } catch (error) {
    if (!(error instanceof RenderError)) throw error;
    console.error(`[shift-island] scene failed: ${error.code} (${error.detail})`);
    return null;
  }
}

/**
 * The picture's URL and size with one hotspot per plot, in slot order. On a
 * RenderError it logs one line (code and detail: a slot or a sprite key, never
 * student text) and returns null; the page works without the picture.
 */
export function islandPicture(map: IslandMapData): IslandPicture | null {
  try {
    const { width, height, boxes } = plotBoxes(map.plots.map(toPlot));
    const bySlot = new Map(map.plots.map((p) => [p.slot, p]));
    const hotspots = boxes.map((box) => hotspot(box, bySlot.get(box.slot)!, width, height));
    return {
      src: `/api/shift/island/map?v=${pictureVersion(map)}`,
      width,
      height,
      hotspots,
      mine: hotspots.find((h) => h.mine) ?? null,
      festival: festivalFor(map),
      scene: sceneFor(map),
    };
  } catch (error) {
    if (!(error instanceof RenderError)) throw error;
    console.error(`[shift-island] picture failed: ${error.code} (${error.detail})`);
    return null;
  }
}

/** The PNG for the picture route: scale 1, the caller's plot marked. Throws RenderError. */
export function renderIslandPng(map: IslandMapData): { png: Buffer; width: number; height: number } {
  const out = renderIsland(map.plots.map(toPlot), { scale: 1, markMine: true, festival: festivalFor(map) });
  return { png: out.png, width: out.width, height: out.height };
}
