import { waterColor } from "@/lib/shift-island/live/lighting";

import { COMMON } from "./copy";
import styles from "./world.module.css";

/** The full-screen sea with the HUD's shapes, while the server reads the student's island. */
export function IslandSkeleton() {
  return (
    <div role="status" aria-label={COMMON.loading}>
      <div className={styles.world} style={{ background: waterColor("day") }} />
      <div className={styles.hud} aria-hidden="true">
        <div className={styles.hudTop}>
          <span className={`${styles.skeletonBlock} ${styles.skeletonChip}`} />
          <div className={styles.hudButtons}>
            <span className={`${styles.skeletonBlock} ${styles.skeletonRound}`} />
            <span className={`${styles.skeletonBlock} ${styles.skeletonRound}`} />
          </div>
        </div>
        <div className={styles.hudBottom}>
          <span className={`${styles.skeletonBlock} ${styles.skeletonBar}`} />
        </div>
      </div>
    </div>
  );
}
