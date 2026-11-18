"use client";

import type { CSSProperties } from "react";

import { LABEL_DOOR, labelInDoor, type PlazaLabel, type PlazaLabelId, type PlazaSpotId, type PlazaWorld } from "@/lib/shift-island/live/plaza";

import { FIGURES } from "../copy";
import styles from "../world.module.css";

/** The plaza's tap targets as a group, apart from the plots' own (and their arrow keys). */
const PLAZA_GROUP = "ลานกลางเกาะ";

export interface PlazaLayerProps {
  world: PlazaWorld;
  /** Label text by id (the sign, the viewer's tag); a label without text is not shown. The sign's text has a "\n" between its two lines. */
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
}

/** Placed at its point in the picture, or at `at` (percent of the door it is drawn in). */
function labelStyle(label: PlazaLabel, at: { x: number; y: number } = label): CSSProperties {
  const style: CSSProperties = { left: `${at.x}%`, top: `${at.y}%` };
  // The viewer's tag waits for their arrival walk (CSS shows it at once under reduced motion).
  if (label.delayMs) style.animationDelay = `${label.delayMs}ms`;
  return style;
}

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

/**
 * The plaza's DOM over the living island, inside the picture's box: one
 * transparent button per tap target (the notice board, the stage, the prize
 * board, the campfire) and the only words the island prints: the Demo Day
 * sign, drawn inside the stage's button so a tap on it opens the stage
 * (LABEL_DOOR), and the viewer's small คุณ tag. Nothing else floats (founder,
 * 2026-11-18, "dont clutter"): the notice board, the campfire's count and the
 * day's count are a tap away. Labels are decoration for sighted users only:
 * the stage's button carries the sign's words in its name.
 * Where the people can talk (`onPeople`), a button out of sight until a
 * keyboard focuses it is the keyboard's and screen reader's way to what a tap
 * on a person says, named with the day's count. Where they cannot, the day's
 * count is read out once while the figures show.
 */
export function PlazaLayer({ world, labels, names, onSpot, interactive, showLabels, whole, onPeople, people }: PlazaLayerProps) {
  const spots = interactive && onSpot ? world.spots.filter((spot) => names[spot.id]) : [];
  const turn = interactive ? onPeople : undefined;
  const all = showLabels ? world.labels.filter((label) => labels[label.id]) : [];
  const doors = new Set(spots.map((spot) => spot.id));
  const doorOf = (label: PlazaLabel) => {
    const door = LABEL_DOOR[label.id];
    return door != null && doors.has(door) ? door : null;
  };
  // A place's name goes in its door; the rest float over the picture.
  const shown = all.filter((label) => doorOf(label) == null);
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
            >
              {all
                .filter((label) => doorOf(label) === spot.id)
                .map((label) => (
                  <span
                    key={label.id}
                    className={styles.plazaLabel}
                    data-label={label.id}
                    data-anchor={label.anchor}
                    style={labelStyle(label, labelInDoor(label, spot))}
                    aria-hidden="true"
                  >
                    {labels[label.id]}
                  </span>
                ))}
            </button>
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
              style={labelStyle(label)}
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
