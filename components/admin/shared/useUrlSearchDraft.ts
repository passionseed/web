"use client";

import { useEffect, useRef, useState } from "react";

const trim = (value: string) => value.trim();

/**
 * A search box backed by a URL param. The box updates at once and the URL
 * follows after a pause. The URL lands late (router.replace waits on the
 * server; history writes apply in a transition), so the box only takes the
 * URL's value when it changes to something this hook did not write (Back, a
 * link, Clear), never when it catches up with what the admin already typed.
 */
export function useUrlSearchDraft(
  urlValue: string,
  commit: (value: string) => void,
  {
    delayMs,
    normalize = trim,
  }: { delayMs: number; normalize?: (value: string) => string },
) {
  const [value, setValue] = useState(urlValue);
  const lastCommitted = useRef(urlValue);
  const commitRef = useRef(commit);
  const normalizeRef = useRef(normalize);
  useEffect(() => {
    commitRef.current = commit;
    normalizeRef.current = normalize;
  });

  // Follow the URL when it changes from outside.
  useEffect(() => {
    if (urlValue === lastCommitted.current) return;
    lastCommitted.current = urlValue;
    setValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    const next = normalizeRef.current(value);
    if (next === lastCommitted.current) return;
    const timer = window.setTimeout(() => {
      lastCommitted.current = next;
      commitRef.current(next);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return [value, setValue] as const;
}
