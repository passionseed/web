"use client";

import { useCallback, useRef } from "react";

/**
 * Builds the next URL state on top of the latest one requested, not the one
 * rendered. router.replace on a dynamic admin page waits on the server, and
 * useSearchParams keeps the old value meanwhile, so a filter change made in
 * that window must keep the search (or page) the admin just asked for.
 *
 * `renderedKey` is the rendered query string. Once it changes (the request
 * landed, or Back moved the URL), the rendered state is the truth again.
 */
export function usePendingQuery<T extends object>(
  rendered: T,
  renderedKey: string,
) {
  const pending = useRef<{ base: string; next: T } | null>(null);

  return useCallback(
    (patch: Partial<T>): T => {
      const latest =
        pending.current && pending.current.base === renderedKey
          ? pending.current.next
          : rendered;
      const next = { ...latest, ...patch };
      pending.current = { base: renderedKey, next };
      return next;
    },
    [rendered, renderedKey],
  );
}
