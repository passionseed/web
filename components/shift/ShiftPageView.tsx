"use client";

import { useEffect } from "react";
import { getShiftSource } from "@/lib/shift/attribution";

/**
 * Logs one visit to a SHIFT page as a shift_page_view, the event the admin
 * SHIFT Views tab reads. MetaPixel only reports to Meta, so mount this next to
 * it on every page the tab lists. Never blocks the page.
 */
export function ShiftPageView({ pagePath }: { pagePath: string }) {
  useEffect(() => {
    const source = getShiftSource();
    void fetch("/api/hackathon/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "shift_page_view",
        page_path: pagePath,
        event_data: source ? { source } : {},
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pagePath]);
  return null;
}
