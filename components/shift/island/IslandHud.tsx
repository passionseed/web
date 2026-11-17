"use client";

import type { ReactNode } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";
import type { ViewerCard } from "@/lib/supabase/shift-quests/types";

import { HUD, ISLAND } from "./copy";
import island from "./island.module.css";
import { PLAYER } from "./player/copy";
import { PixelAvatar } from "./player/PixelAvatar";
import { PALETTE, WEB_SPRITES, type WebIcon } from "./sprites";
import styles from "./world.module.css";

/** Tree stages counted on the chip's meter. */
const STAGES = 7;

/**
 * The HUD over the full-screen island: a top row (the chip on the left, round
 * buttons on the right) and one bottom row. Only the controls take taps;
 * everything between them reaches the island.
 */
export function Hud({
  chip,
  pill,
  buttons,
  bottom,
}: {
  chip: ReactNode;
  /** Under the chip, in the same left column (the coin pill). */
  pill?: ReactNode;
  buttons: ReactNode;
  bottom: ReactNode;
}) {
  return (
    <div className={styles.hud}>
      <header className={styles.hudTop}>
        <h1 className="sr-only">{ISLAND.title}</h1>
        <div className={styles.hudLeft}>
          {chip}
          {pill}
        </div>
        <div className={`${styles.hudButtons} ${island.hudButtonsTight}`}>{buttons}</div>
      </header>
      <div className={styles.hudBottom}>{bottom}</div>
    </div>
  );
}

/**
 * Top left: who you are on the island (your Discord picture as a pixel
 * sprite), the project's name and its tree's stage as a 7-cell meter, your
 * level. Opens the character sheet.
 */
export function HudChip({
  me,
  name,
  stage,
  waiting = null,
  onOpen,
}: {
  /** The viewer's own card: their name and their own avatar URL only. */
  me: Pick<ViewerCard, "name" | "avatarUrl">;
  /** The project's name. */
  name: string;
  stage: number;
  /** What waits at the team's tree (a gift, the seed; its line is in the team sheet): a lamp dot, and these words. */
  waiting?: string | null;
  onOpen: () => void;
}) {
  const filled = Math.min(Math.max(Math.trunc(stage) || 0, 0), STAGES);
  const label = PLAYER.chip(me.name, name, filled);
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles.glass} ${styles.press}`}
      aria-label={waiting ? `${label}, ${waiting}` : label}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className={styles.chipFace} aria-hidden="true">
        <PixelAvatar name={me.name} url={me.avatarUrl} size={40} decorative />
        {waiting ? <span className={styles.chipDot} data-testid="chip-dot" /> : null}
      </span>
      <span className={styles.chipText} aria-hidden="true">
        <span className={styles.chipName}>{name}</span>
        <span className={styles.chipMeter}>
          {Array.from({ length: STAGES }, (_, i) => (
            <span key={i} className={styles.chipCell} data-filled={i < filled ? "true" : undefined} />
          ))}
        </span>
      </span>
    </button>
  );
}

/**
 * Top left before a plot is claimed: your picture and the island's line. With
 * `onOpen` it is the island's one door to the menu (the guide, the story, the
 * consent step, who is signed in), with a lamp dot while consent waits.
 */
export function HudLabel({
  me,
  text,
  label,
  dot = false,
  onOpen,
}: {
  me: Pick<ViewerCard, "name" | "avatarUrl">;
  text: string;
  /** The button's accessible name (what the tap opens). */
  label?: string;
  dot?: boolean;
  onOpen?: () => void;
}) {
  const face = (
    <>
      <span className={styles.chipFace} aria-hidden="true">
        <PixelAvatar name={me.name} url={me.avatarUrl} size={40} decorative />
        {dot ? <span className={styles.chipDot} data-testid="chip-dot" /> : null}
      </span>
      <span className={styles.chipText} aria-hidden={onOpen ? "true" : undefined}>
        <span className={styles.chipName}>{text}</span>
      </span>
    </>
  );
  if (!onOpen) {
    return (
      <div className={`${styles.chip} ${styles.glass}`} data-static="true">
        {face}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles.glass} ${styles.press}`}
      aria-label={label ? `${text}, ${label}` : text}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      {face}
    </button>
  );
}

/**
 * Bottom: the quest board. Narrow beside the keynote, wide when there is no
 * keynote. `concealed` while the living island shows the notice board in the
 * plaza: out of sight, still focusable, and back in view on keyboard focus.
 */
export function BoardButton({ wide, concealed = false, onClick }: { wide: boolean; concealed?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.boardButton} ${styles.glass} ${styles.press}${concealed ? ` ${island.concealed}` : ""}`}
      data-wide={wide ? "true" : undefined}
      data-concealed={concealed ? "true" : undefined}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <PixelIcon grid={WEB_SPRITES.scroll} palette={PALETTE} scale={2} />
      <span>{HUD.board}</span>
    </button>
  );
}

/** Under the next-step card: one quiet way to the whole quest board. */
export function BoardLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.boardLink} ${styles.glass} ${styles.press}`} aria-haspopup="dialog" onClick={onClick}>
      <PixelIcon grid={WEB_SPRITES.scroll} palette={PALETTE} scale={1} />
      <span>{label}</span>
    </button>
  );
}
