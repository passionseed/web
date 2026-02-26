## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-02-18 - Middleware Naming Convention
**Vulnerability:** The project's middleware file was named `proxy.ts` instead of `middleware.ts`, causing Next.js to ignore it completely. This disabled all authentication checks and session refreshing logic intended to run on every request.
**Learning:** Next.js convention over configuration is strict. If a file is not named correctly, it is silently ignored, leading to catastrophic security failures.
**Prevention:** Verify middleware active status with a startup script or integration test. Do not rely on file presence alone.
