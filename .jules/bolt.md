## 2024-05-22 - React Flow Node Types Optimization
**Learning:** Defining `nodeTypes` inside a component (even with `useMemo`) causes React Flow to re-mount all nodes whenever the dependencies change, leading to severe performance degradation.
**Action:** Always define `nodeTypes` outside the component. Pass dynamic data (like unlocked status, progress) via the `data` prop and update it in `useEffect` or `useNodesState`.
