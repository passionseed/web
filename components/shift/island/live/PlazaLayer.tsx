"use client";

import type { PlazaLabelId, PlazaSpotId, PlazaWorld } from "@/lib/shift-island/live/plaza";

import styles from "../world.module.css";

/** The plaza's tap targets as a group, apart from the plots' own (and their arrow keys). */
const PLAZA_GROUP = "ลานกลางเกาะ";

export interface PlazaLayerProps {
  world: PlazaWorld;
  /** Label text by id; a label without text is not shown. The sign's text has a "\n" between its two lines. */
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
}

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

/**
 * The plaza's DOM over the living island, inside the picture's box: one
 * transparent button per tap target (the notice board, the stage, the
 * campfire) and the short labels the canvas cannot draw crisply (the Demo Day
 * sign, how many people are at the campfire). Labels are decoration for
 * sighted users only: each button carries the same words in its name.
 */
export function PlazaLayer({ world, labels, names, onSpot, interactive, showLabels, whole }: PlazaLayerProps) {
  const spots = interactive && onSpot ? world.spots.filter((spot) => names[spot.id]) : [];
  const shown = showLabels ? world.labels.filter((label) => labels[label.id]) : [];

  return (
    <>
      {spots.length > 0 ? (
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
              style={{ left: `${label.x}%`, top: `${label.y}%` }}
            >
              {labels[label.id]}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
