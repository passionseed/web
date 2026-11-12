"use client";

import { useSyncExternalStore } from "react";

import { bangkokDay, msToBangkokMidnight } from "@/lib/shift-island/festival";

/** A beat past midnight, so the timer never lands a hair before it. */
const PAST_MIDNIGHT_MS = 1000;

/**
 * One timer to the next Bangkok midnight, re-armed each time, plus a check
 * when the tab shows again (a sleeping laptop misses timers). No render
 * unless the date changed: the snapshot is a number.
 */
function subscribe(onChange: () => void): () => void {
  let timer: number | undefined;
  const arm = () => {
    timer = window.setTimeout(() => {
      onChange();
      arm();
    }, msToBangkokMidnight(Date.now()) + PAST_MIDNIGHT_MS);
  };
  arm();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const getSnapshot = () => bangkokDay(Date.now());
/** The server and hydration use the server's own days_to_demo (null here). */
const getServerSnapshot = () => null;

/** Today's Bangkok date (bangkokDay), rolling over at Bangkok midnight; null on the server and while hydrating. */
export function useBangkokDay(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
