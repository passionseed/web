## 2024-05-23 - Dead Code in Data Fetching
**Learning:** Auditing parallel data fetching (using `Promise.all`) revealed queries used solely for logging/debugging (e.g., fetching `user_roles`). Removing these "dead" queries reduces network round-trips without affecting functionality.
**Action:** Review all `Promise.all` chains in Supabase fetchers to ensure every query result is actively used in the application logic or returned data.

## 2024-05-23 - Constant Extraction
**Learning:** Hardcoded arrays inside functional components (e.g., `DashboardHome`) are recreated on every render, causing unnecessary memory allocation.
**Action:** Extract static configuration data and lists to external constant files (e.g., `lib/constants/`) or define them outside the component scope.
