"use client";

import { useId, useState } from "react";

import { treeItem } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { PLOT, TREE } from "../copy";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { GiftPicker } from "./GiftPicker";
import { ownCloseup, treeStageName } from "./model";
import { SeedPicker } from "./SeedPicker";
import { TreeCanvas } from "./TreeCanvas";
import styles from "./tree.module.css";
import { Wardrobe } from "./Wardrobe";

interface TreeSheetProps {
  open: boolean;
  onClose: () => void;
  /** The team's tree from the page (schema 13). The sheet is only mounted with one. */
  tree: MyTree;
  /** Close and open the quest board: the own plot used to lead there, and still can. */
  onBoard?: () => void;
}

/**
 * The team's tree up close (ต้นไม้ของทีม): what to do first (choose the
 * seed, open a waiting gift), then the cutaway with the roots, then the
 * wardrobe. A pick or a new look shows at once from the action's answer; a
 * newer tree from the page (after a refresh) replaces it.
 */
export function TreeSheet({ open, onClose, tree: given, onBoard }: TreeSheetProps) {
  const giftHeadingId = useId();
  const [tree, setTree] = useState(given);
  const [last, setLast] = useState(given);
  if (given !== last) {
    setLast(given);
    setTree(given);
  }

  const closeup = ownCloseup(tree);
  const planted = closeup.seeded || closeup.stage > 0;
  const stageLine = PLOT.stage(treeStageName(tree.stage, closeup.seeded));
  // A gift whose options the catalog no longer has cannot be shown; it waits for a newer catalog.
  const gifts = tree.gifts.filter((gift) => gift.options.some((id) => treeItem(id) !== null));
  const gift = gifts[0] ?? null;

  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={TREE.closeup.title}
      description={stageLine}
    >
      <div className={`${styles.stack} ${styles.layout}`}>
        {tree.seed == null ? <SeedPicker onPlanted={setTree} /> : null}

        {gift ? (
          <section aria-labelledby={giftHeadingId} className={styles.card}>
            <h3 id={giftHeadingId} className={styles.heading}>
              {TREE.gift.waiting(gifts.length)}
            </h3>
            <GiftPicker key={gift.id} tree={tree} gift={gift} onPicked={setTree} />
          </section>
        ) : null}

        <figure className={styles.closeup}>
          <div className={styles.closeupFrame}>
            <TreeCanvas
              input={closeup}
              scale={2}
              grow
              label={planted ? `${stageLine} ${TREE.closeup.roots(closeup.roots.count)}` : stageLine}
            />
          </div>
          <figcaption className={styles.caption}>
            <p>{TREE.closeup.caption}</p>
            {planted ? <p className={styles.roots}>{TREE.closeup.roots(closeup.roots.count)}</p> : null}
          </figcaption>
        </figure>

        <Wardrobe tree={tree} onChanged={setTree} />

        {onBoard ? (
          <button type="button" className={island.quietButton} onClick={onBoard}>
            {PLOT.toBoard}
          </button>
        ) : null}
      </div>
    </IslandSheet>
  );
}
