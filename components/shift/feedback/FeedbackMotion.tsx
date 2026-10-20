"use client";

import { useEffect } from "react";

/**
 * Calm entrances for /shift/feedback: each question drifts up into place as
 * it scrolls into view, on touch and desktop alike. Progressive enhancement:
 * questions stay visible until this runs, and reduced motion skips it.
 */
export function FeedbackMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = document.querySelector<HTMLElement>("[data-feedback-panel]");
    if (!panel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-in-view", "true");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    // Anything already on screen settles in at once, without waiting a frame.
    const targets = panel.querySelectorAll("form > fieldset, form > p");
    targets.forEach((element) => {
      const top = element.getBoundingClientRect().top;
      if (top < window.innerHeight * 0.92) element.setAttribute("data-in-view", "true");
      else observer.observe(element);
    });
    panel.setAttribute("data-motion", "true");
    return () => observer.disconnect();
  }, []);

  return null;
}
