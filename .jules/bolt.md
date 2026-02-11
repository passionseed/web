## 2026-02-11 - Lodash Bundle Size Anti-Pattern
**Learning:** Importing named exports from `lodash` (e.g., `import { debounce } from "lodash"`) bundles the entire library because `lodash` is CommonJS and does not tree-shake effectively.
**Action:** Use direct path imports (e.g., `import debounce from "lodash/debounce"`) to include only the necessary code.
