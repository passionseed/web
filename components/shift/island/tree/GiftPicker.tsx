"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { pickGift } from "@/app/shift/island/tree-actions";
import { treeItem, type TreeItem } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { COMMON, TREE } from "../copy";
import island from "../island.module.css";
import { ItemTile } from "./ItemTile";
import { wearing } from "./model";
import styles from "./tree.module.css";

export interface GiftPickerProps {
  /** The team's tree now: each option is drawn as this tree wearing it. */
  tree: MyTree;
  /** One waiting gift (MyTree.gifts, or a submit's result.gift). */
  gift: { id: string; options: string[] };
  /** The pick is saved: the team's tree as the database has it now (it wears the item). */
  onPicked: (tree: MyTree) => void;
  /** Shows "เก็บไว้ก่อน", which calls this; the gift keeps waiting in the close-up. */
  onLater?: () => void;
}

type Option = { item: TreeItem; preview: NonNullable<ReturnType<typeof wearing>> };

function optionsOf(tree: MyTree, ids: string[]): Option[] {
  return ids.flatMap((id) => {
    const item = treeItem(id);
    const preview = wearing(tree, id);
    return item && preview ? [{ item, preview }] : [];
  });
}

/**
 * A gift for the team's tree: pick 1 of its options (up to 3), each drawn as
 * the team's own tree wearing it. One tap sends one pick, never two (a
 * double click, or a tap on another option while the first is saving).
 * When a teammate picked it first (gift_gone) it says so and offers nothing
 * more; the page refreshes behind it. Used by the close-up (TreeSheet) and
 * the quest sent screen.
 */
export function GiftPicker({ tree, gift, onPicked, onLater }: GiftPickerProps) {
  const subId = useId();
  // Set on the first tap, before any re-render: a second tap in the same frame sees it.
  const sending = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const options = optionsOf(tree, gift.options);

  async function pick(option: Option) {
    if (sending.current) return;
    sending.current = true;
    setPending(option.item.id);
    let picked = false;
    try {
      const result = await pickGift(gift.id, option.item.id);
      if (result.ok) {
        picked = true;
        toast.success(TREE.gift.picked(option.item.name));
        onPicked(result.data.tree);
      } else {
        toast.error(result.error || COMMON.failed);
        if (result.code === "gift_gone") setGone(true);
      }
    } catch {
      toast.error(COMMON.failed);
    } finally {
      // A picked gift stays closed; any other answer lets the student try again (or, when it is gone, shows why).
      if (!picked) sending.current = false;
      setPending(null);
    }
  }

  if (gone) {
    return (
      <p role="status" className={styles.gone}>
        {TREE.gift.gone}
      </p>
    );
  }
  if (options.length === 0) return null;

  return (
    <div className={styles.gift}>
      <p id={subId} className={styles.line}>
        {options.length >= 3 ? TREE.gift.sub : TREE.gift.subFew}
      </p>
      <div role="group" aria-labelledby={subId} className={styles.tiles}>
        {options.map((option) => (
          <ItemTile
            key={option.item.id}
            preview={option.preview}
            slot={option.item.slot}
            name={option.item.name}
            slotName={TREE.slots[option.item.slot]}
            tag={pending === option.item.id ? COMMON.saving : undefined}
            busy={pending === option.item.id}
            disabled={pending !== null}
            onClick={() => void pick(option)}
          />
        ))}
      </div>
      {onLater ? (
        <button type="button" className={`${island.quietButton} ${styles.later}`} disabled={pending !== null} onClick={onLater}>
          {TREE.gift.keep}
        </button>
      ) : null}
    </div>
  );
}
