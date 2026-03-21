## 2024-05-24 - [Replaced Array.includes with Set in loops for O(N) -> O(1) checks]
**Learning:** Found multiple instances where `.filter(x => !array.includes(x))` was being used, which is O(N^2).
**Action:** Replace `array.includes` with `Set.has` when filtering large arrays to improve performance.
