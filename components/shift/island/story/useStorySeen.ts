"use client";

import { useSyncExternalStore } from "react";

/** localStorage key: "seen" once the student skipped, closed or finished the story. */
export const STORY_SEEN_KEY = "shift-island-story-v1";

/** True when this browser has seen the story. Storage that throws (private mode) counts as not seen. */
export function readStorySeen(): boolean {
  try {
    return window.localStorage.getItem(STORY_SEEN_KEY) === "seen";
  } catch {
    return false;
  }
}

/** Remembers the story as seen; private mode simply shows it again next visit. */
export function markStorySeen(): void {
  try {
    window.localStorage.setItem(STORY_SEEN_KEY, "seen");
  } catch {
    // Nothing to do: the caller also remembers it for this page.
  }
}

const noSubscribe = () => () => {};

/**
 * Whether the story was seen, decided after mount: the server and the
 * hydration pass say "seen", so the overlay never renders into the HTML and
 * never mismatches; the client then reads localStorage.
 */
export function useStorySeen(): boolean {
  return useSyncExternalStore(noSubscribe, readStorySeen, () => true);
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

function readReduced(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED).matches;
}

/** prefers-reduced-motion, live. The server assumes motion is fine. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false);
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** False while the tab is hidden, so panels do not advance unseen. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState !== "hidden",
    () => true,
  );
}
