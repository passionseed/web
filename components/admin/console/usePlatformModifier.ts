"use client";

import { useSyncExternalStore } from "react";

type NavigatorWithUAData = Navigator & {
  userAgentData?: { platform?: string };
};

export function detectMac(nav: NavigatorWithUAData = navigator): boolean {
  const platform =
    nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

const noSubscribe = () => () => {};

/**
 * "⌘" on Apple devices, "Ctrl" elsewhere, and null during server render and
 * hydration so the markup always matches. Updates right after hydration.
 */
export function usePlatformModifier(): "⌘" | "Ctrl" | null {
  return useSyncExternalStore(
    noSubscribe,
    () => (detectMac() ? "⌘" : "Ctrl"),
    () => null,
  );
}
