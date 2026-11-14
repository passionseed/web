"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import { openOptions, resolveStyle, treeItem, type TreeItem } from "@/lib/shift-island/tree-style";
import type { MyTree, QuestSubmitResult } from "@/lib/supabase/shift-quests/types";

import { SUBMIT } from "./canvas/copy";
import { TREE } from "./copy";
import { InSheetFooter } from "./InSheetFooter";
import styles from "./island.module.css";
import { PALETTE, iconGrid } from "./sprites";
import { GiftPicker } from "./tree/GiftPicker";
import { ownCloseup, previewView, wearing } from "./tree/model";
import { TreeCanvas } from "./tree/TreeCanvas";
import tree from "./tree/tree.module.css";

interface SentScreenProps {
  /** The saved submit, with the quest's gift (and the tree to draw it on) when it earned one. */
  result: QuestSubmitResult;
  /** The sheet's footer, where this screen's buttons go. */
  footer: HTMLElement | null;
  /** กลับไปที่เกาะ: the sheet closes. */
  onIsland: () => void;
  /** ดูต้นไม้ของทีม; only where the island has the team's tree (schema 13). */
  onTree?: () => void;
  /** The gift's pick action (GiftPicker's default, the server action, when left out). */
  pickGift?: ComponentProps<typeof GiftPicker>["pickGift"];
}

/** The gift as something to draw: the gift and the team's tree, or null (none, no tree came with it, or nothing left to offer). */
function offerOf(result: QuestSubmitResult): { gift: { id: string; options: string[] }; tree: MyTree } | null {
  const { gift, tree: team } = result;
  if (!gift || !team || openOptions(team.owned, gift.options).length === 0) return null;
  return { gift, tree: team };
}

/** The option the pick put on the tree: the one of the gift's options the tree now wears. */
function pickedItem(team: MyTree, options: string[]): TreeItem | null {
  const wears = resolveStyle(team.equipped);
  for (const id of options) {
    const item = treeItem(id);
    if (item && wears[item.slot] === item.id) return item;
  }
  return null;
}

const CHECK = iconGrid("check");

/**
 * After a successful send the sheet stays open here, never a toast and a
 * close: it is with the mentor, where the answer will come, and then, when
 * the submit earned one, the gift for the team's tree (pick 1 of 3, each
 * drawn as the team's own tree wearing it). A pick shows the tree wearing it,
 * said once (the picker stays quiet), and focus moves to กลับไปที่เกาะ.
 * "เก็บไว้ก่อน" leaves the gift waiting in the close-up. When a teammate
 * picked the gift first, the picker says so and the footer offers the way
 * back instead of keeping a gift that is gone.
 */
export function SentScreen({ result, footer, onIsland, onTree, pickGift }: SentScreenProps) {
  const giftHeadingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<MyTree | null>(null);
  const [gone, setGone] = useState(false);
  const offer = offerOf(result);
  const waiting = offer != null && picked == null && !gone;

  // Focus lands on what happened, at the top of the sheet.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  // Once the gift is settled (picked, or a teammate's), the tapped tile is gone: focus the way back.
  useEffect(() => {
    if (picked || gone) back.current?.focus();
  }, [picked, gone]);

  function later() {
    toast.success(TREE.gift.kept);
    onIsland();
  }

  return (
    <div className={styles.sent}>
      <div className={styles.sentHead}>
        <span className={styles.sentMark} aria-hidden="true">
          <PixelIcon grid={CHECK} palette={PALETTE} scale={2} className={styles.pixelIcon} />
        </span>
        <h3 ref={heading} tabIndex={-1} className={styles.sentTitle}>
          {SUBMIT.sentTitle}
        </h3>
        <p className={styles.sentWhere}>{SUBMIT.sentWhere}</p>
      </div>

      {offer ? (
        <section aria-labelledby={giftHeadingId} className={`${tree.card} ${styles.sentGift}`}>
          <h3 id={giftHeadingId} className={tree.heading}>
            {TREE.gift.questHeading}
          </h3>
          {picked ? (
            <PickedLook tree={picked} options={offer.gift.options} />
          ) : (
            <GiftPicker
              tree={offer.tree}
              gift={offer.gift}
              onPicked={setPicked}
              onGone={() => setGone(true)}
              quiet
              pickGift={pickGift}
            />
          )}
        </section>
      ) : null}

      <InSheetFooter slot={footer}>
        {waiting ? (
          <div className={styles.actionBar} data-single="true">
            <button type="button" className={`${styles.quietButton} ${styles.barButton}`} onClick={later}>
              {TREE.gift.keep}
            </button>
          </div>
        ) : (
          <div className={styles.actionBar} data-single={onTree ? undefined : "true"}>
            <button ref={back} type="button" className={`ei-button-dawn ${styles.primary} ${styles.barButton}`} onClick={onIsland}>
              <span>{SUBMIT.backToIsland}</span>
            </button>
            {onTree ? (
              <button type="button" className={`${styles.quietButton} ${styles.barButton} ${styles.barStuck}`} onClick={onTree}>
                {SUBMIT.seeTree}
              </button>
            ) : null}
          </div>
        )}
      </InSheetFooter>
    </div>
  );
}

/**
 * The pick is on the tree: the team's tree wearing it, drawn like the option
 * that was tapped (a young tree at the stage where the item shows), twice as
 * big, and nothing left to press.
 */
export function PickedLook({ tree: team, options }: { tree: MyTree; options: string[] }) {
  const item = pickedItem(team, options);
  const input = (item && wearing(team, item.id)) ?? ownCloseup(team);
  const { view, scale } = previewView(item?.slot ?? "leaf");
  return (
    <figure className={styles.sentPicked}>
      <div className={tree.closeupFrame}>
        <TreeCanvas input={input} scale={scale * 2} view={view} />
      </div>
      {item ? (
        <figcaption className={tree.line} role="status">
          {TREE.gift.picked(item.name)}
        </figcaption>
      ) : null}
    </figure>
  );
}
