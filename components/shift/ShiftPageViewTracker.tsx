"use client";

import { useEffect } from "react";
import { trackShiftEvent } from "@/lib/shift/attribution";

export function ShiftPageViewTracker({ pagePath = "/shift" }: { pagePath?: string }) {
  useEffect(() => {
    trackShiftEvent("shift_page_view", { path: pagePath });
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
