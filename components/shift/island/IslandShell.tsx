import type { ReactNode } from "react";

import { DawnScene } from "@/components/projectseed/dawn-scene";
import { InViewAnimator } from "@/components/ui/in-view-animator";

import styles from "./island.module.css";

/** Touch devices replay the hover glows when these come into view. */
const GLOW_SELECTOR = ".ei-button-dawn, [data-island-glow]";

/**
 * The page frame for /shift/island: no site chrome, so the page can later run
 * on its own (a Discord Activity). Gates and the start card sit on the Dawn
 * sky in a centred column. `immersive` is the island itself: a full-screen
 * world that brings its own sea, so no sky and no column. Every state (and the
 * sheets that portal to <body>) gets the touch glows, including elements that
 * appear after the first paint.
 */
export function IslandShell({ children, immersive = false }: { children: ReactNode; immersive?: boolean }) {
  return (
    <main lang="th" className={`dawn-theme ${styles.page}`} data-immersive={immersive ? "true" : undefined}>
      {immersive ? null : <DawnScene />}
      <InViewAnimator selector={GLOW_SELECTOR} watch />
      {immersive ? children : <div className={styles.content}>{children}</div>}
    </main>
  );
}
