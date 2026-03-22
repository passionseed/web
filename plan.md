1. **Optimize O(N^2) array operations in `MapViewer.tsx`**
   - In `components/map/MapViewer.tsx`, the functions `isNodeUnlocked` and `getSubmissionRequirement` are repeatedly calling `map.map_nodes.find((n) => n.id === nodeId)`.
   - `isNodeUnlocked` also repeatedly calls `map.map_nodes.filter(...)` to find prerequisites, which is called for each node during render since it's used inside `nodeTypes.default`.
   - This creates an O(N^2) (or worse) performance bottleneck when rendering maps with many nodes, as these helper functions are called inside the render loop for every node via `nodeTypes` and when calculating `getProgressStats`.
   - I will use `useMemo` to create pre-calculated `Map` objects (O(1) lookup) for:
     1. `nodesById`: Maps `nodeId` to `nodeData` (replaces `.find()`).
     2. `prerequisitesByNodeId`: Maps `nodeId` to its array of prerequisite nodes (replaces `.filter(...)` for prerequisites).

2. **Refactor `MapViewer.tsx`**
   - Implement the `useMemo` hooks inside the `MapViewer` component.
   - Update `isNodeUnlocked` and `getSubmissionRequirement` to use these pre-calculated maps.

3. **Verify and Submit**
   - Run tests and linting to ensure no regressions.
   - Complete pre-commit instructions.
   - Create a PR with the performance improvements.
