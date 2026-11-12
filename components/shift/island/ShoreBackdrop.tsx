"use client";

import type { CSSProperties } from "react";

import { SAND, SeaCanvas } from "./BottleShore";
import styles from "./islandInvite.module.css";
import { useReducedMotion } from "./useReducedMotion";

/*
 * A ship at anchor on the horizon, 40x26, bow to the left. Lit from the sun
 * setting to its right. h: hull, H: its lit rail, d: masts and rigging,
 * s: sail, S: sail in the sun, m: mast behind a sail, f: flag, l: lit window,
 * p: gun port, w: a glint on the water below.
 */
const SHIP = [
  ".............dff........................",
  ".............df.........................",
  "........ddddddddddd.....................",
  ".........ssssmssSS.....dff..............",
  ".........ssssmssSS.....d................",
  ".........ssssmssSS.ddddddddd............",
  "........sssssmsssSS.sssmsSS.............",
  "........sssssmsssSS.sssmsSS.............",
  ".............d.....ssssmssSS............",
  ".......ddddddddddddssssmssSS............",
  "........sssssmsssSS....d................",
  "........sssssmsssSddddddddddd...........",
  "........sssssmsssSSssssmssSS............",
  ".......ssssssmssssSssssmssSS............",
  ".......ssssssmssssSssssmssSS........l...",
  ".......ssssssmsssssssssmsssSS.......d...",
  "d............d....sssssmsssSSHHHHHHH....",
  ".dd..........d.........d.....hhlhlhh....",
  "...dd........d.........d.....hhhhhhh....",
  "....HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH....",
  "....hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh....",
  ".....hhphhhphhhphhhphhhphhhphhhphhhh....",
  "......hhhhhhhhhhhhhhhhhhhhhhhhhhhhh.....",
  "........hhhhhhhhhhhhhhhhhhhhhhhhhh......",
  "..........hhhhhhhhhhhhhhhhhhhhhh........",
  "........w..w..w..w..w..w..w..w..........",
] as const;

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

/** One rect per run of the same tone in a row. */
const SHIP_RUNS = SHIP.flatMap((row, y) => {
  const runs: { x: number; y: number; w: number; tone: string }[] = [];
  let x = 0;
  while (x < row.length) {
    const tone = row[x];
    let end = x + 1;
    while (end < row.length && row[end] === tone) end++;
    if (tone !== ".") runs.push({ x, y, w: end - x, tone });
    x = end;
  }
  return runs;
});

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
          {SHIP_RUNS.map(({ x, y, w, tone }) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} className={SHIP_TONE[tone]} />
          ))}
        </svg>
      </div>
      <div className={styles.backdropShade} />
    </div>
  );
}
