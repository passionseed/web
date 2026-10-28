import { Rects } from "@/components/shift/poster/pixel/PixelRects";
import { stars } from "@/components/shift/poster/pixel/halloween/halloweenKit";
import { NightScene, STRIP, graveyardStrip } from "@/components/shift/theme/halloween";

import styles from "./halloween.module.css";

/**
 * The SHIFT[3] Halloween night on the /shift gallery: the same scene as the
 * /shift/3 round page (components/shift/theme/halloween.tsx) stands where
 * the globe was, the night sky sits fixed behind the page, and the round
 * page's graveyard strip closes it at the foot.
 */

/** The gallery hero is a full screen tall, so it keeps the student's side at every width. */
export function ShiftHalloweenScene() {
  return (
    <>
      <NightScene anchor="xMax" className={styles.scene} />
      <div className={`${styles.scrim} ${styles.phoneOnly}`} aria-hidden="true" />
    </>
  );
}

/** Fixed night behind the whole page: one-cell stars on the poster's ink. */
export function ShiftHalloweenNight() {
  const rects = stars(0, 200, 150, 320);
  return (
    <div className={styles.night} aria-hidden="true">
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges">
        <Rects rects={rects.filter((_, i) => i % 3 !== 0)} />
        <g className={styles.twinkle}>
          <Rects rects={rects.filter((_, i) => i % 3 === 0)} />
        </g>
      </svg>
    </div>
  );
}

/** The round page's graveyard strip, above the gallery footer. */
export function ShiftHalloweenGround() {
  return (
    <div className={styles.ground} aria-hidden="true">
      <svg viewBox={`0 0 ${STRIP.w} ${STRIP.h}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
        <Rects rects={graveyardStrip()} />
      </svg>
    </div>
  );
}
