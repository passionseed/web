
## 2024-03-24 - Avoid O(N) array methods inside nested list iterations
**Learning:** In complex table views like `StudentProgressTable` and `StudentProgressView`, computing derived data (like overall progress) inside component map callbacks or using `Array.find` within mapped items leads to O(M*K) rendering bottlenecks, particularly when dealing with many students and assignments.
**Action:** Use `useMemo` to pre-calculate these relationships and derived values into a `Map` structure upfront. This allows O(1) lookups during the actual render phase, significantly reducing the computational cost per row.
