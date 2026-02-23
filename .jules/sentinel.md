## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2026-02-23 - Inactive Middleware due to File Naming
**Vulnerability:** The critical Supabase authentication middleware was completely inactive because the file was named `proxy.ts` instead of `middleware.ts`. Next.js requires the exact filename `middleware.ts` (or `.js`) in the root or `src` directory.
**Learning:** Build tools and frameworks rely on convention over configuration. Deviating from these conventions (even if the code is correct) can silently disable critical security features without build errors.
**Prevention:** Always verify that configuration files (especially middleware) are active by testing their side effects (e.g., logs, headers, or redirects) early in development. Added `scripts/verify-middleware-config.ts` to enforce this check.
