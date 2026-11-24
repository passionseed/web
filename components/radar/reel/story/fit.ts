"use client";

/**
 * Fitting story text to its box. Lines break only between phrases (each
 * phrase is a no-wrap inline block, StoryText's Phrased), so a Thai word is
 * never cut; when a phrase is wider than the box, or the plate taller than
 * its room, the whole text steps down in size instead. Measured in a layout
 * effect and written straight to the element before the frame is painted, so
 * the size depends only on the text and the box: the same on every run, and
 * already final when a parent's own layout effect measures the layout.
 */
import { useLayoutEffect, type RefObject } from "react";

export interface FitOptions {
  /** CSS px to start from. */
  base: number;
  /** Never smaller than this (a phrase may then overflow rather than break). */
  min: number;
  /** The plate whose height must stay within `maxHeight`. */
  plate?: RefObject<HTMLElement | null>;
  maxHeight?: number;
}

/** How much smaller the text must get: 1 when it fits. */
export function overflowFactor(m: { avail: number; widest: number; height?: number; maxHeight?: number }): number {
  let k = 1;
  if (m.avail > 0 && m.widest > m.avail + 0.5) k = Math.min(k, m.avail / m.widest);
  if (m.maxHeight !== undefined && m.height !== undefined && m.height > m.maxHeight + 0.5) k = Math.min(k, Math.sqrt(m.maxHeight / m.height), 0.97);
  return k;
}

/** The next size to try after `size` overflowed by `factor` (always at least 1 px smaller, never below `min`). */
export function nextFitSize(size: number, factor: number, min: number): number {
  return Math.max(min, Math.min(size - 1, Math.floor(size * factor)));
}

function measure(el: HTMLElement, plate: HTMLElement | null, maxHeight: number | undefined) {
  const cs = getComputedStyle(el);
  const avail = el.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
  let widest = 0;
  el.querySelectorAll<HTMLElement>(".sr-phrase").forEach((p) => {
    widest = Math.max(widest, p.offsetWidth);
  });
  return { avail, widest, height: plate ? plate.offsetHeight : undefined, maxHeight };
}

/** Sets `el`'s font size to the largest step from `base` down at which it fits; returns it. */
export function fitText(el: HTMLElement, { base, min, plate, maxHeight }: FitOptions): number {
  let size = base;
  for (let i = 0; i < 40; i++) {
    el.style.fontSize = `${size}px`;
    if (size <= min) break;
    const k = overflowFactor(measure(el, plate?.current ?? null, maxHeight));
    if (k >= 1) break;
    size = nextFitSize(size, k, min);
  }
  el.dataset.fit = String(size);
  return size;
}

/** Fits the element in `ref` after every render (cheap: a few layout reads). */
export function useFitText(ref: RefObject<HTMLElement | null>, options: FitOptions): void {
  useLayoutEffect(() => {
    if (ref.current) fitText(ref.current, options);
  });
}
