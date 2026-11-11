"use client";

import { useId } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { TileStatus } from "@/lib/supabase/shift-quests/types";

import { BOARD, tileChip } from "./copy";
import styles from "./island.module.css";
import { HELP_FLAG, PALETTE, SILHOUETTE, WEB_SPRITES, iconGrid, iconScale, type IconKey } from "./sprites";

const HALO: ReadonlySet<TileStatus> = new Set(["active", "clarification"]);

export interface QuestTileProps {
  status: TileStatus;
  icon: IconKey;
  title: string;
  /** Teammate holding the quest (held only). */
  owner?: string | null;
  /** The caller's keynote quest: its halo is gold, every other halo is blue. */
  keynote?: boolean;
  /** The caller has an open help request on this quest. */
  help?: boolean;
  /** ring: icon and chip only (the ring around the tree). row: title beside the icon. */
  layout: "ring" | "row";
  /** A line under the title, read as the tile's description (the unlock rule for a locked quest). */
  note?: string | null;
  onOpen: () => void;
}

/**
 * One quest as a pixel tile. Every tile opens its details, a locked one too
 * (to read the unlock rule): the lock is in the label ("..., ล็อกอยู่") and the
 * described-by note, never aria-disabled on a button that works.
 */
export function QuestTile({ status, icon, title, owner, keynote, help, layout, note, onOpen }: QuestTileProps) {
  const noteId = useId();
  const chip = tileChip(status, owner);
  const grid = iconGrid(icon);
  const locked = status === "locked";
  const label = BOARD.tileLabel(title, chip) + (help ? `, ${BOARD.help}` : "");

  return (
    <button
      type="button"
      className={styles.tile}
      data-status={status}
      data-layout={layout}
      data-keynote={keynote && HALO.has(status) ? "true" : undefined}
      data-island-glow=""
      aria-label={label}
      aria-describedby={note ? noteId : undefined}
      onClick={onOpen}
    >
      <span className={styles.tileBox} aria-hidden="true">
        {HALO.has(status) ? <span className={styles.tileHalo} /> : null}
        <span className={styles.tileGlow} />
        {locked ? null : <span className={styles.tileShadow} />}
        <span className={styles.tileFace}>
          <PixelIcon
            grid={grid}
            palette={locked ? SILHOUETTE : PALETTE}
            scale={iconScale(grid, 32)}
            className={styles.tileSprite}
          />
          {status === "done" ? (
            <PixelIcon grid={WEB_SPRITES.check} palette={PALETTE} scale={1} className={styles.tileCheck} />
          ) : null}
          {status === "paused" ? (
            <PixelIcon grid={WEB_SPRITES.moon} palette={PALETTE} scale={1} className={styles.tileMoon} />
          ) : null}
          {status === "declined" ? <span className={styles.tileNotch} /> : null}
        </span>
        {help ? <PixelIcon grid={HELP_FLAG} palette={PALETTE} scale={2} className={styles.tileFlag} /> : null}
      </span>
      <span className={styles.tileText}>
        {layout === "row" ? <span className={styles.tileTitle}>{title}</span> : null}
        <span className={styles.chip} data-status={status}>
          {chip}
        </span>
        {help ? <span className={styles.helpText}>{BOARD.help}</span> : null}
        {note ? (
          <span id={noteId} className={styles.tileNote}>
            {note}
          </span>
        ) : null}
      </span>
    </button>
  );
}
