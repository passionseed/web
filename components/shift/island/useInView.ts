"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True once the element has been on screen. Touch screens have no hover, so
 * they light a control's glow when it scrolls into view instead.
 */
export function useInView(ref: RefObject<HTMLElement | null>, threshold = 0.6): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return seen;
}
