"use client";

import { useEffect } from "react";

const REFRESH_EVENT = "shift-island:refresh";
/** Browsers often fire visibilitychange and focus together on return. */
const RETURN_COOLDOWN_MS = 1_000;

/** Refresh all mounted island readers, including an open quest's local canvas data. */
export function refreshIsland() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** No polling: read on return, reconnect, or an explicit refresh. */
export function useIslandRefresh(refresh: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    let lastReturn = -Infinity;
    const onReturn = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastReturn < RETURN_COOLDOWN_MS) return;
      lastReturn = now;
      refresh();
    };
    window.addEventListener("focus", onReturn);
    window.addEventListener("online", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener(REFRESH_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("online", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener(REFRESH_EVENT, refresh);
    };
  }, [active, refresh]);
}
