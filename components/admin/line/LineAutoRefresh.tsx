"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-reads the inbox while the tab is visible, so new LINE messages show up on their own. */
export function LineAutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs]);

  return null;
}
