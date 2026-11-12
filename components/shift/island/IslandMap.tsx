"use client";

import Image from "next/image";
import { useId } from "react";

import { PROLOGUE_SAMPLE_TAG } from "@/lib/content/shift-island-invite";
import { SHIFT_ISLAND } from "@/lib/content/shift-island";

import styles from "./islandInvite.module.css";

/*
 * The trail and the X are drawn in the sample picture's own pixels (1216x704)
 * and scaled with it: the picture covers the screen with `object-fit: cover`,
 * the overlay with `xMidYMid slice`, so both crop the same way.
 * From the little boat bottom left, up the beach, across the grass to the
 * well in the middle of the plaza.
 */
const TRAIL = "M 112 624 C 160 612 190 584 232 562 S 380 548 452 504 S 542 432 580 378";
const X_AT = { x: 608, y: 352 } as const;
const X_PATH = "M -16 -16 L 16 16 M 16 -16 L -16 16";

/**
 * Behind the letter: the island the bottle came from, as a treasure map.
 * `revealed` is true once the letter is folded away and the island is the
 * whole view. Decorative: the letter carries everything a reader needs.
 */
export function IslandMap({ revealed }: { revealed: boolean }) {
  // useId can contain characters a url(#...) reference does not accept.
  const maskId = `trail-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { width, height } = SHIFT_ISLAND.sample;

  return (
    <div className={styles.map} data-revealed={revealed || undefined} aria-hidden="true">
      <Image
        src={SHIFT_ISLAND.sample.src}
        width={width}
        height={height}
        alt=""
        unoptimized
        className={styles.mapImage}
      />
      <div className={styles.mapTint} />
      <svg
        className={styles.mapMarks}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          {/* Draws the dotted trail on, from the boat to the X. */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <path d={TRAIL} pathLength={1} className={styles.trailReveal} />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <path d={TRAIL} className={styles.trailShadow} />
          <path d={TRAIL} className={styles.trail} />
        </g>
        {/* The attribute places the X; CSS animates the inner group only. */}
        <g transform={`translate(${X_AT.x} ${X_AT.y})`}>
          <circle r="34" className={styles.xRing} />
          <g className={styles.xMark}>
            <path d={X_PATH} className={styles.xShadow} />
            <path d={X_PATH} className={styles.xStroke} />
          </g>
        </g>
      </svg>
      <span className={styles.mapTag}>{PROLOGUE_SAMPLE_TAG}</span>
    </div>
  );
}
