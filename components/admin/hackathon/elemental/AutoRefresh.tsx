"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 60_000;

/**
 * Keeps the page fresh while it is open: refetches the server data every
 * minute while the tab is visible, and right away when the tab comes back.
 * Client state (open sheets, drafts) survives a refresh.
 */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = window.setInterval(refresh, EVERY_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  return null;
}
