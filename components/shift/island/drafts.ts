"use client";

import { useCallback, useState } from "react";

/**
 * Unsent text from the island's sheets (proof, a proposed quest, a help
 * request), kept outside the sheet content. A sheet unmounts its body when it
 * closes, and a phone closes a bottom sheet on a downward swipe, so without
 * this a stray swipe would throw away a long draft. Lives in this tab's memory
 * only: never stored or sent anywhere, gone on reload.
 */
const drafts = new Map<string, unknown>();

type Update<T> = T | ((current: T) => T);

/**
 * useState for a draft that survives its component unmounting. The value is
 * read back on the next mount with the same key; `clear` drops it (after a
 * successful send).
 */
export function useDraft<T>(key: string, empty: T): [T, (next: Update<T>) => void, () => void] {
  const [value, setValue] = useState<T>(() => (drafts.has(key) ? (drafts.get(key) as T) : empty));

  const update = useCallback(
    (next: Update<T>) => {
      setValue((current) => {
        const value = typeof next === "function" ? (next as (current: T) => T)(current) : next;
        drafts.set(key, value);
        return value;
      });
    },
    [key]
  );

  const clear = useCallback(() => {
    drafts.delete(key);
    setValue(empty);
  }, [key, empty]);

  return [value, update, clear];
}

/** Drops every draft (tests). */
export function clearAllDrafts(): void {
  drafts.clear();
}
