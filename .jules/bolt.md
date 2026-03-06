## 2024-05-15 - Removed user_roles query in getMapsWithStats
**Learning:** Avoid fetching data solely for logging or debugging in critical path functions.
**Action:** Audit data fetching functions for queries used only for debugging and remove them.
