"use client";

import type { CSSProperties } from "react";

import { SAND, SeaCanvas } from "./BottleShore";
import { pixelRuns, SHIP } from "./shipArt";
import styles from "./islandInvite.module.css";
import { useReducedMotion } from "./useReducedMotion";

const SHIP_TONE: Record<string, string> = {
  h: styles.shipHull,
  H: styles.shipRail,
  d: styles.shipRig,
  s: styles.shipSail,
  S: styles.shipSailLit,
  m: styles.shipMast,
  f: styles.shipFlag,
  l: styles.shipLight,
  p: styles.shipPort,
  w: styles.shipGlint,
};

/** The ship (shipArt.ts) as one rect per run of the same tone in a row. */
const SHIP_RUNS = pixelRuns(SHIP);

/**
 * Behind the letter: the beach where the bottle landed, at dusk, with a ship
 * waiting offshore. The same sea as the shore scene. `revealed` is true once
 * the letter is folded away and the beach is the whole view. Decorative.
 */
export function ShoreBackdrop({ revealed }: { revealed: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div
      className={styles.backdrop}
      data-revealed={revealed || undefined}
      style={{ "--sand": `${SAND * 100}%` } as CSSProperties}
      aria-hidden="true"
    >
      <SeaCanvas still={reduced} sand={SAND} />
      <div className={styles.sand} />
      <div className={styles.ship}>
        <svg className={styles.shipArt} viewBox="0 0 40 26" shapeRendering="crispEdges" focusable="false">
          {SHIP_RUNS.map(({ x, y, w, key }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} className={SHIP_TONE[key]} />
          ))}
        </svg>
      </div>
      <div className={styles.backdropShade} />
    </div>
  );
}
