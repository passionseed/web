"use client";

import { useEffect } from "react";

const DEFAULT_SELECTOR =
  ".ei-card, .dawn-card, .ei-button-dawn, .ei-button-dusk";

interface InViewAnimatorProps {
  /** CSS selector for elements whose hover animation needs a touch fallback */
  selector?: string;
  /** How much of the element must be visible before the animation fires */
  threshold?: number;
  /**
   * Also pick up matching elements added after mount (client-rendered lists,
   * portaled sheets and dialogs), by watching document.body for new nodes.
   */
  watch?: boolean;
}

/**
 * Touch fallback for the design system's hover-driven glow animations.
 *
 * Dusk/Dawn components build their glow with `:hover` keyframes, which never
 * fire on touch devices. This adds the `.in-view` class the `@media (hover:
 * none)` rules in globals.css listen for, so mobile users see the same
 * atmosphere. Renders nothing.
 */
export function InViewAnimator({
  selector = DEFAULT_SELECTOR,
  threshold = 0.4,
  watch = false,
}: InViewAnimatorProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Pointer devices drive these animations through :hover already.
    if (window.matchMedia("(hover: hover)").matches) return;

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        }),
      { threshold },
    );

    document
      .querySelectorAll(selector)
      .forEach((element) => observer.observe(element));

    let mutations: MutationObserver | null = null;
    if (watch && typeof MutationObserver !== "undefined") {
      mutations = new MutationObserver((records) => {
        for (const record of records) {
          record.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches(selector)) observer.observe(node);
            node.querySelectorAll(selector).forEach((element) => observer.observe(element));
          });
        }
      });
      mutations.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      mutations?.disconnect();
      observer.disconnect();
    };
  }, [selector, threshold, watch]);

  return null;
}
