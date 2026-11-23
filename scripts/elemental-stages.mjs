/**
 * The Elemental story's timing, shared by render-elemental-plate.mjs and
 * render-elemental-gif.mjs. At corruption level c (0 clean, 1 the poster)
 * each element has spread stage(c) of the way, 0..1. They arrive in order:
 * the e-waste is dumped, it leaks into the river, the fire takes hold, and
 * its smoke spreads over the hills.
 */
export const STAGES = {
  earth: [0, 0.3],
  water: [0.15, 0.46],
  fire: [0.36, 0.74],
  air: [0.58, 1],
};

export function stage(name, c) {
  const [a, b] = STAGES[name];
  if (c >= b) return 1;
  const t = Math.min(1, Math.max(0, (c - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
