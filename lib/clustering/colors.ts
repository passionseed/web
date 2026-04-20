/**
 * Fixed palette for cluster coloring. Picks colors in order and wraps around
 * if k exceeds palette length (unlikely with default maxK=8).
 */
export const CLUSTER_PALETTE = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange
  "#22c55e", // lime
];

export function clusterColor(index: number): string {
  return CLUSTER_PALETTE[index % CLUSTER_PALETTE.length];
}
