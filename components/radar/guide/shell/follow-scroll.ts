/**
 * Keeps the newest thing in a level (a new step, a new dialogue box) in the
 * middle of the screen: the part between the sticky top rail and the sticky
 * "ต่อ" bar. Something too tall to fit lines up under the rail instead, so its
 * top is never cut off.
 */

const RAIL_FALLBACK = 60;
const NAV_FALLBACK = 72;

function cssPx(el: Element, name: string, fallback: number): number {
  const n = parseFloat(getComputedStyle(el).getPropertyValue(name));
  return Number.isFinite(n) ? n : fallback;
}

/** How far to scroll so `rect` sits in the middle of the area [top, bottom]. */
export function middleDelta(rect: { top: number; height: number }, top: number, bottom: number): number {
  const space = bottom - top;
  if (rect.height >= space) return rect.top - top;
  return rect.top + rect.height / 2 - (top + space / 2);
}

/** The newest piece of a step: its last dialogue box, or the step itself. */
export function latestIn(step: HTMLElement): HTMLElement {
  const rows = step.querySelectorAll<HTMLElement>(".rg-dialogue__row");
  return rows.length ? rows[rows.length - 1] : step;
}

export function scrollToMiddle(el: HTMLElement, reducedMotion: boolean): void {
  if (typeof window === "undefined" || typeof window.scrollBy !== "function") return;
  const top = cssPx(el, "--rg-rail-h", RAIL_FALLBACK);
  const bottom = window.innerHeight - cssPx(el, "--rg-nav-h", NAV_FALLBACK);
  const delta = middleDelta(el.getBoundingClientRect(), top, bottom);
  if (Math.abs(delta) < 2) return;
  window.scrollBy({ top: delta, behavior: reducedMotion ? "auto" : "smooth" });
}
