## 2026-02-06 - Sequential Permission Checks in Server Components
**Learning:** Permission checks (admin, instructor, editor) in Server Components were implemented as sequential waterfalls, increasing TTFB.
**Action:** Consolidate role checks (e.g., fetch all `user_roles` in one query) and execute independent permission queries concurrently using `Promise.all`.
