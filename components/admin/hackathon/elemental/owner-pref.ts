"use client";

import { useSyncExternalStore } from "react";

import { OWNERS, type Owner } from "@/lib/hackathon/elemental/targets";
import type { OwnerFilter } from "@/lib/hackathon/elemental/today";

/**
 * Which owner this browser looks at ("Big", "Angpao", "Kirt" or "all").
 * Remembered in localStorage; everything works without it (private mode,
 * blocked storage), it just starts at "all" each time.
 */

const KEY = "elemental-dashboard-owner";
const EVENT = "elemental-owner-change";

function read(): OwnerFilter {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && (OWNERS as readonly string[]).includes(v) ? (v as Owner) : "all";
  } catch {
    return "all";
  }
}

export function setOwnerPref(v: OwnerFilter): void {
  try {
    window.localStorage.setItem(KEY, v);
    memory = null;
  } catch {
    // Storage blocked: keep the choice for this page only.
    memory = v;
  }
  window.dispatchEvent(new Event(EVENT));
}

let memory: OwnerFilter | null = null;

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const snapshot = () => memory ?? read();

export function useOwnerPref(): OwnerFilter {
  return useSyncExternalStore(subscribe, snapshot, () => "all");
}
