"use client";

import { useSyncExternalStore } from "react";

/**
 * prefers-reduced-motion, live: the one hook for the whole island, the game
 * (QuestBoard, the story overlay, via story/useStorySeen) and the invite
 * (prologue, bottle, seal).
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener?.("change", onChange);
  return () => media.removeEventListener?.("change", onChange);
}

function read(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
}

/**
 * True when the visitor asks for less motion. False during server render and
 * hydration so the markup matches; the CSS media query covers that moment.
 * Without matchMedia (old browsers, tests) motion is assumed fine.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
