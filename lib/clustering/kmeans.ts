import { kmeans } from "ml-kmeans";

export type KMeansRun = {
  k: number;
  centroids: number[][];
  assignments: number[];
};

/**
 * Suggest a cluster count using a light sqrt-based heuristic. k is clamped to
 * [minK, maxK] so tiny activities don't collapse to noise and huge activities
 * stay legible in the UI.
 */
export function suggestClusterCount(
  n: number,
  { minK = 2, maxK = 8 }: { minK?: number; maxK?: number } = {}
): number {
  if (n <= 1) return 1;
  if (n < 4) return 1;
  const raw = Math.round(Math.sqrt(n / 2));
  return Math.min(maxK, Math.max(minK, raw));
}

export function cosineDistance(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

export function runKMeans(vectors: number[][], k: number): KMeansRun {
  if (vectors.length === 0) return { k: 0, centroids: [], assignments: [] };
  if (k <= 1 || vectors.length <= k) {
    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);
    for (const v of vectors) for (let i = 0; i < dim; i++) centroid[i] += v[i];
    for (let i = 0; i < dim; i++) centroid[i] /= vectors.length;
    return {
      k: 1,
      centroids: [centroid],
      assignments: vectors.map(() => 0),
    };
  }

  // Seeded for reproducibility across reclusters on unchanged data.
  const result = kmeans(vectors, k, {
    initialization: "kmeans++",
    seed: 42,
    distanceFunction: cosineDistance,
    maxIterations: 200,
  });

  return {
    k,
    centroids: result.centroids,
    assignments: result.clusters,
  };
}
