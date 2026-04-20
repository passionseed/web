import { UMAP } from "umap-js";

/**
 * Project a set of high-dim vectors to 2D using UMAP. For very small inputs
 * (< 4 rows) UMAP cannot build a meaningful neighborhood graph, so we fall
 * back to a deterministic grid layout — good enough for the scatter plot.
 */
export function project2D(vectors: number[][]): number[][] {
  const n = vectors.length;
  if (n === 0) return [];
  if (n < 4) {
    return vectors.map((_, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(n, 1);
      return [Math.cos(angle), Math.sin(angle)];
    });
  }

  const nNeighbors = Math.min(15, Math.max(2, n - 1));
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors,
    minDist: 0.1,
    spread: 1.0,
    random: mulberry32(42),
  });
  return umap.fit(vectors);
}

// Seeded PRNG so the same set of embeddings projects to the same 2D coords
// across reclusters — keeps the UI stable for admins flipping through runs.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
