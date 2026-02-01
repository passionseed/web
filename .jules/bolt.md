# Bolt's Journal

This journal records critical performance learnings, bottlenecks, and anti-patterns found in the codebase.

## 2024-05-22 - Authentication Waterfall in Layout
**Learning:** `app/layout.tsx` was fetching `session` (unused) while `components/layout.tsx` was fetching `user` in a `useEffect`. This caused a double fetch and a layout shift/flash of unauthenticated content.
**Action:** Lifted `getUser()` to `app/layout.tsx` (Server Component) and passed `user` as a prop to `components/layout.tsx`. Eliminated client-side fetch and `useState/useEffect` overhead.
