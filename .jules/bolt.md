## 2024-05-22 - React Flow Node Types Performance
**Learning:** Defining `nodeTypes` inside a component, even with `useMemo`, can cause unnecessary re-renders or node re-mounting if dependencies change (e.g. `progressMap`). React Flow recommends defining them outside the component to ensure referential stability.
**Action:** Always define `nodeTypes` outside the component. Pass dynamic data via the `data` prop to nodes, and use `React.memo` on node components to handle prop updates efficiently.
