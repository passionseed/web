/**
 * What the tree screens draw, as plain data: the close-up input for the
 * team's own tree and for another team's plot, previews of one item on the
 * team's tree, and the owned items per slot. No React, no requests.
 */
import type { CloseupInput } from "@/lib/shift-island/tree-closeup";
import { DEFAULT_STYLE, resolveStyle, treeItem, TREE_ITEMS, type TreeItem, type TreeSlot } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { PRE_STAGE, stageName } from "../copy";
import type { TreeView } from "./TreeCanvas";

/** The wardrobe's tabs and the catalog's slot order. */
export const SLOTS: readonly TreeSlot[] = ["shape", "leaf", "bark", "bloom"];

/**
 * Another team's roots, from the level the island already shows (0 to 3):
 * never their own count, and no recent glow, so nothing new about when they
 * wrote leaks through the close-up.
 */
export const PUBLIC_ROOTS: readonly number[] = [0, 3, 8, 15];

export function publicRoots(level: number | undefined): CloseupInput["roots"] {
  const n = Math.min(Math.max(Math.trunc(Number.isFinite(level) ? (level as number) : 0), 0), 3);
  return { count: PUBLIC_ROOTS[n], recent: 0 };
}

/** The stage's name, with a planted seed at stage 0 called the seed (เมล็ด) rather than an empty plot. */
export function treeStageName(stage: number, seeded: boolean): string {
  return Math.trunc(stage) <= 0 && seeded ? PRE_STAGE : stageName(stage);
}

/** The team's own close-up: its look, stage, seed and all its roots with the recent glow. */
export function ownCloseup(tree: MyTree): CloseupInput {
  return {
    style: resolveStyle(tree.equipped),
    stage: tree.stage,
    seeded: tree.seed != null,
    roots: { count: tree.roots.count, recent: tree.roots.recent },
  };
}

/**
 * The first stage where an item of each slot shows in the close-up: a canopy
 * for shape, leaves and bark at a size where they read, the flowers for a
 * blossom. A preview of a younger tree is drawn at that stage instead.
 */
const SHOWS_FROM: Record<TreeSlot, number> = { shape: 5, leaf: 5, bark: 5, bloom: 7 };

/** The team's own tree wearing one item, for a gift option or a wardrobe tile; null for an id the catalog does not have. */
export function wearing(tree: MyTree, itemId: string): CloseupInput | null {
  const item = treeItem(itemId);
  if (!item) return null;
  const own = ownCloseup(tree);
  return {
    ...own,
    style: { ...own.style, [item.slot]: item.id },
    stage: Math.max(Math.trunc(own.stage) || 0, SHOWS_FROM[item.slot]),
    seeded: true,
  };
}

/**
 * How a look is previewed on a tile (96 CSS px square): a leaf shape as a
 * close look at the leaves, where the shapes differ; anything else as the
 * whole tree.
 */
export function previewView(slot: TreeSlot): { view: TreeView; scale: number } {
  return slot === "shape" ? { view: "canopy", scale: 2 } : { view: "tree", scale: 1 };
}

/** The items of one slot the team owns, in catalog order; the slot's default is always owned. */
export function ownedIn(tree: MyTree, slot: TreeSlot): TreeItem[] {
  const owned = new Set(tree.owned);
  return TREE_ITEMS.filter((item) => item.slot === slot && (owned.has(item.id) || item.id === DEFAULT_STYLE[slot]));
}

/** The item the team's tree wears in a slot (unknown ids read as the default). */
export function equippedIn(tree: MyTree, slot: TreeSlot): string {
  return resolveStyle(tree.equipped)[slot];
}
