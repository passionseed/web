"use client";

import { useEffect } from "react";

/**
 * Scrolls a server-rendered element into view once and moves focus to it, for
 * ?id= deep links. Give the target tabIndex={-1} so it can take focus.
 */
export function ScrollToElement({ elementId }: { elementId: string }) {
  useEffect(() => {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.scrollIntoView({ block: "center" });
    element.focus({ preventScroll: true });
  }, [elementId]);

  return null;
}
