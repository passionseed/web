"use client";

import { useEffect } from "react";

/**
 * Logs one visit to /shift/alumni as a shift_page_view, the event the SHIFT
 * Views tab reads, so visits can be set against RSVPs. Never blocks the page.
 */
export function AlumniPageView() {
  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("utm_source");
    void fetch("/api/hackathon/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "shift_page_view",
        page_path: "/shift/alumni",
        event_data: source ? { source } : {},
      }),
      keepalive: true,
    }).catch(() => {});
  }, []);
  return null;
}
