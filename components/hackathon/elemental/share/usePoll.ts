"use client";

import { useEffect, useRef } from "react";

import { SHARE } from "@/lib/hackathon/elemental/share";
import type { ShareLinkView } from "@/lib/hackathon/elemental/share-rules";

/**
 * Refresh a share link's numbers about every 20 seconds while the page is
 * on screen, and right away when it comes back. `url` null: don't poll
 * (no link yet, or a demo).
 */
export function usePollLink(url: string | null, onLink: (link: ShareLinkView) => void, every = SHARE.pollMs) {
  const callback = useRef(onLink);
  useEffect(() => {
    callback.current = onLink;
  }, [onLink]);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { link: ShareLinkView | null };
        if (alive && data.link) callback.current(data.link);
      } catch {
        // Offline for a moment: the next tick tries again.
      }
    };
    const timer = setInterval(tick, every);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, every]);
}
