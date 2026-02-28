## 2025-02-18 - Custom Regex Sanitization Risks
**Vulnerability:** The codebase used a custom regex-based implementation (`lib/security/sanitize-html.ts`) for HTML sanitization, which is fragile and prone to XSS bypasses (e.g. unquoted attributes).
**Learning:** Developers often underestimate the complexity of HTML parsing. Relying on custom regex creates a false sense of security.
**Prevention:** Always use established, battle-tested libraries like `isomorphic-dompurify` for HTML sanitization. Ensure `jsdom` is added as a production dependency for `isomorphic-dompurify` to work correctly in SSR environments.

## 2025-02-18 - URL Validation and Link XSS Risks
**Vulnerability:** The codebase used a weak `.includes()` check (`contentUrl.includes("canva.com/design/")`) to validate URLs for embedding and rendering `<a>` tags. This allowed malicious payloads like `javascript:alert(1)//canva.com/design/` to bypass the check, leading to XSS when the URL was used in an `href` or `iframe` `src`.
**Learning:** Simple string matching is insufficient for URL validation, as attackers can easily craft URLs that include the required substring while executing malicious code (e.g., via the `javascript:` protocol).
**Prevention:** Always use the `URL` API (`new URL()`) to parse and strictly validate the protocol (e.g., `https:`), hostname, and pathname of user-supplied URLs before using them in contexts like `href` attributes, `iframe` sources, or API requests. Implement helper functions to ensure protocols are strictly `http:` or `https:`.
