## 2024-05-21 - React Flow Re-rendering
**Learning:** React Flow unmounts and remounts all nodes if the `nodeTypes` object reference changes. Defining `nodeTypes` inside a component with dependencies (like `useMemo(() => ..., [progressMap])`) causes full map re-render on every state update, killing performance.
**Action:** Define `nodeTypes` statically outside the component or with `[]` dependencies. Pass all dynamic state via the `data` prop to the node components, and have them handle the logic.
