"use client";

import { useId } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { BoardRef } from "@/lib/supabase/shift-quests/board";
import type { TileStatus } from "@/lib/supabase/shift-quests/types";
import type { NoticeKind } from "@/lib/shift-island/notice";

import { BOARD, tileChip } from "./copy";
import styles from "./island.module.css";
import { sameRef, type QuestView } from "./model";
import { HELP_FLAG, PALETTE, SILHOUETTE, WEB_SPRITES, iconGrid, iconScale, type IconKey } from "./sprites";

const HALO: ReadonlySet<TileStatus> = new Set(["active", "clarification"]);

/** The caller's open quests: their pin is gold, as on the plaza's notice board. */
const OPEN: ReadonlySet<TileStatus> = new Set(["active", "clarification", "paused", "submitted", "appealed"]);

/** Main quests 6 (help another builder move) and 7 (improve our community) are the community quests. */
const COMMUNITY_MILESTONES: ReadonlySet<number> = new Set([6, 7]);

/** A card's pin colour: in progress gold, else main cream and side teal (a proposed quest is cream). */
export function cardPin(view: Pick<QuestView, "kind" | "status">): NoticeKind {
  if (OPEN.has(view.status)) return "active";
  return view.kind === "side" ? "side" : "main";
}

/** One quest from the board as a pinned card. */
export function QuestCard({ view, keynote, onOpen }: { view: QuestView; keynote: BoardRef | null; onOpen: (ref: BoardRef) => void }) {
  return (
    <QuestTile
      layout="card"
      status={view.status}
      icon={view.icon}
      title={view.title}
      owner={view.owner}
      help={view.help}
      keynote={sameRef(keynote, view.ref)}
      pin={cardPin(view)}
      community={view.ref.kind === "main" && COMMUNITY_MILESTONES.has(view.ref.milestone)}
      note={view.status === "locked" && view.lockedBy.length > 0 ? BOARD.unlockWhen(view.lockedBy) : null}
      onOpen={() => onOpen(view.ref)}
    />
  );
}

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
  /**
   * card: a note pinned on the quest board (icon, two-line title, stamp).
   * row: title beside the icon, the note under the title.
   */
  layout: "card" | "row";
  /** A line read as the tile's description (the unlock rule for a locked quest). Visually hidden on a card. */
  note?: string | null;
  /** Card only: the pin's colour, as the notes on the plaza's notice board. */
  pin?: NoticeKind;
  /** A community quest (main quests 6 and 7): a small heart, its meaning read as part of the description. */
  community?: boolean;
  onOpen: () => void;
}

/**
 * One quest as a pixel tile. Every tile opens its details, a locked one too
 * (to read the unlock rule): the lock is in the label ("..., ล็อกอยู่") and the
 * described-by note, never aria-disabled on a button that works.
 */
export function QuestTile({ status, icon, title, owner, keynote, help, layout, note, pin, community, onOpen }: QuestTileProps) {
  const noteId = useId();
  const communityId = useId();
  const chip = tileChip(status, owner);
  const card = layout === "card";
  const gold = keynote && HALO.has(status);
  const label = BOARD.tileLabel(title, chip) + (help ? `, ${BOARD.help}` : "");
  const describedBy = [community ? communityId : null, note ? noteId : null].filter(Boolean).join(" ");

  const stamp = (
    <span className={card ? styles.stamp : styles.chip} data-status={status}>
      {chip}
    </span>
  );
  const noteText = note ? (
    <span id={noteId} className={card ? "sr-only" : styles.tileNote}>
      {note}
    </span>
  ) : null;

  return (
    <button
      type="button"
      className={styles.tile}
      data-status={status}
      data-layout={layout}
      data-keynote={gold ? "true" : undefined}
      data-pin={card ? (pin ?? "main") : undefined}
      data-island-glow=""
      aria-label={label}
      aria-describedby={describedBy || undefined}
      onClick={onOpen}
    >
      {card ? <span className={styles.cardPin} aria-hidden="true" /> : null}
      <TileIcon status={status} icon={icon} help={help} />
      {card ? (
        <>
          <span className={styles.cardTitle}>{title}</span>
          <span className={styles.cardFoot}>
            {stamp}
            {community ? (
              <PixelIcon grid={WEB_SPRITES.heart} palette={PALETTE} scale={1} className={styles.cardHeart} />
            ) : null}
          </span>
          {community ? (
            <span id={communityId} className="sr-only">
              {BOARD.community}
            </span>
          ) : null}
          {noteText}
        </>
      ) : (
        <span className={styles.tileText}>
          <span className={styles.tileTitle}>{title}</span>
          {stamp}
          {help ? <span className={styles.helpText}>{BOARD.help}</span> : null}
          {community ? (
            <span id={communityId} className={styles.tileNote}>
              {BOARD.community}
            </span>
          ) : null}
          {noteText}
        </span>
      )}
    </button>
  );
}

/** The sand icon tile: sprite, state marks (check, moon, notch), halo, hover glow and the help flag. */
function TileIcon({ status, icon, help }: Pick<QuestTileProps, "status" | "icon" | "help">) {
  const grid = iconGrid(icon);
  const locked = status === "locked";
  return (
    <span className={styles.tileBox} aria-hidden="true">
      {HALO.has(status) ? <span className={styles.tileHalo} /> : null}
      <span className={styles.tileGlow} />
      {locked ? null : <span className={styles.tileShadow} />}
      <span className={styles.tileFace}>
        <PixelIcon grid={grid} palette={locked ? SILHOUETTE : PALETTE} scale={iconScale(grid, 32)} className={styles.tileSprite} />
        {status === "done" ? <PixelIcon grid={WEB_SPRITES.check} palette={PALETTE} scale={1} className={styles.tileCheck} /> : null}
        {status === "paused" ? <PixelIcon grid={WEB_SPRITES.moon} palette={PALETTE} scale={1} className={styles.tileMoon} /> : null}
        {status === "declined" ? <span className={styles.tileNotch} /> : null}
      </span>
      {help ? <PixelIcon grid={HELP_FLAG} palette={PALETTE} scale={2} className={styles.tileFlag} /> : null}
    </span>
  );
}
