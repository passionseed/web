
## 2026-03-04 - Unnecessary Debug Queries in Database Reads
**Learning:** Found that `getMapsWithStats` was executing a concurrent query to fetch `user_roles` strictly for a `console.log` statement, which slowed down the endpoint unnecessarily and wasted database resources.
**Action:** Audit data fetching functions for queries used solely for logging or debugging and remove them to eliminate unnecessary network requests and db load.
