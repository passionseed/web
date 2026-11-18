"use client";

import { useCallback, useSyncExternalStore } from "react";

import { bangkokDay } from "@/lib/shift-island/festival";

/**
 * localStorage key: today's check-in intention on this browser,
 * `{ day, text, who }` (day = bangkokDay, who = the quest member uuid, never
 * the Discord id). One entry per browser: a shared device keeps only the last
 * student's, and shows it back only to that student. Entries without `who`
 * (written before it was added) are never shown and are overwritten by the
 * next check-in. AdminReset's clearIslandKeys removes it.
 */
export const DAY_INTENTION_KEY = "shift-island-intent-v1";

interface Kept {
  day: number;
  text: string;
  who: string;
}

const listeners = new Set<() => void>();
// Private mode (storage that throws) keeps it for this page only.
let memory: Kept | null = null;

function readKept(): Kept | null {
  try {
    const raw = window.localStorage.getItem(DAY_INTENTION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Kept>;
    return typeof value.day === "number" && typeof value.text === "string" && typeof value.who === "string" && value.who
      ? { day: value.day, text: value.text, who: value.who }
      : null;
  } catch {
    return memory;
  }
}

/** Today's intention for this viewer, or null (another viewer's, or none kept today: a new Bangkok day starts empty). */
function readToday(who: string | null): string | null {
  if (!who) return null;
  const kept = readKept();
  return kept && kept.who === who && kept.day === bangkokDay(Date.now()) ? kept.text : null;
}

/**
 * Remembers what the student meant to do today, to show it back on the
 * check-in card later that day, to them only. Without a viewer key nothing is
 * kept on the device.
 */
export function keepDayIntention(text: string, who: string | null): void {
  if (!who) return;
  const kept: Kept = { day: bangkokDay(Date.now()), text, who };
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

/** This viewer's check-in intention for today on this browser; null on the server, while hydrating, and for anyone else. */
export function useDayIntention(who: string | null): string | null {
  const read = useCallback(() => readToday(who), [who]);
  return useSyncExternalStore(subscribe, read, () => null);
}
