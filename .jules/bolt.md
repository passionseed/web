
## 2024-05-18 - O(N^2) Anti-Pattern in React Render Helpers
**Learning:** Found an O(N^2) rendering anti-pattern in MapViewer where React component render helpers (like `isNodeUnlocked` and `getSubmissionRequirement`) used `.find()` and `.filter().some()` on the large `map.map_nodes` array. When these are called for every node/edge inside a component re-rendering frequently, the O(N) lookup becomes an O(N^2) bottleneck.
**Action:** When a React render helper function repeatedly searches a parent dataset using O(N) methods, extract that dataset into a O(1) `Map` utilizing `useMemo`. This flattens the complexity and avoids blocking the main thread during render.
