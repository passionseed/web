"use client";

import { useSyncExternalStore } from "react";

import { bangkokDay } from "@/lib/shift-island/festival";

/** localStorage key: today's check-in intention on this browser, `{ day, text }` (day = bangkokDay). */
export const DAY_INTENTION_KEY = "shift-island-intent-v1";

interface Kept {
  day: number;
  text: string;
}

const listeners = new Set<() => void>();
// Private mode (storage that throws) keeps it for this page only.
let memory: Kept | null = null;

function readKept(): Kept | null {
  try {
    const raw = window.localStorage.getItem(DAY_INTENTION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Kept>;
    return typeof value.day === "number" && typeof value.text === "string" ? { day: value.day, text: value.text } : null;
  } catch {
    return memory;
  }
}

/** Today's intention, or null when none was kept today (a new Bangkok day starts empty). */
function readToday(): string | null {
  const kept = readKept();
  return kept && kept.day === bangkokDay(Date.now()) ? kept.text : null;
}

/** Remembers what the student meant to do today, to show it back on the check-in card later that day. */
export function keepDayIntention(text: string): void {
  const kept = { day: bangkokDay(Date.now()), text };
  memory = kept;
  try {
    window.localStorage.setItem(DAY_INTENTION_KEY, JSON.stringify(kept));
  } catch {
    // The page still has it in memory.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Today's check-in intention on this browser; null on the server and while hydrating. */
export function useDayIntention(): string | null {
  return useSyncExternalStore(subscribe, readToday, () => null);
}
