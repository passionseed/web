"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";

import { useShiftGlobeScene } from "./ShiftGlobeScene";

import styles from "./shiftNext.module.css";

/**
 * Full-bleed hero: the WebGL planet behind server-rendered copy. three.js
 * loads after the page is usable; until then (or with no WebGL) a CSS orb
 * holds the planet's place so the layout never jumps.
 */

const ShiftGlobe = dynamic(() => import("./ShiftGlobe"), { ssr: false });

export function ShiftNextHero({ children, focusThailand = false }: {
  children: ReactNode;
  focusThailand?: boolean;
}) {
  const scene = useShiftGlobeScene();
  const [ready, setReady] = useState(false);
  const [arrived, setArrived] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onArrive = useCallback(() => setArrived(true), []);

  return (
    <header className={styles.hero}>
      <div className={styles.sky} aria-hidden="true" />
      {!scene && (
        <>
          <div className={styles.orb} data-ready={ready} aria-hidden="true" />
          <div className={styles.globe} data-ready={ready}>
            <ShiftGlobe onReady={onReady} onArrive={onArrive} focusThailand={focusThailand} />
          </div>
        </>
      )}
      {focusThailand && <div className={styles.focusShade} aria-hidden="true" />}
      {focusThailand && (
        <div className={styles.destination} data-arrived={scene ? scene.arrived : arrived} aria-hidden="true">
          ประเทศไทย · ออนไลน์บน Discord
        </div>
      )}
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
