"use client";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { TREE } from "../copy";
import { PALETTE, WEB_SPRITES } from "../sprites";
import world from "../world.module.css";
import { treeStageName } from "./model";
import styles from "./tree.module.css";

/** What waits behind the pill, for its name and its lamp dot: a gift first, then the seed choice. */
export function treeWaiting(tree: MyTree): string | null {
  if (tree.gifts.length > 0) return TREE.gift.waiting(tree.gifts.length);
  return tree.seed == null ? TREE.seed.title : null;
}

/**
 * Under the HUD chip, beside the coin pill: the team's tree and its stage as
 * a small glass pill (a 44px tap area around a 32px pill). Opens the close-up.
 * A lamp dot when a gift or the seed choice waits. Only with a tree (schema
 * 13): the page passes none below it.
 */
export function TreePill({ tree, onOpen }: { tree: MyTree; onOpen: () => void }) {
  const waiting = treeWaiting(tree);
  return (
    <button
      type="button"
      className={styles.pill}
      aria-label={waiting ? `${TREE.closeup.open}, ${waiting}` : TREE.closeup.open}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className={`${styles.pillFace} ${world.glass}`} aria-hidden="true">
        <PixelIcon grid={WEB_SPRITES.tree} palette={PALETTE} scale={1} />
        <span>{treeStageName(tree.stage, tree.seed != null)}</span>
        {waiting ? <span className={styles.pillDot} data-testid="tree-dot" /> : null}
      </span>
    </button>
  );
}
