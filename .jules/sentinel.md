## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2024-03-05 - Prism.js XSS Defense-in-Depth
**Vulnerability:** The output of `Prism.highlight` was being directly injected into the DOM via `dangerouslySetInnerHTML`. While Prism escapes `<` and `>` natively during basic tokenization, its output is generally untrusted and can be vulnerable to XSS if specific language definitions or plugins handle content unsafely.
**Learning:** Third-party highlighters and formatters must always be treated as untrusted data sources. In React, any string destined for `dangerouslySetInnerHTML` should pass through a dedicated sanitizer like DOMPurify or `sanitize-html`.
**Prevention:** Always wrap `Prism.highlight` (and similar libraries' output) in `sanitizeHtml` before rendering it with `dangerouslySetInnerHTML`. The sanitizer should be configured to allow `span` tags and `class` attributes to support the highlighting styles.
