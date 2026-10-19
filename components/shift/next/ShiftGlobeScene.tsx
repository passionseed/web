"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import styles from "./shiftNext.module.css";

const ShiftGlobe = dynamic(() => import("./ShiftGlobe"), { ssr: false });
const SceneContext = createContext<{
  ready: boolean;
  arrived: boolean;
  navigateToNext: () => void;
} | null>(null);

export const useShiftGlobeScene = () => useContext(SceneContext);

/** The canvas belongs to the layout, so client navigation never replaces it. */
export function ShiftGlobeScene({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [departing, setDeparting] = useState(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, []);
  const [route, setRoute] = useState({ current: pathname, from: "", arrived: false });
  const [ready, setReady] = useState(false);
  if (route.current !== pathname) {
    setRoute({ current: pathname, from: route.current ?? "", arrived: false });
    setDeparting(false);
  }
  const onReady = useCallback(() => setReady(true), []);
  const onArrive = useCallback(() => setRoute((current) => ({ ...current, arrived: true })), []);
  const active = pathname === "/shift" || pathname === "/shift/next" || pathname === "/shift/alumni";
  const focusThailand = pathname === "/shift/next" || departing;
  const animateFocus = route.from === "/shift" || departing;
  const navigateToNext = useCallback(() => {
    if (navigationTimer.current) return;
    setDeparting(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    navigationTimer.current = setTimeout(() => {
      navigationTimer.current = null;
      router.push("/shift/next");
    }, reduced ? 0 : 240);
  }, [router]);

  if (!active) return children;

  return (
    <SceneContext.Provider value={{ ready, arrived: route.arrived, navigateToNext }}>
      <div className={`${styles.page} ${styles.persistentHost}`} data-departing={departing}>
        <div className={styles.persistentStage} aria-hidden="true">
          <div className={styles.orb} data-ready={ready} />
          <div className={styles.globe} data-ready={ready}>
            <ShiftGlobe focusThailand={focusThailand} animateFocus={animateFocus} onReady={onReady} onArrive={onArrive} />
          </div>
        </div>
        {children}
      </div>
    </SceneContext.Provider>
  );
}

/** Begin the continuous flight and let outgoing copy clear before navigation. */
export function ShiftJourneyLink({ children, className }: { children: ReactNode; className?: string }) {
  const scene = useShiftGlobeScene();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!scene || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    scene.navigateToNext();
  };
  return <Link href="/shift/next" className={className} onClick={onClick}>{children}</Link>;
}
