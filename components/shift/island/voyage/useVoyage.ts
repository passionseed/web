"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { readStorySeen } from "../story/useStorySeen";
import { VOYAGE_PARAM } from "./link";

/** localStorage key: "seen" once the student has crossed (finished, skipped or closed). */
export const VOYAGE_SEEN_KEY = "shift-island-voyage-v1";

export function readVoyageSeen(): boolean {
  try {
    return window.localStorage.getItem(VOYAGE_SEEN_KEY) === "seen";
  } catch {
    return false;
  }
}

function markVoyageSeen(): void {
  try {
    window.localStorage.setItem(VOYAGE_SEEN_KEY, "seen");
  } catch {
    // Private mode: the page remembers it for this visit.
  }
}

/**
 * A first arrival: neither the crossing nor the island story seen on this
 * browser. Students who were on the island before the crossing existed have
 * seen the story, so they are not sent back to sea.
 */
function readFirstArrival(): boolean {
  return !readVoyageSeen() && !readStorySeen();
}

const noSubscribe = () => () => {};

/** The `?at=voyage` the ticket added: dropped once crossed, so a reload does not sail again. */
function dropVoyageParam(): void {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("at") !== VOYAGE_PARAM) return;
    url.searchParams.delete("at");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Nothing to tidy.
  }
}

export interface Voyage {
  /** The crossing is on screen (the island story waits for it). */
  open: boolean;
  /** On screen and the circle not open yet: the island underneath stays still, under the night. */
  holding: boolean;
  reveal: () => void;
  close: () => void;
}

/**
 * Whether the crossing plays: on a first arrival, or when the ticket sent the
 * student here (`forced`). Decided after mount, like the story: the server and
 * the hydration pass say "not open", so nothing mismatches.
 */
export function useVoyage(forced: boolean): Voyage {
  const firstArrival = useSyncExternalStore(noSubscribe, readFirstArrival, () => false);
  const [closed, setClosed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const open = !closed && (forced || firstArrival);

  const reveal = useCallback(() => setRevealing(true), []);
  const close = useCallback(() => {
    markVoyageSeen();
    dropVoyageParam();
    setClosed(true);
    setRevealing(false);
  }, []);

  return { open, holding: open && !revealing, reveal, close };
}
