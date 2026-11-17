"use client";

import { useCallback, useSyncExternalStore } from "react";

import { isFresh, type QuestResult } from "./results";

/**
 * localStorage key: when this viewer last opened the envelope on this
 * browser, `{ who, at }` (who = the quest member uuid, never the Discord id;
 * at = epoch ms). One entry per browser: on a shared device another
 * student's mark is ignored. AdminReset's clearIslandKeys removes it.
 */
export const RESULTS_SEEN_KEY = "shift-island-results-seen-v1";

interface Mark {
  who: string;
  at: number;
}

const listeners = new Set<() => void>();
// Private mode (storage that throws) keeps it for this page only.
let memory: Mark | null = null;

function readMark(): Mark | null {
  try {
    const raw = window.localStorage.getItem(RESULTS_SEEN_KEY);
    if (!raw) return memory;
    const value = JSON.parse(raw) as Partial<Mark>;
    return typeof value.who === "string" && value.who && typeof value.at === "number" ? { who: value.who, at: value.at } : null;
  } catch {
    return memory;
  }
}

/** When this viewer last opened the envelope on this browser, or null (never, or another viewer's mark). Client only. */
export function readResultsSeen(who: string | null): number | null {
  if (!who) return null;
  const mark = readMark();
  return mark && mark.who === who ? mark.at : null;
}

/** Marks the envelope as read now, for this viewer. Without a viewer key nothing is kept. */
export function markResultsSeen(who: string | null, at: number = Date.now()): void {
  if (!who) return;
  const mark: Mark = { who, at };
  memory = mark;
  try {
    window.localStorage.setItem(RESULTS_SEEN_KEY, JSON.stringify(mark));
  } catch {
    // The page still has it in memory.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * How many results are new to this viewer on this browser: the envelope's
 * dot. 0 on the server and while hydrating, and without a viewer key (there
 * is nowhere to keep the mark, so the dot could never clear).
 */
export function useFreshResults(results: readonly QuestResult[], who: string | null): number {
  const read = useCallback(() => {
    if (!who || results.length === 0) return 0;
    const seenAt = readResultsSeen(who);
    const now = Date.now();
    return results.filter((result) => isFresh(result, seenAt, now)).length;
  }, [results, who]);
  return useSyncExternalStore(subscribe, read, () => 0);
}

/**
 * The newest approval of the student's own work that is new to them on this
 * browser (the next-step card's ผ่านแล้ว), by its result key; null when there
 * is none. Null on the server, while hydrating and without a viewer key.
 */
export function useFreshApproval(results: readonly QuestResult[], who: string | null): QuestResult | null {
  const read = useCallback(() => {
    if (!who) return null;
    const seenAt = readResultsSeen(who);
    const now = Date.now();
    // results are newest first.
    return results.find((result) => result.outcome === "approved" && isFresh(result, seenAt, now))?.key ?? null;
  }, [results, who]);
  const key = useSyncExternalStore(subscribe, read, () => null);
  return key ? (results.find((result) => result.key === key) ?? null) : null;
}
