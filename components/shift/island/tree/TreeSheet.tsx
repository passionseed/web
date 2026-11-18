"use client";

import { useId, useState, type ReactNode } from "react";

import { openGifts } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { PLOT, TREE } from "../copy";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import { ProblemEditor } from "../ProblemEditor";
import { TeamProblem } from "../QuestSections";
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
  /** The team's project, for เปลี่ยน on its problem line (schema 14); null hides the change. */
  projectId?: string | null;
  /** Today's check-in, first: tapping your own tree is a way in to it. Null when the day is already done. */
  today?: ReactNode;
  /** One line on how the work went, under the roots it grows (RootsLine). */
  roots?: ReactNode;
  /** ชวนเพื่อน (InviteFriends): the team's own place, so a teammate can be invited where the team lives. */
  invite?: ReactNode;
}

/**
 * The team's tree up close (ต้นไม้ของทีม): what to do first (today's
 * check-in, choose the seed, open a waiting gift), then the cutaway with the roots, then the
 * wardrobe. A pick or a new look shows at once from the action's answer; a
 * newer tree from the page (after a refresh) replaces it.
 */
export function TreeSheet({ open, onClose, tree: given, onBoard, projectId = null, today = null, roots = null, invite = null }: TreeSheetProps) {
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
  // Only gifts that still offer something: an option the catalog no longer has, or a look the team owns by
  // now, is never offered (openOptions), so a gift with none of those left is skipped.
  const gifts = openGifts(tree.owned, tree.gifts);
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
        {today}
        {tree.seed == null ? <SeedPicker ambition={tree.ambition} onPlanted={setTree} /> : null}

        {/* Planted: the team's problem line, and (schema 14) เปลี่ยน, because talking to people changes it. */}
        {tree.seed != null && tree.ambition?.trim() ? (
          <TeamProblem
            ambition={tree.ambition}
            planted
            editor={
              projectId ? (
                <ProblemEditor
                  projectId={projectId}
                  current={tree.ambition.trim()}
                  onSaved={(ambition) => setTree((current) => ({ ...current, ambition }))}
                />
              ) : null
            }
          />
        ) : null}

        {invite}

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

        {roots}

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
