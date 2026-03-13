## 2024-03-13 - O(N^2) Performance Bottleneck in Component Rendering
**Learning:** Found a specific anti-pattern in MapViewer where O(N) array methods (`find()`, `filter()`) were used inside frequently called render helper functions (`isNodeUnlocked`, `getSubmissionRequirement`, `isNodeCompleted`), causing O(N^2) render bottlenecks for complex structures like map graphs.
**Action:** Replaced iterative lookups with a pre-calculated `useMemo` O(1) Map lookup (`nodeMap.get()`) to ensure consistent, scalable rendering performance on large datasets.
