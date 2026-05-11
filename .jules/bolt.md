## 2024-05-24 - [Replaced Array.includes with Set in loops for O(N) -> O(1) checks]
**Learning:** Found multiple instances where `.filter(x => !array.includes(x))` was being used, which is O(N^2).
**Action:** Replace `array.includes` with `Set.has` when filtering large arrays to improve performance.

## 2025-02-28 - [Replaced Array .find() and .some() inside loops with O(1) Maps and Sets]
**Learning:** Found multiple instances where `.filter(x => !array.some(y => y.id === x.id))` or `.forEach(x => { const item = array.find(y => y.id === x.id) })` was being used in diffing logic for batch updates, which is O(N^2). This applies to single object comparisons and composite string comparisons like `${source_id}-${destination_id}` for paths.
**Action:** Replace `array.some` and `array.find` inside iterative array methods with pre-computed O(1) `Set.has()` or `Map.get()` to improve CPU-bound diffing logic performance from O(N^2) to O(N).
