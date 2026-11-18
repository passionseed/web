"use client";

import type { CSSProperties } from "react";

import { QUIET_WHILE_TALKING, type PlazaLabel, type PlazaLabelId, type PlazaSpotId, type PlazaWorld } from "@/lib/shift-island/live/plaza";

import { FIGURES } from "../copy";
import styles from "../world.module.css";

/** The plaza's tap targets as a group, apart from the plots' own (and their arrow keys). */
const PLAZA_GROUP = "ลานกลางเกาะ";

export interface PlazaLayerProps {
  world: PlazaWorld;
  /** Label text by id (the viewer's คุณ tag); a label without text is not shown. */
  labels: Partial<Record<PlazaLabelId, string>>;
  /** Accessible names by spot; a spot without a name has no button. */
  names: Partial<Record<PlazaSpotId, string>>;
  onSpot?: (id: PlazaSpotId) => void;
  /** Tap targets on (off on screens that only show the place). */
  interactive: boolean;
  /** Labels on: only while the living island is the picture, in the close view. */
  showLabels: boolean;
  /** The whole island: exact boxes, no 48px floor, as for the plots. */
  whole: boolean;
  /**
   * The people on the island can talk (FigureBubble): each call has the next
   * one say their line. Its button waits out of sight until a keyboard
   * focuses it.
   */
  onPeople?: () => void;
  /** The day's count in words (plazaProps): the people button's name, never drawn on the island. */
  people?: string;
  /** Someone's speech bubble is open (FigureBubble): the labels in QUIET_WHILE_TALKING (the viewer's คุณ tag) step out of sight. */
  talking?: boolean;
}

/**
 * Placed at its point in the picture. A quiet label keeps its place, only out
 * of sight, so it comes back at once when the bubble closes, without waiting
 * out the arrival walk again (display: none would replay its fade in).
 */
function labelStyle(label: PlazaLabel, quiet: boolean): CSSProperties {
  const style: CSSProperties = { left: `${label.x}%`, top: `${label.y}%` };
  // The viewer's tag waits for their arrival walk (CSS shows it at once under reduced motion).
  if (label.delayMs) style.animationDelay = `${label.delayMs}ms`;
  if (quiet) style.visibility = "hidden";
  return style;
}

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

/**
 * The plaza's DOM over the living island, inside the picture's box: one
 * transparent button per tap target (the notice board, the stage, the prize
 * board, the campfire) and the only word the plaza prints: the viewer's small
 * คุณ tag. Nothing else floats (founder, 2026-11-18, "dont clutter"): the
 * stage's countdown board draws its days in pixels, and the notice board, the
 * campfire's count and the day's count are a tap away. The tag is decoration
 * for sighted users only; each button carries its place's words in its name.
 * Where the people can talk (`onPeople`), a button out of sight until a
 * keyboard focuses it is the keyboard's and screen reader's way to what a tap
 * on a person says, named with the day's count. Where they cannot, the day's
 * count is read out once while the figures show. While anyone's speech
 * bubble is open (`talking`), the คุณ tag steps out of sight so the bubble
 * never overlaps it, and comes back when the bubble closes.
 */
export function PlazaLayer({ world, labels, names, onSpot, interactive, showLabels, whole, onPeople, people, talking = false }: PlazaLayerProps) {
  const spots = interactive && onSpot ? world.spots.filter((spot) => names[spot.id]) : [];
  const turn = interactive ? onPeople : undefined;
  const shown = showLabels ? world.labels.filter((label) => labels[label.id]) : [];
  const quiet = (label: PlazaLabel) => talking && QUIET_WHILE_TALKING.has(label.id);
  // Nobody to greet: the day's count is said once, for screen readers, while the figures show.
  const peopleLine = people && !turn && showLabels ? people : null;

  return (
    <>
      {spots.length > 0 || turn ? (
        <div role="group" aria-label={PLAZA_GROUP} className={styles.plaza}>
          {spots.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className={`${styles.hotspot} ${styles.plazaSpot}`}
              data-spot={spot.id}
              style={{
                left: `${round4(spot.x + spot.w / 2)}%`,
                top: `${round4(spot.y + spot.h / 2)}%`,
                // Like the plots: a 48px floor close up, the exact box on the whole island.
                width: whole ? `${spot.w}%` : `max(48px, ${spot.w}%)`,
                height: whole ? `${spot.h}%` : `max(48px, ${spot.h}%)`,
              }}
              aria-label={names[spot.id]}
              onClick={() => onSpot?.(spot.id)}
            />
          ))}
          {turn ? (
            <button type="button" className={styles.peopleHidden} onClick={turn}>
              {`${people ?? FIGURES.people}, ${FIGURES.turn}`}
            </button>
          ) : null}
        </div>
      ) : null}
      {shown.length > 0 ? (
        <div className={styles.plazaLabels} aria-hidden="true">
          {shown.map((label) => (
            <span
              key={label.id}
              className={styles.plazaLabel}
              data-label={label.id}
              data-anchor={label.anchor}
              data-delayed={label.delayMs ? "true" : undefined}
              style={labelStyle(label, quiet(label))}
            >
              {labels[label.id]}
            </span>
          ))}
        </div>
      ) : null}
      {peopleLine ? <p className="sr-only">{peopleLine}</p> : null}
    </>
  );
}
