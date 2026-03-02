## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.
## 2025-03-02 - Prevent IDOR in Server Actions
**Vulnerability:** Next.js Server Actions (`app/actions/save-direction.ts`) used for fetching data (`getDirectionFinderResults`, `getDirectionFinderResultById`) lacked authentication and authorization checks, allowing any user (or unauthenticated visitor) to query records belonging to other users by omitting the `user_id` filter.
**Learning:** Even functions marked as `// DEV ONLY` in Server Actions are publicly accessible endpoints. Always enforce authentication using `supabase.auth.getUser()` and scope database queries to the authenticated user using `.eq('user_id', user.id)` to prevent Insecure Direct Object Reference (IDOR).
**Prevention:** Treat every exported function in a Server Action file as a public API endpoint. Validate the session and apply ownership checks on all read and write operations.
