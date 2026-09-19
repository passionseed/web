"use client";

import { useEffect } from "react";

export function ShiftPageViewTracker() {
  useEffect(() => {
    try {
      fetch("/api/hackathon/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: "/shift",
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
        }),
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
