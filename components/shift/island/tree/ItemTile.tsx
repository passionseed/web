"use client";

import { useId } from "react";

import type { CloseupInput } from "@/lib/shift-island/tree-closeup";
import type { TreeSlot } from "@/lib/shift-island/tree-style";

import { previewView } from "./model";
import { TreeCanvas } from "./TreeCanvas";
import styles from "./tree.module.css";

interface ItemTileProps {
  /** The team's tree wearing this item (model.wearing). */
  preview: CloseupInput;
  /** The item's slot: a leaf shape is shown as a close look at the leaves. */
  slot: TreeSlot;
  /** The item's Thai name: the button's accessible name. */
  name: string;
  /** Which part of the tree it changes (สีใบ): shown small, read as the description. */
  slotName?: string;
  /** Wardrobe only: whether the tree wears it now (aria-pressed). */
  pressed?: boolean;
  /** A short tag under the name (ใช้อยู่, กำลังบันทึก); decorative, the state is on the button. */
  tag?: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** One look as a button: the team's tree wearing it, then its name. Gift options and wardrobe looks. */
export function ItemTile({ preview, slot, name, slotName, pressed, tag, busy = false, disabled = false, onClick }: ItemTileProps) {
  const slotId = useId();
  const { view, scale } = previewView(slot);
  return (
    <button
      type="button"
      className={styles.tile}
      aria-pressed={pressed}
      aria-describedby={slotName ? slotId : undefined}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <TreeCanvas input={preview} scale={scale} view={view} className={styles.tileCanvas} />
      {slotName ? (
        <span id={slotId} className={styles.tileSlot} aria-hidden="true">
          {slotName}
        </span>
      ) : null}
      <span className={styles.tileName}>{name}</span>
      {tag ? (
        <span className={styles.tileTag} data-tone={busy ? "busy" : undefined} aria-hidden="true">
          {tag}
        </span>
      ) : null}
    </button>
  );
}
