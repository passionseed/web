"use client";

import { useId, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";

import { equipItem } from "@/app/shift/island/tree-actions";
import { treeItem, type TreeSlot } from "@/lib/shift-island/tree-style";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { COMMON, TREE } from "../copy";
import { ItemTile } from "./ItemTile";
import { equippedIn, ownedIn, SLOTS, wearing } from "./model";
import styles from "./tree.module.css";

/**
 * ลุคของต้นไม้: one tab per slot, each listing only the looks the team owns
 * (the defaults always), the one in use marked. Any teammate can put an
 * owned look on the tree; it saves at once and the close-up changes with it.
 */
export function Wardrobe({ tree, onChanged }: { tree: MyTree; onChanged: (tree: MyTree) => void }) {
  const headingId = useId();
  const [slot, setSlot] = useState<TreeSlot>("shape");
  const sending = useRef(false);
  const [pending, setPending] = useState<string | null>(null);

  async function equip(id: string) {
    const item = treeItem(id);
    if (sending.current || !item || equippedIn(tree, item.slot) === id) return;
    sending.current = true;
    setPending(id);
    try {
      const result = await equipItem(id);
      if (result.ok) {
        toast.success(TREE.wardrobe.changed);
        onChanged(result.data.tree);
      } else {
        toast.error(result.error || COMMON.failed);
      }
    } catch {
      toast.error(COMMON.failed);
    } finally {
      sending.current = false;
      setPending(null);
    }
  }

  return (
    <section aria-labelledby={headingId} className={styles.wardrobe}>
      <h3 id={headingId} className={styles.heading}>
        {TREE.wardrobe.heading}
      </h3>
      <p className={styles.hint}>{TREE.wardrobe.sub}</p>
      <Tabs.Root value={slot} onValueChange={(value) => setSlot(value as TreeSlot)}>
        <Tabs.List className={styles.tabs} aria-label={TREE.wardrobe.heading}>
          {SLOTS.map((id) => (
            <Tabs.Trigger key={id} value={id} className={styles.tab}>
              {TREE.slots[id]}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {SLOTS.map((id) => (
          <Tabs.Content key={id} value={id} className={styles.panel}>
            <SlotLooks tree={tree} slot={id} pending={pending} onEquip={(item) => void equip(item)} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  );
}

function SlotLooks({
  tree,
  slot,
  pending,
  onEquip,
}: {
  tree: MyTree;
  slot: TreeSlot;
  pending: string | null;
  onEquip: (id: string) => void;
}) {
  const items = ownedIn(tree, slot);
  const inUse = equippedIn(tree, slot);
  return (
    <>
      <ul className={styles.tiles}>
        {items.map((item) => {
          const preview = wearing(tree, item.id);
          if (!preview) return null;
          const using = item.id === inUse;
          return (
            <li key={item.id}>
              <ItemTile
                preview={preview}
                slot={slot}
                name={item.name}
                pressed={using}
                tag={pending === item.id ? COMMON.saving : using ? TREE.wardrobe.using : undefined}
                busy={pending === item.id}
                disabled={pending !== null && !using}
                onClick={() => onEquip(item.id)}
              />
            </li>
          );
        })}
      </ul>
      {/* Only the default so far: say where new looks come from. */}
      {items.length <= 1 ? <p className={styles.hint}>{TREE.wardrobe.empty}</p> : null}
    </>
  );
}
