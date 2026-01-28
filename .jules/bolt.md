## 2025-05-20 - React Flow Performance
**Learning:** React Flow's `nodeTypes` prop must be stable (memoized with empty deps or defined outside component) to prevent nodes from unmounting/remounting on every render.
**Action:** Always define `nodeTypes` outside the component or use `useMemo` with empty dependencies. Pass dynamic data via the `data` prop, not via closure in the node component definition.
