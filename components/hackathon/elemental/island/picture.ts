import "server-only";

import type { Orientation } from "@/lib/elemental/island/layout";
import { renderIsland } from "@/lib/elemental/island/render";
import { buildElementalScene } from "@/lib/elemental/island/scene";
import type { ElementalPublicIsland } from "@/lib/supabase/elemental";

/**
 * The island PNG for /hackathon/island/png: the same compositor the Discord
 * bot posts (lib/elemental/island), drawn at scale 1 at request time. The page
 * upscales it with nearest-neighbour. Only numbers, booleans and element keys
 * reach the scene: project names stay in the page's legend.
 *
 * Node only: the compositor reaches SHIFT's encodePng, which uses node:zlib.
 */

export function parseOrientation(value: unknown): Orientation {
  return value === "portrait" ? "portrait" : "landscape";
}

export function islandPng(island: Pick<ElementalPublicIsland, "plots" | "health">, layout: Orientation): Buffer {
  const scene = buildElementalScene(
    island.plots.map((p) => ({ slot: p.slot, element: p.element, counted: p.counted, lit: p.lit, badges: p.badges }))
  );
  return renderIsland(scene, { layout, health: island.health }).png;
}
