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
  todayOpen = false,
  onOpen,
}: {
  /** The viewer's own card: their name and their own avatar URL only. */
  me: Pick<ViewerCard, "name" | "avatarUrl">;
  /** The project's name. */
  name: string;
  stage: number;
  /** Today's check-in is still open (lives in the character sheet): a small lamp dot says so. */
  todayOpen?: boolean;
  onOpen: () => void;
}) {
  const filled = Math.min(Math.max(Math.trunc(stage) || 0, 0), STAGES);
  const label = PLAYER.chip(me.name, name, filled);
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles.glass} ${styles.press}`}
      aria-label={todayOpen ? `${label}, ${HUD.chipTodayOpen}` : label}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className={styles.chipFace} aria-hidden="true">
        <PixelAvatar name={me.name} url={me.avatarUrl} size={40} decorative />
        {todayOpen ? <span className={styles.chipDot} data-testid="chip-today-open" /> : null}
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

/** Top left before a plot is claimed: your picture and the island's line, nothing to open. */
export function HudLabel({ me, text }: { me: Pick<ViewerCard, "name" | "avatarUrl">; text: string }) {
  return (
    <div className={`${styles.chip} ${styles.glass}`} data-static="true">
      <span className={styles.chipFace} aria-hidden="true">
        <PixelAvatar name={me.name} url={me.avatarUrl} size={40} decorative />
      </span>
      <span className={styles.chipText}>
        <span className={styles.chipName}>{text}</span>
      </span>
    </div>
  );
}

/** A round pixel button for the top right, with an optional count. */
/** `dot`: a small lamp dot, as on the chip, for a next step waiting behind this button (the menu's consent row). */
export function HudRound({
  icon,
  label,
  badge,
  dot = false,
  onClick,
}: {
  icon: WebIcon;
  label: string;
  badge?: number;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`${styles.round} ${styles.glass} ${styles.press}`} aria-label={label} aria-haspopup="dialog" onClick={onClick}>
      <PixelIcon grid={WEB_SPRITES[icon]} palette={PALETTE} scale={2} />
      {badge && badge > 0 ? (
        <span className={styles.badge} aria-hidden="true">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : dot ? (
        <span className={styles.chipDot} aria-hidden="true" data-testid="round-dot" />
      ) : null}
    </button>
  );
}

/** A round pixel link for the top right: leaves the island in a new tab (the canvas on the whiteboard). */
export function HudLinkRound({ icon, label, href }: { icon: WebIcon; label: string; href: string }) {
  return (
    <a className={`${styles.round} ${styles.glass} ${styles.press}`} aria-label={label} title={label} href={href} target="_blank" rel="noopener">
      <PixelIcon grid={WEB_SPRITES[icon]} palette={PALETTE} scale={2} />
    </a>
  );
}

/** The story book, the envelope and the menu share this look. */
export const hudRoundClass = `${styles.round} ${styles.glass} ${styles.press}`;

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
