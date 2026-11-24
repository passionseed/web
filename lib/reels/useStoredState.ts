"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useState that is saved in localStorage. It starts with `initial` on the
 * server and on the first client render, then loads the saved value, so
 * hydration always matches.
 */
export function useStoredState<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Private mode or bad JSON: keep the initial value.
    }
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage full or blocked: the value still works for this visit.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
