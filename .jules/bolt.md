
## 2024-05-20 - Set.has vs Array.includes in filter operations
**Learning:** Using `Array.prototype.includes` inside a `filter` loop on large arrays (like comparing classroom students against submission authors) creates an $O(N \times M)$ performance bottleneck. This scales poorly in API routes handling large classroom rosters.
**Action:** When performing membership tests inside iterations (like `filter`, `map`, `reduce`), always convert the lookup array to a `Set` first. This reduces the complexity to $O(N + M)$ via $O(1)$ lookups, significantly improving speed and scalability for list comparisons.
