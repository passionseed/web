## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-02-18 - Prism.highlight XSS Vulnerability
**Vulnerability:** The `Prism.highlight` function was being used to generate HTML strings, which were directly injected into the DOM via `dangerouslySetInnerHTML` in `components/map/OrderCodeActivity.tsx`. While Prism escapes standard tokens, it is not inherently an HTML sanitizer, and malformed input or crafted grammar exploits can lead to XSS.
**Learning:** Never trust output from parsing or formatting libraries, even those meant for rendering code, if they generate raw HTML and are injected into the DOM.
**Prevention:** Always wrap outputs destined for `dangerouslySetInnerHTML` in a dedicated sanitization function like `sanitizeHtml`. Ensure the sanitizer's `ALLOWED_TAGS` explicitly permits necessary formatting tags like `span` and that `ALLOWED_ATTR` explicitly allows the `class` attribute on `span` to preserve syntax highlighting.
