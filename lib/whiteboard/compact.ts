/**
 * Makes pen strokes and lines smaller before they are stored, without any
 * visible change. On the Shift[3] board (2026-11-10) strokes were most of its
 * 5.8 MB: each point is stored like [13.33333333333303, 31.666666666666742],
 * and a pen reports far more points than the shape needs.
 *
 * - Coordinates and pressures keep 2 decimals (a hundredth of a pixel).
 * - Points that lie within half a pixel of the line through their kept
 *   neighbours are dropped (Douglas-Peucker), for lines and for pen strokes
 *   drawn with real pressure (stylus). Mouse and finger strokes keep every
 *   point: Excalidraw works out their thickness from the spacing between
 *   points, so dropping some would change how thick they look. Arrows are not
 *   touched at all (bindings and elbow segments refer to their exact points).
 *
 * Only the stored copy changes. The drawer's own browser keeps its full copy
 * until the next load, and the version is untouched, so nothing re-syncs.
 */

type Point = [number, number];

/** Half a pixel at 100% zoom. */
const TOLERANCE = 0.5;
/** Lines with fewer points were placed point by point, so every point is deliberate. */
const MIN_LINE_POINTS = 5;

const round2 = (n: number) => Math.round(n * 100) / 100;

const isPoint = (p: unknown): p is Point =>
  Array.isArray(p) && p.length >= 2 && typeof p[0] === "number" && typeof p[1] === "number" && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** Distance from p to the segment a-b. */
function offset(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** Indexes of the points to keep (always the first and last), in order. */
export function simplify(points: readonly Point[], tolerance = TOLERANCE): number[] {
  if (points.length < 3) return points.map((_, i) => i);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    let far = -1;
    let farthest = tolerance;
    for (let i = from + 1; i < to; i++) {
      const d = offset(points[i], points[from], points[to]);
      if (d > farthest) {
        farthest = d;
        far = i;
      }
    }
    if (far !== -1) {
      keep[far] = 1;
      stack.push([from, far], [far, to]);
    }
  }
  const out: number[] = [];
  keep.forEach((k, i) => k && out.push(i));
  return out;
}

type Element = Record<string, unknown>;

/** One element, slimmed if it is a stroke or a line; anything else, or anything malformed, is returned as it was. */
export function compactElement<T extends object>(el: T): T {
  const e = el as Element;
  const type = e.type;
  if (type !== "freedraw" && type !== "line") return el;
  const points = e.points;
  if (!Array.isArray(points) || points.length === 0 || !points.every(isPoint)) return el;

  const pressures = Array.isArray(e.pressures) && e.pressures.every((p) => typeof p === "number") ? (e.pressures as number[]) : null;
  const pressuresMatch = pressures !== null && pressures.length === points.length;

  let keep: number[] | null = null;
  if (type === "line" && points.length >= MIN_LINE_POINTS) keep = simplify(points);
  // Stylus strokes: their pressures say how thick each point is, so drop points together with their pressures.
  if (type === "freedraw" && e.simulatePressure === false && pressuresMatch && points.length >= 3) keep = simplify(points);

  const kept = keep ? keep.map((i) => points[i]) : points;
  const next: Element = { ...e, points: kept.map((p) => [round2(p[0]), round2(p[1])]) };
  if (pressures) {
    const keptPressures = keep && pressuresMatch ? keep.map((i) => pressures[i]) : pressures;
    next.pressures = keptPressures.map(round2);
  }
  if (isPoint(e.lastCommittedPoint)) next.lastCommittedPoint = [round2(e.lastCommittedPoint[0]), round2(e.lastCommittedPoint[1])];
  return next as T;
}

/** Slims every stroke and line in a save. */
export function compactElements<T extends object>(elements: readonly T[]): T[] {
  return elements.map(compactElement);
}
