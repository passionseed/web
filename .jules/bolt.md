## 2024-05-23 - Auth Waterfall in Root Layout
**Learning:** Fetching user session in `useEffect` in a client-side layout component causes a layout shift (FOUC) and an unnecessary network request.
**Action:** Fetch `user` in `RootLayout` (Server Component) using `supabase.auth.getUser()` and pass it as an initial prop to the client-side `Layout` component to hydrate state immediately.
