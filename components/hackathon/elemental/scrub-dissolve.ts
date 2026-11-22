/**
 * Block dissolve for the scroll chapters: instead of 36 frames, the page
 * loads a few keyframes and swaps the next one in block by block as you
 * scroll. Same glitch look, about a sixth of the download.
 */

/** Size of one dissolve block on the 600x750 canvas. */
export const DISSOLVE_BLOCK_PX = 15;

/** Stable number from a string, so each chapter keeps its own pattern. */
export function seedFromKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * One threshold in [0, 1) per block (mulberry32). A block shows the next
 * keyframe once the mix passes its threshold, so scrolling back reverses the
 * same pattern.
 */
export function blockThresholds(count: number, seed: number): Float32Array {
  const out = new Float32Array(count);
  let state = seed >>> 0;
  for (let i = 0; i < count; i++) {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return out;
}

/** Scroll progress (0 to 1) to the pair of keyframes on screen and how far the second has come in. */
export function keyframeBlend(
  progress: number,
  keyframeCount: number,
): { from: number; to: number; mix: number } {
  if (keyframeCount < 2) return { from: 0, to: 0, mix: 0 };
  const span = keyframeCount - 1;
  const position = Math.min(span, Math.max(0, progress * span));
  const from = Math.min(span - 1, Math.floor(position));
  return { from, to: from + 1, mix: position - from };
}
