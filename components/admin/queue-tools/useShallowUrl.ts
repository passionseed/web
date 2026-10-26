"use client";

import { useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type UrlWriteMode = "push" | "replace";

/**
 * URL state for client-filtered admin tools. Writes go through
 * window.history, which Next.js syncs with useSearchParams: the view re-renders
 * from the new URL at once, without a server round trip per filter change, and
 * Back/Forward still work. Use "push" for opening a record, "replace" for
 * filters and typing.
 */
export function useShallowUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const write = useCallback(
    (query: string, mode: UrlWriteMode = "replace") => {
      const next = query ? `${pathname}?${query}` : pathname;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next === current) return;
      if (mode === "push") window.history.pushState(null, "", next);
      else window.history.replaceState(null, "", next);
    },
    [pathname],
  );

  return { searchParams, write };
}
