"use client";

import { FUNNEL_EVENT_TYPE, type FunnelEventData } from "@/lib/hackathon/elemental/funnel";

/**
 * Send one funnel event (see lib/hackathon/elemental/funnel.ts). The id is a
 * random one kept in this browser, so the admin page can follow one person
 * from the landing page to paying without knowing who they are. Never put a
 * name, contact or answer in an event.
 */

const SID_KEY = "elemental-sid";

function browserId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "no-storage";
  }
}

/** Steps already sent from this page load, so a re-render or going back doesn't count twice. */
const sent = new Set<string>();

export function trackElemental(event: Omit<FunnelEventData, "sid" | "host">, { once = true } = {}) {
  if (typeof window === "undefined") return;
  // Local dev talks to the production database: keep test clicks out of the funnel.
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;
  const key = `${event.step}:${event.detail ?? ""}`;
  if (once && sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({
    event_type: FUNNEL_EVENT_TYPE,
    page_path: window.location.pathname.startsWith("/hackathon/join/") ? "/hackathon/join/[token]" : window.location.pathname,
    event_data: { ...event, sid: browserId() },
  });
  void fetch("/api/hackathon/track-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
