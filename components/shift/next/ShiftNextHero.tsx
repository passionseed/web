"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";

import styles from "./shiftNext.module.css";

/**
 * Full-bleed hero: the WebGL planet behind server-rendered copy. three.js
 * loads after the page is usable; until then (or with no WebGL) a CSS orb
 * holds the planet's place so the layout never jumps.
 */

const ShiftGlobe = dynamic(() => import("./ShiftGlobe"), { ssr: false });

export function ShiftNextHero({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <header className={styles.hero}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.orb} data-ready={ready} aria-hidden="true" />
      <div className={styles.globe} data-ready={ready}>
        <ShiftGlobe onReady={onReady} />
      </div>
      <div className={styles.heroFade} aria-hidden="true" />
      {children}
    </header>
  );
}

/** The fixed nebula and starfield behind the whole page. */
export function ShiftNextCosmos() {
  return (
    <div className={styles.cosmos} aria-hidden="true">
      <div className={styles.nebula} />
      <div className={styles.nebula} />
      <div className={styles.nebula} />
      <div className={styles.stars} />
      <div className={styles.stars} data-near />
    </div>
  );
}
