"use client";

import { useEffect, useRef, useState, type JSX } from "react";

import { PixelIcon } from "@/components/shift/poster/pixel/PixelRects";

import { PALETTE, WEB_SPRITES } from "../sprites";
import { STORY, type StoryCta } from "./copy";
import styles from "./story.module.css";
import { StoryOverlay, type StoryCloseVia } from "./StoryOverlay";
import { markStorySeen, useStorySeen } from "./useStorySeen";

export interface StoryLauncherProps {
  /** The season's Demo Day (ISO date); null where no season is loaded, which shows the undated line. */
  demoDay: string | null;
  /** The last panel's button: "start" (not started), "claim" (no project yet) or "island". */
  cta: StoryCta;
  /** Called after the overlay closed through its last button, once focus is free to move. */
  onCta?: () => void;
  /** Told whenever the overlay opens or closes, so the page can pause its own island meanwhile. */
  onOpenChange?: (open: boolean) => void;
  /** Replaces the book button's own look (the island HUD draws its round buttons). */
  className?: string;
  /**
   * Opens by itself on a browser that has not seen the story (the default).
   * False keeps only the book, for a screen where the story's date and last
   * button cannot be real yet: the first run then waits for the island.
   */
  autoOpen?: boolean;
  /** False: no book button (the island's menu has a tile for it); the story still opens on a first visit. */
  button?: boolean;
  /** Each new value above 0 plays the story again (the menu's tile). */
  openKey?: number;
}

/**
 * The small pixel book that re-opens the island story. On a browser that has
 * not seen the story it opens the story by itself, decided after mount; skip,
 * Escape and the last button all mark it seen. Mount one per screen.
 */
export function StoryLauncher({ demoDay, cta, onCta, onOpenChange, className, autoOpen = true, button: showButton = true, openKey = 0 }: StoryLauncherProps): JSX.Element {
  const seen = useStorySeen();
  const [reopened, setReopened] = useState(false);
  // Remembered for this page too, so storage that throws (private mode) does not reopen it at once.
  const [dismissed, setDismissed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const closedVia = useRef<StoryCloseVia | null>(null);
  const open = reopened || (autoOpen && !seen && !dismissed);
  // Asked to play again from elsewhere (the menu's tile): each new key opens it once.
  const [lastKey, setLastKey] = useState(openKey);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey > 0) setReopened(true);
  }

  // Repeating the same value is harmless: the parent's setState bails out.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  function close(via: StoryCloseVia) {
    markStorySeen();
    closedVia.current = via;
    setDismissed(true);
    setReopened(false);
  }

  /** After the overlay unmounts: the CTA hands focus to the page, anything else returns it to the book. */
  function onCloseAutoFocus(event: Event) {
    event.preventDefault();
    const via = closedVia.current;
    closedVia.current = null;
    if (via === "cta" && onCta) onCta();
    else button.current?.focus();
  }

  return (
    <>
      {showButton ? (
      <button
        ref={button}
        type="button"
        className={className ?? styles.launcher}
        aria-label={STORY.reopen}
        aria-haspopup="dialog"
        onClick={() => setReopened(true)}
      >
        <PixelIcon grid={WEB_SPRITES.book} palette={PALETTE} scale={2} />
      </button>
      ) : null}
      <StoryOverlay open={open} demoDay={demoDay} cta={cta} onClose={close} onCloseAutoFocus={onCloseAutoFocus} />
    </>
  );
}
