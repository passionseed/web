"use client";

import type { CSSProperties } from "react";

import { LABEL_DOOR, labelInDoor, type PlazaLabel, type PlazaLabelId, type PlazaSpotId, type PlazaWorld } from "@/lib/shift-island/live/plaza";

import { FIGURES } from "../copy";
import { PixelAvatar } from "../player/PixelAvatar";
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
  /**
   * The viewer, for their picture beside the "คุณ" tag over their own figure.
   * Only the viewer's own island passes it (IslandViewport's `me`); without
   * it the tag shows its text alone.
   */
  me?: { name: string; avatarUrl: string | null };
  /**
   * The people on the island can talk (FigureBubble): each call has the next
   * one say their line. The day's count becomes its button; without a count
   * on screen the button is hidden until a keyboard focuses it.
   */
  onPeople?: () => void;
}

const round4 = (v: number) => Math.round(v * 10_000) / 10_000;

/** Placed at its point in the picture, or at `at` (percent of the door it is drawn in). */
function labelStyle(label: PlazaLabel, at: { x: number; y: number } = label): CSSProperties {
  const style: CSSProperties = { left: `${at.x}%`, top: `${at.y}%` };
  // The viewer's tag waits for their arrival walk (CSS shows it at once under reduced motion).
  if (label.delayMs) style.animationDelay = `${label.delayMs}ms`;
  return style;
}

/** A label's words (and the viewer's picture beside "คุณ"), the same wherever the label is drawn. */
function LabelText({ id, labels, me }: { id: PlazaLabelId; labels: PlazaLayerProps["labels"]; me: PlazaLayerProps["me"] }) {
  return (
    <>
      {id === "me" && me ? <PixelAvatar name={me.name} url={me.avatarUrl} size={16} decorative className={styles.plazaTagAvatar} /> : null}
      {labels[id]}
    </>
  );
}

/**
 * The plaza's DOM over the living island, inside the picture's box: one
 * transparent button per tap target (the notice board, the stage, the
 * campfire) and the short labels the canvas cannot draw crisply (the notice
 * board's name, the Demo Day sign, how many people are at the campfire,
 * today's visitors, the viewer's own tag). A label that names a place with a
 * button (LABEL_DOOR) is drawn inside that button, so a tap on the words opens
 * the place as a tap on its picture does. Labels are decoration for sighted
 * users only: each button carries the same words in its name, and the
 * visitors' line is read out once.
 * Where the people can talk (`onPeople`), the day's count is a button too:
 * the keyboard's and screen reader's way to what a tap on a person says.
 */
export function PlazaLayer({ world, labels, names, onSpot, interactive, showLabels, whole, me, onPeople }: PlazaLayerProps) {
  const spots = interactive && onSpot ? world.spots.filter((spot) => names[spot.id]) : [];
  const people = interactive ? onPeople : undefined;
  const all = showLabels ? world.labels.filter((label) => labels[label.id]) : [];
  const count = all.find((label) => label.id === "visitors") ?? null;
  const doors = new Set(spots.map((spot) => spot.id));
  const doorOf = (label: PlazaLabel) => {
    const door = LABEL_DOOR[label.id];
    return door != null && doors.has(door) ? door : null;
  };
  // With people to greet, the day's count is their button (below); a place's name goes in its door. Neither is a loose label.
  const shown = all.filter((label) => !(people && label === count) && doorOf(label) == null);
  // Otherwise the visitors' line is said once, for screen readers, while the figures show.
  const visitorsLine = count && !people ? labels.visitors : null;
  const countLine = count ? labels.visitors!.replace("\n", " ") : null;

  return (
    <>
      {spots.length > 0 || people ? (
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
                    <LabelText id={label.id} labels={labels} me={me} />
                  </span>
                ))}
            </button>
          ))}
          {people && count ? (
            <button
              type="button"
              className={`${styles.plazaLabel} ${styles.plazaPeople}`}
              data-label="visitors"
              data-anchor={count.anchor}
              style={labelStyle(count)}
              aria-label={`${countLine}, ${FIGURES.turn}`}
              onClick={people}
            >
              {labels.visitors}
            </button>
          ) : null}
          {people && !count ? (
            <button type="button" className={styles.peopleHidden} onClick={people}>
              {`${FIGURES.people}, ${FIGURES.turn}`}
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
              <LabelText id={label.id} labels={labels} me={me} />
            </span>
          ))}
        </div>
      ) : null}
      {visitorsLine ? <p className="sr-only">{visitorsLine.replace("\n", " ")}</p> : null}
    </>
  );
}
