
## 2025-02-28 - Optimize node lookups in MapViewer
**Learning:** O(N) Array methods (`find`, `filter`, `some`) used repeatedly inside loops or frequent helper functions like `isNodeUnlocked` can cause serious performance issues for React components rendering large map graphs.
**Action:** Lift array filtering and lookup operations out of component rendering helpers and convert them into O(1) lookups using `useMemo` hooks mapping by `id`. For example, `nodeLookupMap` and `prerequisitesMap` significantly drop computational load from `O(N^2)` complexity checks on node dependencies.
