## 2024-05-18 - Unnecessary database query in getMapsWithStats
**Learning:** Found a database query fetching `user_roles` inside `getMapsWithStats` in `lib/supabase/maps.ts` purely for logging/debugging purposes ("Get user's roles for debugging"). This adds unnecessary network latency and database load for every call to fetch maps.
**Action:** Remove the debug query and its associated logging to eliminate the unnecessary network request.
