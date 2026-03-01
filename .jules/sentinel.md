## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-03-01 - Prism.js XSS via dangerouslySetInnerHTML
**Vulnerability:** Code snippets highlighted by Prism.js were passed directly to `dangerouslySetInnerHTML` in `OrderCodeActivity.tsx` without going through the application's HTML sanitizer (`sanitizeHtml`). While Prism handles syntax escaping, relying on it entirely is a risk, especially with user-controlled input, potentially allowing XSS payloads.
**Learning:** Even output from third-party formatting/highlighting libraries should be treated as untrusted and passed through a proper HTML sanitizer (like `sanitize-html` or `dompurify`) before rendering.
**Prevention:** Always wrap `dangerouslySetInnerHTML` inputs with `sanitizeHtml`. To ensure syntax highlighting styling isn't stripped, configure the sanitizer to allow `span` tags and `class` attributes, which are used by Prism.
