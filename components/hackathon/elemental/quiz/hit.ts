import type { CSSProperties } from "react";

import type { ElementKey } from "@/components/hackathon/elemental/media";

import styles from "./quiz.module.css";

/**
 * How an icon reacts when its moment lands (the reveal, or a tap), in the
 * element's own way: fire shakes and settles, earth slams down, water dips
 * as its splash lands, air is shoved right by the wind from the left. Aether
 * doesn't move: its pixels already flicker. Whole steps, no easing, like the
 * effects (quiz.module.css).
 */
const HIT: Record<ElementKey, string | undefined> = {
  fire: styles.hitFire,
  earth: styles.hitEarth,
  water: styles.hitWater,
  air: styles.hitAir,
  aether: undefined,
};

export const hitClass = (element: ElementKey) => HIT[element];

/**
 * The sizes of a hit, in whole screen pixels, from an icon pixel of `cell`:
 * large about a third of it, medium two ninths, small a ninth. At the
 * reveal (18 px a pixel) that is 6, 4 and 2 px.
 */
export const hitStyle = (cell: number) =>
  ({
    "--hit-l": `${Math.max(1, Math.round(cell / 3))}px`,
    "--hit-m": `${Math.max(1, Math.round((cell * 2) / 9))}px`,
    "--hit-s": `${Math.max(1, Math.round(cell / 9))}px`,
  }) as CSSProperties;
