## 2024-05-22 - Debounce Expensive Visualizations
**Learning:** Re-rendering complex visualizations (like force-directed graphs) on every keystroke of a search input kills performance and UX. The input should remain responsive, but the heavy computation/rendering should be debounced.
**Action:** Use a `useDebounce` hook to decouple the input state from the visualization state. Bind the input to the raw state, and the visualization (and expensive filters) to the debounced state.
