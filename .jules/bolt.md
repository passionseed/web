## 2024-05-24 - Redundant Client-Side Auth Fetch
**Learning:** `RootLayout` often needs to verify auth (via `getUser`) anyway. Passing this state to client components (like `Layout`) avoids a "double fetch" pattern where the client re-fetches the user immediately on mount. This eliminates layout shifts in the navbar and saves one network request per page load.
**Action:** Always check if server-side data is available in `RootLayout` before fetching again in client-side wrapper components.
