"use client";

import { useEffect } from "react";

import { TRACKED_SOURCE_RE } from "@/lib/hackathon/elemental/link-views-shared";

/**
 * Count this device once for a student's or teacher's share link
 * (?src=share-<code> or ?src=t-<code>). The server hashes the network address
 * and browser; nothing about the visitor is sent from here.
 */
export function TrackLinkView({ source }: { source?: string }) {
  useEffect(() => {
    if (!source || !TRACKED_SOURCE_RE.test(source)) return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") return;
    void fetch("/api/hackathon/elemental/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ src: source }),
      keepalive: true,
    }).catch(() => {});
  }, [source]);
  return null;
}
