"use client";

import { useEffect } from "react";

export function ShiftPageViewTracker({ pagePath = "/shift" }: { pagePath?: string }) {
  useEffect(() => {
    try {
      fetch("/api/hackathon/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: pagePath,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, [pagePath]);

  return null;
}
